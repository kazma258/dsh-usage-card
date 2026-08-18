/**
 * dsh-usage-card — host half.
 *
 * Registers one exact HTTP route on the dsh web server:
 *
 *   GET /usage-card/overview
 *
 * which answers the sidebar usage card with:
 *
 *   1. balance — DeepSeek public `/user/balance` endpoint (via the credentials
 *      seam, the same DEEPSEEK_API_KEY the llm adapter uses).
 *   2. usage   — 7d / 30d token usage and spend from two sources:
 *        a. official (preferred): the DeepSeek Platform dashboard endpoints
 *           `/api/v0/usage/amount` and `/api/v0/usage/cost` (per-day rows),
 *           authenticated with the optional DEEPSEEK_PLATFORM_TOKEN session
 *           token; summed over the 7/30-day windows (month-boundary aware).
 *        b. estimate (fallback): aggregate the local session projection cache
 *           (`tokenUsage` totals per session) and price the tokens with the
 *           configurable estimatePrices table.
 *
 * The browser only ever talks to this local route; the API key and the
 * platform token never leave the host.
 */
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import z from "@deepseek-ai/schemastery";
import { estimateFromSessions, officialUsage, PlatformTokenError } from "./aggregate.js";

const name = "usage-card";
const inject = ["credentials", "webServer"];

// ---- configuration ------------------------------------------------------

const Config = z.object({
  /** Exact route path served by this plugin. */
  path: z.string().default("/usage-card/overview"),
  /** POST route accepting the Platform session token (save/clear). */
  tokenPath: z.string().default("/usage-card/token"),
  /** Credential reference holding the DeepSeek API key. */
  balanceCredential: z.string().default("DEEPSEEK_API_KEY"),
  balanceUrl: z.string().default("https://api.deepseek.com/user/balance"),
  /** Balance fetch cache TTL in ms (0 disables caching). */
  balanceTtlMs: z.natural().min(0).default(60000),
  /** Optional credential holding the Platform session token (userToken). */
  platformTokenCredential: z.string().default("DEEPSEEK_PLATFORM_TOKEN"),
  /** Platform dashboard API base. */
  platformBaseUrl: z.string().default("https://platform.deepseek.com/api/v0"),
  /** Platform usage fetch cache TTL in ms (0 disables caching). */
  usageTtlMs: z.natural().min(0).default(120000),
  /** Outbound fetch timeout in ms. */
  timeoutMs: z.natural().min(0).default(15000),
  /** Currency label reported for estimate-path spend. */
  estimateCurrency: z.string().default("USD"),
  /** Currency label reported for official-path spend (match your Platform account currency). */
  officialCurrency: z.string().default("USD"),
  /** Invalidate the usage cache when a turn completes (conversation-triggered freshness). */
  invalidateOnTurnEnd: z.boolean().default(true),
  /** Estimate price table, per 1M tokens. */
  estimatePrices: z
    .object({
      inputUncached: z.number().min(0).default(0.28),
      cacheRead: z.number().min(0).default(0.07),
      cacheWrite: z.number().min(0).default(0.28),
      output: z.number().min(0).default(1.1)
    })
    .default({})
});

/** Manual defaulting (loader may already apply the schema defaults; belt and braces). */
function applyDefaults(config) {
  const prices = config.estimatePrices ?? {};
  return {
    path: config.path ?? "/usage-card/overview",
    tokenPath: config.tokenPath ?? "/usage-card/token",
    balanceCredential: config.balanceCredential ?? "DEEPSEEK_API_KEY",
    balanceUrl: config.balanceUrl ?? "https://api.deepseek.com/user/balance",
    balanceTtlMs: config.balanceTtlMs ?? 60000,
    platformTokenCredential: config.platformTokenCredential ?? "DEEPSEEK_PLATFORM_TOKEN",
    platformBaseUrl: config.platformBaseUrl ?? "https://platform.deepseek.com/api/v0",
    usageTtlMs: config.usageTtlMs ?? 120000,
    timeoutMs: config.timeoutMs ?? 15000,
    estimateCurrency: config.estimateCurrency ?? "USD",
    officialCurrency: config.officialCurrency ?? "USD",
    invalidateOnTurnEnd: config.invalidateOnTurnEnd !== false,
    estimatePrices: {
      inputUncached: prices.inputUncached ?? 0.28,
      cacheRead: prices.cacheRead ?? 0.07,
      cacheWrite: prices.cacheWrite ?? 0.28,
      output: prices.output ?? 1.1
    }
  };
}

// ---- balance ------------------------------------------------------------

function createCache() {
  return { at: 0, value: void 0 };
}

function clearCache(cache) {
  cache.at = 0;
  cache.value = void 0;
}

async function fetchBalance(ctx, config, cache) {
  const now = Date.now();
  if (config.balanceTtlMs > 0 && now - cache.at < config.balanceTtlMs && cache.value !== void 0) {
    return cache.value;
  }
  const fail = (error, message) => {
    cache.at = now;
    cache.value = { ok: false, error, message };
    return cache.value;
  };
  try {
    const hit = await ctx.credentials.resolve(credentialRef(config.balanceCredential));
    if (hit === void 0) {
      return fail("no-api-key", `未配置 ${config.balanceCredential}：请在 设置 → 模型 中填写 DeepSeek API Key。`);
    }
    const response = await fetch(config.balanceUrl, {
      headers: { Authorization: `Bearer ${hit.value}`, Accept: "application/json" },
      signal: AbortSignal.timeout(config.timeoutMs)
    });
    const text = await response.text();
    if (!response.ok) return fail("provider", `DeepSeek 余额接口返回 HTTP ${response.status}`);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return fail("provider", "DeepSeek 余额接口返回了无法解析的内容");
    }
    const info = Array.isArray(body.balance_infos) ? body.balance_infos[0] : void 0;
    const toNumber = (value) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };
    const value = {
      ok: true,
      isAvailable: body.is_available === true,
      currency: info?.currency ?? null,
      total: toNumber(info?.total_balance),
      granted: toNumber(info?.granted_balance),
      toppedUp: toNumber(info?.topped_up_balance)
    };
    cache.at = now;
    cache.value = value;
    return value;
  } catch (error) {
    return fail("provider", error instanceof Error ? error.message : String(error));
  }
}

// ---- local estimate (fallback) ------------------------------------------

/** Enumerate every session's createdAt + tokenUsage totals (attached + cold). */
async function collectSessionUsage(ctx) {
  const records = [];
  const projections = ctx.get("sessionProjections");
  const sessions = ctx.get("sessions");
  const cache = ctx.get("sessionProjectionCache");
  const persistence = ctx.get("sessionPersistence");
  if (sessions === void 0) return records;
  const attachedIds = new Set();
  for (const session of sessions.list()) {
    attachedIds.add(session.id);
    try {
      const block = projections?.snapshot(session);
      const usage = block?.values?.tokenUsage;
      const createdAt = session.header?.createdAt;
      if (usage !== void 0 && typeof createdAt === "number") records.push({ createdAt, usage });
    } catch (error) {
      ctx.logger.warn(`usage-card: projection read failed for "${session.id}": ${String(error)}`);
    }
  }
  if (persistence !== void 0 && cache !== void 0 && typeof cache.cachedSnapshot === "function") {
    let cold;
    try {
      cold = (await persistence.list()).filter((meta) => !attachedIds.has(meta.id) && meta.cwd !== void 0);
    } catch (error) {
      ctx.logger.warn(`usage-card: cold session listing failed: ${String(error)}`);
      cold = [];
    }
    for (const meta of cold) {
      try {
        const block = cache.cachedSnapshot(meta);
        const usage = block?.values?.tokenUsage;
        if (usage !== void 0 && typeof meta.createdAt === "number") records.push({ createdAt: meta.createdAt, usage });
      } catch (error) {
        ctx.logger.warn(`usage-card: cold projection read failed for "${meta.id}": ${String(error)}`);
      }
    }
  }
  return records;
}

// ---- route --------------------------------------------------------------

/** Collect the request body as UTF-8 text (bounded to 64 KiB). */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 65536) {
        reject(new Error("request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function resolveUsage(ctx, cfg, cache) {
  const now = Date.now();
  if (cfg.usageTtlMs > 0 && now - cache.at < cfg.usageTtlMs && cache.value !== void 0) {
    return cache.value;
  }
  const store = (usage) => {
    cache.at = now;
    cache.value = usage;
    return usage;
  };
  const platformHit = await ctx.credentials.resolve(credentialRef(cfg.platformTokenCredential));
  if (platformHit !== void 0) {
    try {
      const official = await officialUsage(platformHit.value, cfg.platformBaseUrl, now, cfg.timeoutMs);
      return store({
        source: "official",
        currency: cfg.officialCurrency,
        days7: official.days7,
        days30: official.days30
      });
    } catch (error) {
      ctx.logger.warn("usage-card: platform usage fetch failed; falling back to local estimate");
      ctx.logger.warn(error);
    }
  }
  try {
    const records = await collectSessionUsage(ctx);
    const estimate = estimateFromSessions(records, now, cfg.estimatePrices);
    const round = (n) => Math.round(n * 1e6) / 1e6;
    return store({
      source: records.length === 0 ? "unavailable" : "estimate",
      currency: cfg.estimateCurrency,
      sessions: estimate.sessions,
      days7: { ...estimate.days7, cost: round(estimate.days7.cost) },
      days30: { ...estimate.days30, cost: round(estimate.days30.cost) }
    });
  } catch (error) {
    ctx.logger.warn("usage-card: local usage aggregation failed");
    ctx.logger.warn(error);
    return store({ source: "unavailable", currency: cfg.estimateCurrency, days7: null, days30: null });
  }
}

function apply(ctx, config = {}) {
  const cfg = applyDefaults(config);
  const tokenRef = credentialRef(cfg.platformTokenCredential);
  const balanceCache = createCache();
  const usageCache = createCache();
  const invalidateUsage = () => clearCache(usageCache);
  ctx.effect(() => () => {
    clearCache(balanceCache);
    clearCache(usageCache);
  }, "usage-card: caches");
  if (cfg.invalidateOnTurnEnd) {
    ctx.on("session/event", (session, event) => {
      // A completed turn is the projection-cache checkpoint moment: drop the
      // usage cache so the next poll reflects the finished response.
      if (event.type === "turn/end") invalidateUsage();
    });
  }
  // External credential edits (e.g. the Settings page) switch the data source
  // on the next request too.
  ctx.on("credentials/updated", (ref) => {
    if (ref === tokenRef) invalidateUsage();
  });
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: cfg.path,
        handler: async (req, res) => {
          if (req.method !== "GET" && req.method !== "HEAD") {
            sendJson(res, 405, { ok: false, error: "method", message: "method not allowed" });
            return;
          }
          try {
            const [balance, usage] = await Promise.all([fetchBalance(ctx, cfg, balanceCache), resolveUsage(ctx, cfg, usageCache)]);
            sendJson(res, 200, {
              ok: true,
              balance,
              usage,
              updatedAt: Date.now()
            });
          } catch (error) {
            ctx.logger.warn("usage-card: overview failed");
            ctx.logger.warn(error);
            sendJson(res, 500, { ok: false, error: "internal", message: "internal error" });
          }
        }
      }),
    "usage-card: overview route"
  );
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: cfg.tokenPath,
        handler: async (req, res) => {
          if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "method", message: "method not allowed" });
            return;
          }
          let body;
          try {
            body = JSON.parse(await readBody(req));
          } catch {
            sendJson(res, 400, { ok: false, error: "bad-json", message: "request body must be JSON" });
            return;
          }
          try {
            const clearing = body.clear === true;
            const token = typeof body.token === "string" ? body.token.trim() : "";
            if (!clearing && token.length === 0) {
              sendJson(res, 400, { ok: false, error: "empty-token", message: "Token 不能為空" });
              return;
            }
            if (!clearing && token.length > 512) {
              sendJson(res, 400, { ok: false, error: "token-too-long", message: "Token 過長" });
              return;
            }
            if (clearing) {
              await ctx.credentials.unset(tokenRef);
              invalidateUsage();
              sendJson(res, 200, { ok: true, cleared: true });
              return;
            }
            // Validate against the Platform before persisting, so a pasted
            // token that is expired/wrong never lands in the credential store.
            try {
              await officialUsage(token, cfg.platformBaseUrl, Date.now(), Math.min(cfg.timeoutMs, 10000));
            } catch (error) {
              if (error instanceof PlatformTokenError) {
                sendJson(res, 400, { ok: false, error: "invalid-token", message: "Token 無效或已過期：請重新登入 platform.deepseek.com 取得 userToken" });
                return;
              }
              ctx.logger.warn("usage-card: token validation network failure; saving anyway");
              ctx.logger.warn(error);
            }
            await ctx.credentials.set(tokenRef, token);
            invalidateUsage();
            sendJson(res, 200, { ok: true });
          } catch (error) {
            ctx.logger.warn("usage-card: token write failed");
            ctx.logger.warn(error);
            sendJson(res, 500, { ok: false, error: "write-failed", message: error instanceof Error ? error.message : String(error) });
          }
        }
      }),
    "usage-card: token route"
  );
}

export { Config, apply, inject, name };

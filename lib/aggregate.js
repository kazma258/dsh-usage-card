/**
 * dsh-usage-card — dependency-free aggregation core.
 *
 * Pure helpers (windows, pricing, platform-day math) plus the Platform
 * dashboard fetch, which uses only browser/Node globals so the file imports
 * nothing and unit tests can load it directly.
 */
export const DAY_MS = 864e5;

/** Local calendar date `YYYY-MM-DD` for a timestamp (dashboard rows are keyed by date). */
export function localDateOf(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Distinct (year, month) pairs covering [fromTs, toTs] — at most two months. */
export function monthsCovering(fromTs, toTs) {
  const set = new Map();
  for (let t = fromTs; t <= toTs; t += DAY_MS) {
    const d = new Date(t);
    set.set(`${d.getFullYear()}-${d.getMonth()}`, { year: d.getFullYear(), month: d.getMonth() + 1 });
    if (t + DAY_MS > toTs) break;
  }
  return [...set.values()];
}

/** Sum per-day platform rows inside [floorDate, today] (inclusive). */
export function sumPlatformDays(days, floorDate, today) {
  const total = { cacheHitTokens: 0, cacheMissTokens: 0, responseTokens: 0, cost: 0 };
  for (const day of days) {
    if (day.date < floorDate || day.date > today) continue;
    total.cacheHitTokens += day.cacheHitTokens ?? 0;
    total.cacheMissTokens += day.cacheMissTokens ?? 0;
    total.responseTokens += day.responseTokens ?? 0;
    total.cost += day.cost ?? 0;
  }
  return total;
}

/** Price one usage bucket set with the estimate price table (per 1M tokens). */
export function costOf(usage, prices) {
  const input = usage.uncachedInputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return (
    (input * prices.inputUncached +
      cacheRead * prices.cacheRead +
      cacheWrite * prices.cacheWrite +
      output * prices.output) /
    1e6
  );
}

/** One aggregated window bucket. */
export function emptyWindow() {
  return { tokens: 0, inputTokens: 0, cacheTokens: 0, outputTokens: 0, cost: 0 };
}

/** Add one session's tokenUsage to a window bucket. */
export function addUsageToWindow(window, usage) {
  const input = usage.uncachedInputTokens ?? 0;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheWrite = usage.cacheWriteTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  window.inputTokens += input;
  window.cacheTokens += cacheRead + cacheWrite;
  window.outputTokens += output;
  window.tokens += input + cacheRead + cacheWrite + output;
}

/**
 * Aggregate per-session usage records into 7d/30d windows by createdAt.
 * @param records - [{ createdAt: number, usage: tokenUsage totals }].
 * @param now - reference timestamp (ms).
 * @param prices - estimate price table.
 * @returns { days7, days30, sessions }
 */
export function estimateFromSessions(records, now, prices) {
  const days7 = emptyWindow();
  const days30 = emptyWindow();
  let sessions = 0;
  for (const record of records) {
    if (typeof record.createdAt !== "number" || record.usage === void 0) continue;
    if (record.createdAt > now - 30 * DAY_MS) {
      addUsageToWindow(days30, record.usage);
      days30.cost += costOf(record.usage, prices);
      sessions += 1;
      if (record.createdAt > now - 7 * DAY_MS) {
        addUsageToWindow(days7, record.usage);
        days7.cost += costOf(record.usage, prices);
      }
    }
  }
  return { days7, days30, sessions };
}

/** Platform session-token failure (40002/40003 or HTTP 401). */
export class PlatformTokenError extends Error {
  code = "platform-token";
}

const PLATFORM_HEADERS = {
  Accept: "application/json",
  "x-app-version": "1.0.0",
  Origin: "https://platform.deepseek.com",
  Referer: "https://platform.deepseek.com/usage"
};

/**
 * Fetch one month of per-day usage from the Platform dashboard endpoints.
 * @returns days: [{ date: "YYYY-MM-DD", cacheHitTokens, cacheMissTokens, responseTokens, cost }]
 * @throws {PlatformTokenError} when the session token is rejected.
 */
export async function fetchPlatformMonth(token, baseUrl, year, month, timeoutMs) {
  const query = `?month=${month}&year=${year}`;
  const headers = { ...PLATFORM_HEADERS, Authorization: `Bearer ${token}` };
  const [amountRes, costRes] = await Promise.all([
    fetch(`${baseUrl}/usage/amount${query}`, { headers, signal: AbortSignal.timeout(timeoutMs) }),
    fetch(`${baseUrl}/usage/cost${query}`, { headers, signal: AbortSignal.timeout(timeoutMs) })
  ]);
  if (amountRes.status === 401 || costRes.status === 401) {
    throw new PlatformTokenError("DEEPSEEK_PLATFORM_TOKEN 已过期：请重新登录 platform.deepseek.com 并更新 userToken");
  }
  if (!amountRes.ok || !costRes.ok) {
    throw new Error(`DeepSeek 平台用量接口返回 HTTP ${amountRes.status}/${costRes.status}`);
  }
  let amountBody;
  let costBody;
  try {
    amountBody = await amountRes.json();
    costBody = await costRes.json();
  } catch (error) {
    throw new Error(`DeepSeek 平台用量接口返回了无法解析的内容: ${error.message}`);
  }
  const bizDataOf = (body) => {
    const raw = body?.data?.biz_data;
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const amountBiz = bizDataOf(amountBody);
  const costBiz = bizDataOf(costBody);
  if (amountBody?.code !== 0 || amountBiz === void 0) {
    const code = amountBody?.code ?? amountBody?.data?.biz_code;
    if (code === 40002 || code === 40003) throw new PlatformTokenError("DEEPSEEK_PLATFORM_TOKEN 已过期：请重新登录 platform.deepseek.com 并更新 userToken");
    throw new Error(`DeepSeek 平台用量接口错误 (code ${code ?? "unknown"})`);
  }
  const costByDate = new Map();
  for (const day of costBiz?.days ?? []) {
    let cost = 0;
    for (const modelEntry of day.data ?? []) {
      for (const entry of modelEntry.usage ?? []) cost += Number(entry.amount) || 0;
    }
    costByDate.set(day.date, cost);
  }
  const days = [];
  for (const day of amountBiz.days ?? []) {
    let hit = 0;
    let miss = 0;
    let response = 0;
    for (const modelEntry of day.data ?? []) {
      for (const entry of modelEntry.usage ?? []) {
        const value = Math.round(Number(entry.amount) || 0);
        if (entry.type === "PROMPT_CACHE_HIT_TOKEN") hit += value;
        else if (entry.type === "PROMPT_CACHE_MISS_TOKEN") miss += value;
        else if (entry.type === "RESPONSE_TOKEN") response += value;
      }
    }
    days.push({ date: day.date, cacheHitTokens: hit, cacheMissTokens: miss, responseTokens: response, cost: costByDate.get(day.date) ?? 0 });
  }
  return days;
}

/** Official 7d/30d figures via the platform dashboard (month-boundary aware). */
export async function officialUsage(token, baseUrl, now, timeoutMs) {
  const today = localDateOf(now);
  const floor7 = localDateOf(now - 7 * DAY_MS);
  const floor30 = localDateOf(now - 30 * DAY_MS);
  const months = monthsCovering(now - 30 * DAY_MS, now);
  const allDays = [];
  for (const { year, month } of months) {
    const days = await fetchPlatformMonth(token, baseUrl, year, month, timeoutMs);
    allDays.push(...days);
  }
  const d7 = sumPlatformDays(allDays, floor7, today);
  const d30 = sumPlatformDays(allDays, floor30, today);
  return {
    days7: {
      tokens: d7.cacheHitTokens + d7.cacheMissTokens + d7.responseTokens,
      inputTokens: d7.cacheHitTokens + d7.cacheMissTokens,
      cacheTokens: d7.cacheHitTokens,
      outputTokens: d7.responseTokens,
      cost: d7.cost
    },
    days30: {
      tokens: d30.cacheHitTokens + d30.cacheMissTokens + d30.responseTokens,
      inputTokens: d30.cacheHitTokens + d30.cacheMissTokens,
      cacheTokens: d30.cacheHitTokens,
      outputTokens: d30.responseTokens,
      cost: d30.cost
    }
  };
}

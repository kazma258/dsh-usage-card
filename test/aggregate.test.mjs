import assert from "node:assert/strict";
import {
  DAY_MS,
  localDateOf,
  monthsCovering,
  sumPlatformDays,
  costOf,
  estimateFromSessions,
  officialUsage,
  fetchPlatformMonth,
  PlatformTokenError
} from "../lib/aggregate.js";

// --- localDateOf / monthsCovering ----------------------------------------
const now = new Date("2026-07-15T12:00:00Z").getTime();
assert.equal(localDateOf(now), "2026-07-15");
assert.equal(localDateOf(now - 30 * DAY_MS), "2026-06-15");
const months = monthsCovering(now - 30 * DAY_MS, now);
assert.deepEqual(months, [
  { year: 2026, month: 6 },
  { year: 2026, month: 7 }
]);

// --- sumPlatformDays ------------------------------------------------------
const days = [
  { date: "2026-06-15", cacheHitTokens: 10, cacheMissTokens: 5, responseTokens: 3, cost: 0.01 },
  { date: "2026-06-30", cacheHitTokens: 100, cacheMissTokens: 50, responseTokens: 30, cost: 0.1 },
  { date: "2026-07-08", cacheHitTokens: 200, cacheMissTokens: 100, responseTokens: 60, cost: 0.2 },
  { date: "2026-07-15", cacheHitTokens: 20, cacheMissTokens: 10, responseTokens: 6, cost: 0.02 }
];
const d7 = sumPlatformDays(days, localDateOf(now - 7 * DAY_MS), localDateOf(now));
assert.equal(d7.cacheHitTokens, 220);
assert.equal(d7.cacheMissTokens, 110);
assert.equal(d7.responseTokens, 66);
assert.equal(d7.cost, 0.22);
const d30 = sumPlatformDays(days, localDateOf(now - 30 * DAY_MS), localDateOf(now));
assert.equal(d30.cost, 0.33);

// --- costOf ---------------------------------------------------------------
const prices = { inputUncached: 0.28, cacheRead: 0.07, cacheWrite: 0.28, output: 1.1 };
const usage = { uncachedInputTokens: 1e6, cacheReadTokens: 1e6, cacheWriteTokens: 0, outputTokens: 1e6 };
assert.ok(Math.abs(costOf(usage, prices) - 1.45) < 1e-9);

// --- estimateFromSessions (real projcache fixture) ------------------------
// The two real sessions from ~/.dsh/storages/session_projcache.json:
//  a) createdAt 1786983732787, tokens: uncached 47216 / output 26245 / cacheRead 1607424
//  b) createdAt 1786984171505, tokens: uncached 64072 / output 14425 / cacheRead 1051264
const fixtures = [
  { createdAt: 1786983732787, usage: { uncachedInputTokens: 47216, outputTokens: 26245, cacheReadTokens: 1607424, cacheWriteTokens: 0 } },
  { createdAt: 1786984171505, usage: { uncachedInputTokens: 64072, outputTokens: 14425, cacheReadTokens: 1051264, cacheWriteTokens: 0 } }
];
const ref = Date.now();
const est = estimateFromSessions(fixtures, ref, prices);
assert.equal(est.sessions, 2);
assert.equal(est.days30.tokens, 47216 + 26245 + 1607424 + 64072 + 14425 + 1051264);
assert.equal(est.days7.tokens, est.days30.tokens);
const expectedCost = costOf(fixtures[0].usage, prices) + costOf(fixtures[1].usage, prices);
assert.ok(Math.abs(est.days30.cost - expectedCost) < 1e-9);
const old = [{ createdAt: ref - 31 * DAY_MS, usage: { uncachedInputTokens: 999, outputTokens: 999, cacheReadTokens: 999, cacheWriteTokens: 0 } }];
const estOld = estimateFromSessions(old, ref, prices);
assert.equal(estOld.sessions, 0);
assert.equal(estOld.days30.tokens, 0);

// --- officialUsage via mocked fetch --------------------------------------
const amountBody = {
  code: 0,
  data: {
    biz_code: 0,
    biz_data: [
      {
        days: [
          { date: "2026-07-14", data: [{ model: "deepseek-chat", usage: [
            { type: "PROMPT_CACHE_HIT_TOKEN", amount: "1000" },
            { type: "PROMPT_CACHE_MISS_TOKEN", amount: "500" },
            { type: "RESPONSE_TOKEN", amount: "300" }
          ] }] },
          { date: "2026-07-15", data: [{ model: "deepseek-chat", usage: [
            { type: "PROMPT_CACHE_HIT_TOKEN", amount: "2000" },
            { type: "PROMPT_CACHE_MISS_TOKEN", amount: "1000" },
            { type: "RESPONSE_TOKEN", amount: "600" }
          ] }] }
        ]
      }
    ]
  }
};
const costBody = {
  code: 0,
  data: {
    biz_code: 0,
    biz_data: [
      {
        days: [
          { date: "2026-07-14", data: [{ model: "deepseek-chat", usage: [{ amount: "0.01" }, { amount: "0.02" }] }] },
          { date: "2026-07-15", data: [{ model: "deepseek-chat", usage: [{ amount: "0.03" }] }] }
        ]
      }
    ]
  }
};
const originalFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async (url) => {
  calls += 1;
  const u = String(url);
  return {
    ok: true,
    status: 200,
    json: async () => (u.includes("/usage/amount") ? amountBody : costBody)
  };
};
try {
  const off = await officialUsage("token", "https://platform.deepseek.com/api/v0", new Date("2026-07-15T12:00:00Z").getTime(), 5000);
  assert.equal(calls, 4); // 2 months x (amount+cost)
  // 7d window (2026-07-09..15) contains BOTH July 14 and July 15 rows
  assert.deepEqual(off.days7, {
    tokens: (3000 + 1500 + 900) * 2,
    inputTokens: 4500 * 2,
    cacheTokens: 3000 * 2,
    outputTokens: 900 * 2,
    cost: 0.06 * 2
  });
} finally {
  globalThis.fetch = originalFetch;
}

// 401 -> PlatformTokenError
globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
try {
  await assert.rejects(() => fetchPlatformMonth("bad", "https://platform.deepseek.com/api/v0", 2026, 7, 5000), PlatformTokenError);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("aggregate tests: all passed");

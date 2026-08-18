# dsh-usage-card

DSH（DeepSeek Harness）Web 介面插件：在左側欄「設置」按鈕上方渲染用量卡片，顯示 7d / 30d token 用量與消費、剩餘額度。可切換官方平台數據或本地估算。

**相容**：DeepSeek Harness `0.1.x` 的 **web** profile（Host + Web UI）。需要 `webServer`、`credentials`，以及 client 的 `slots` / `locale` / `sessions`。

## 安裝

套件宣告 `dsh.bundle`，`dsh plugin add` 會自動加入 profile 的 bundle 層。裝完後重啟 `dsh web` 並刷新頁面。

```sh
# Git（建議鎖定 commit：github:kazma258/dsh-usage-card#<40-character-sha>）
dsh plugin --profile web add github:kazma258/dsh-usage-card

# 本機開發目錄
dsh plugin --profile web add ./

# npm（若已發布）
dsh plugin --profile web add dsh-usage-card
```

驗證層是否掛上：

```sh
dsh --profile web --dump-config
```

應出現 `# == dsh-usage-card`。

## 停用與卸載

```sh
# 卸載：同時移除依賴與 bundle 層
dsh plugin --profile web remove dsh-usage-card
```

暫時停用：在 profile 的 `cordis.patch.yml` 覆寫該行並省略它，或從 `dsh.profile.bundles` 拿掉 `dsh-usage-card`（不要改套件本身）。卸載後重啟 `dsh web`。

## 數據源與配置

插件讀取 DSH 既有憑證（`DEEPSEEK_API_KEY`，設置 → 模型，存於 `~/.dsh/.credentials.yaml`）。金鑰與平台 token 只留在 Host，瀏覽器只打本機 `/usage-card/*`。

### 7d / 30d 用量（官方優先）

1. **官方**：`platform.deepseek.com` 用量頁同源日數據。卡片上點「官方 / 估算 / 無數據」badge，貼上平台 `userToken`（不是 API Key）。Token 過期（code 40002/40003）會回退估算。
2. **估算**：無平台 token 時，聚合本地 session `tokenUsage`，按建立時間歸入 7d/30d，再用可配置單價折算。

官方平台沒有 7/30 天窗口參數；本插件把窗口內每日（`YYYY-MM-DD`）加總。

取得 `userToken`：登入 https://platform.deepseek.com → DevTools → Console：

```js
JSON.parse(localStorage.getItem('userToken')).value
```

也可寫入 `~/.dsh/.credentials.yaml` 的 `DEEPSEEK_PLATFORM_TOKEN`。

### 定價（估算路徑，USD / 1M tokens）

在 profile 的 `cordis.patch.yml` 覆寫（整行替換，不是深合併）：

```yaml
- id: usage-card
  name: dsh-usage-card
  config:
    estimatePrices:
      inputUncached: 0.28
      cacheRead: 0.07
      cacheWrite: 0.28
      output: 1.1
    estimateCurrency: USD
    officialCurrency: USD
```

可配置項：`path`、`tokenPath`、`balanceCredential`、`balanceUrl`、`balanceTtlMs`、`platformTokenCredential`、`platformBaseUrl`、`usageTtlMs`、`timeoutMs`、`estimateCurrency`、`officialCurrency`、`invalidateOnTurnEnd`、`estimatePrices`。

## 刷新策略

| 觸發 | 時機 |
|---|---|
| 對話 | 目前 session `updatedAt` 變化，或 `running` true→false 後約 2.5–3s |
| 定時 | 每 60 秒 |
| 焦點 | 切回瀏覽器分頁 |
| 手動 | 卡片右上角刷新 |
| 初始 | 掛載即取一次 |

Host 快取：餘額 60s、用量 120s；`turn/end` 會失效用量快取（`invalidateOnTurnEnd`，預設開）。側欄收合時改顯示 rail 圖示，點擊可開 Token 設定。

## 開發

```sh
node --check lib/index.js lib/client.js lib/aggregate.js
node test/aggregate.test.mjs
```

`lib/` 已提交，Git 安裝不需要 `prepare`。Host 程式改動需重啟 `dsh web`；`lib/client.js` 刷新頁面即可。

## License

MIT

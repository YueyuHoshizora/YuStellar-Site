# 影片監控 Worker（yustellar-video-watcher）

這個 Cloudflare Worker 每 5 分鐘檢查一次 YouTube 播放清單有沒有新影片，
有變化才會去觸發 GitHub Actions 把網站重新部署一次；沒有變化就什麼都不做，
不會浪費 GitHub Actions 的部署次數。

跟原本 `dist/../.github/workflows/pages.yml` 裡「每次部署都重抓一次影片」
是分開、互補的兩件事：這個 Worker 只負責「多久檢查一次、有沒有變化」，
真正抓資料、寫進網站、部署，還是由 GitHub Actions 那邊做。

## 部署步驟

以下指令都在 `cf-worker/` 這個資料夾底下執行。

### 1. 安裝 wrangler、登入 Cloudflare

```bash
cd cf-worker
npm install -g wrangler
wrangler login
```

`wrangler login` 會開啟瀏覽器讓你登入、授權 Cloudflare 帳號。

### 2. 建立 KV namespace（用來記住「上次看到的影片」）

```bash
wrangler kv namespace create VIDEO_STATE
```

執行完會印出一段像這樣的設定：

```
[[kv_namespaces]]
binding = "VIDEO_STATE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

把印出來的 `id` 貼到 `wrangler.toml` 裡 `REPLACE_WITH_KV_NAMESPACE_ID` 的地方。

### 3. 建立一組 GitHub Personal Access Token

到 GitHub 的 **Settings → Developer settings → Personal access tokens → Fine-grained tokens** 建立一組新的：

- **Repository access**：只選 `yustellar-idv-tw` 這個 repo（不要選「All repositories」）
- **Permissions**：找到 **Actions**，設成 **Read and write**
- 其他權限都不用給

建立後把產生的 token 複製起來（只會顯示一次）。

### 4. 設定 Worker 的密鑰（secrets）

```bash
wrangler secret put YOUTUBE_API_KEY
# 貼上你申請的 YouTube Data API v3 金鑰

wrangler secret put GITHUB_TOKEN
# 貼上剛剛建立的 GitHub Personal Access Token

wrangler secret put CHECK_SECRET
# 隨便打一串你自己知道的亂碼，之後可以用來手動測試（見下方）
```

### 5. 部署

```bash
wrangler deploy
```

部署成功後，Cloudflare 會給你一個 `*.workers.dev` 的網址，Cron Trigger 會自動開始每 5 分鐘執行一次，不需要額外啟動。

## 手動測試

不想等排程，也可以直接打這個網址手動觸發一次檢查（把 `<worker網址>` 和 `<CHECK_SECRET>` 換成你自己的）：

```
https://<worker網址>/check?key=<CHECK_SECRET>
```

回應會是一段 JSON，告訴你這次抓到的最新 3 支影片 ID、跟上次記錄的是否不同、有沒有因此觸發部署。

## 查看執行紀錄

```bash
wrangler tail
```

可以即時看到每次排程執行的 log（包含錯誤訊息）。

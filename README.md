# 星語｜Yu Stellar

獨立音樂創作人「星語」的官方網站。

## 本機預覽

```bash
python3 -m http.server 4173 --directory dist
```

開啟 `http://localhost:4173` 即可預覽。

網站透過 GitHub Actions 從 `dist/` 部署至 GitHub Pages，自訂網域為 `yustellar.idv.tw`。

## 最新 YouTube 影片

首頁會顯示指定播放清單中發布日期最新的三支公開影片。

資料同步分成兩個 workflow：

- **`Check for new YouTube videos`**（`.github/workflows/check-videos.yml`）：每 5 分鐘跑一次，透過 **YouTube Data API v3** 抓一次資料，跟目前 repo 裡的 `dist/data/latest-videos.json` 比對。**沒有變化就到此結束，不會觸發部署**；有變化才會把新的資料 commit、push 回 main。
- **`Deploy static site to Pages`**（`.github/workflows/pages.yml`）：由 push 到 main 觸發（包含上面那個 workflow 自動 push 的 commit），或手動執行。會重新抓一次最新資料、蓋好版本號，再部署到 GitHub Pages。

這樣設計是因為「每 5 分鐘檢查一次」跟「整站重新部署」是兩件成本差很多的事：檢查很便宜，但部署一次要跑完整套 build + deploy，5 分鐘跑一次部署太浪費，所以拆成「先用便宜的方式檢查，真的有新影片才觸發昂貴的部署」。

需要設定一組 GitHub Actions 密鑰 `YOUTUBE_API_KEY`：

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立（或選擇既有）專案
2. 在「API 和服務」啟用 **YouTube Data API v3**
3. 建立一組 API 金鑰（建議限制只能呼叫 YouTube Data API v3，降低外洩風險）
4. 到 GitHub repo 的 **Settings → Secrets and variables → Actions → New repository secret**，新增名稱為 `YOUTUBE_API_KEY`、內容為剛剛的金鑰

如果這組密鑰沒有設定，或是 API 額度用完／暫時打不通，同步這一步會被跳過（不會讓整個部署失敗），網站會沿用上一次成功同步到的 `dist/data/latest-videos.json`。

需要立即更新時，可以到 GitHub 的 **Actions** 分頁手動執行 `Check for new YouTube videos`（只檢查，有變化才部署）或 `Deploy static site to Pages`（強制重新抓一次並部署）。

本機測試同步腳本時，需要先 `export YOUTUBE_API_KEY=你的金鑰` 再執行 `node scripts/fetch-youtube-videos.mjs`。

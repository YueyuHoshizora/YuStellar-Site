# 星語｜Yu Stellar

獨立音樂創作人「星語」的官方網站。

## 本機預覽

```bash
python3 -m http.server 4173 --directory dist
```

開啟 `http://localhost:4173` 即可預覽。

網站透過 GitHub Actions 從 `dist/` 部署至 GitHub Pages，自訂網域為 `yustellar.idv.tw`。

## 最新 YouTube 影片

首頁會顯示指定播放清單中發布日期最新的三支公開影片。GitHub Actions 會在每次部署前及每六小時透過 **YouTube Data API v3** 同步資料。

需要設定一組 GitHub Actions 密鑰 `YOUTUBE_API_KEY`：

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立（或選擇既有）專案
2. 在「API 和服務」啟用 **YouTube Data API v3**
3. 建立一組 API 金鑰（建議限制只能呼叫 YouTube Data API v3，降低外洩風險）
4. 到 GitHub repo 的 **Settings → Secrets and variables → Actions → New repository secret**，新增名稱為 `YOUTUBE_API_KEY`、內容為剛剛的金鑰

如果這組密鑰沒有設定，或是 API 額度用完／暫時打不通，同步這一步會被跳過（不會讓整個部署失敗），網站會沿用上一次成功同步到的 `dist/data/latest-videos.json`。

需要立即更新時，可以手動執行 `Deploy static site to Pages` 工作流程。

本機測試這支腳本時，需要先 `export YOUTUBE_API_KEY=你的金鑰` 再執行 `node scripts/fetch-youtube-videos.mjs`。

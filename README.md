# 星語｜Yu Stellar

獨立音樂創作人「星語」的官方網站。

## 本機預覽

```bash
python3 -m http.server 4173 --directory dist
```

開啟 `http://localhost:4173` 即可預覽。

網站透過 GitHub Actions 從 `dist/` 部署至 GitHub Pages，自訂網域為 `yustellar.idv.tw`。

## 最新 YouTube 影片

首頁會顯示指定播放清單中發布日期最新的三支公開影片。GitHub Actions 會在每次部署前及每六小時透過 YouTube 官方 RSS 同步資料，不需要 API 金鑰。

需要立即更新時，可以手動執行 `Deploy static site to Pages` 工作流程。

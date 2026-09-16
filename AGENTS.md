# AGENTS.md — 星語｜Yu Stellar 官方網站設計綱要

這份文件給任何要修改這個網站的人（人類或 AI agent）看，說明網站的設計原則、技術架構與慣例，讓後續修改能維持一致的風格與品質。

## 網站定位

獨立音樂創作人「星語（Yu Stellar）」的官方網站。純靜態單頁站台，走**深夜、極簡、電子感**的視覺風格 —— 深色背景、大量留白、細膩的動效，文字本身就是主要的視覺元素。

## 技術原則（硬性規定）

- **純靜態 HTML / CSS / JS，不使用任何前端框架或建置工具（no React/Vue/Webpack/bundler）。** 所有頁面都是手寫的 `.html` 檔，直接放在 `dist/` 底下部署。這是刻意的選擇，除非使用者明確要求，否則不要引入框架或建置流程。
- `dist/` 是唯一的部署目錄，透過 GitHub Actions 部署到 GitHub Pages，自訂網域 `yustellar.idv.tw`（見 `dist/CNAME`），前面再由 Cloudflare 代理。
- `script.js`、`styles.css` 全站共用同一份檔案（各頁面用相對路徑引用），不要為單一頁面另外切一份腳本或樣式。
- 新增頁面時，比照既有頁面的 `<head>`（OG/Twitter meta、canonical、apple-touch-icon、favicon）與共用的 header／mobile-nav／footer／cookie 橫幅結構，不要簡化或跳過。

## 視覺系統

- **色彩**（定義於 `dist/styles.css` 的 `:root`）：
  - `--ink: #080912`（背景，近黑）
  - `--paper: #f4f0f7`（主要文字，近白）
  - `--muted: #a9a5b5`（次要文字）
  - `--violet: #c849f5`、`--cyan: #78ddff`（強調色，用於漸層、光暈、hover 狀態）
- **字體**：
  - `--display`: `'Noto Sans TC'`（中文內文、標題）
  - `--latin`: `'Space Grotesk'`（英文/數字，如 section number、日期、按鈕上的拉丁字母）
  - 透過 Google Fonts 載入，`@import` 在 `styles.css` 最上方。
- **排版慣例**：每個內容區塊（section）都有一個「編號 + 英文代號」的小標，例如 `01 / LISTEN`、`02 / VIDEO`，用 `.section-number` class，字體用 `--latin`、全大寫、字距拉開。新增區塊時延續這個編號序列。
- 大量使用 `.reveal` class 搭配 `IntersectionObserver`（見 `script.js`）做滾動淡入動效，新增可視內容區塊時記得加上 `.reveal`。
- 手機版樣式集中在 `styles.css` 底部的 media query，新增桌面樣式時記得檢查手機版是否也要對應調整。

## 網站結構

```
dist/
  index.html          首頁（Hero、Listen、Video、About、Contact）
  privacy.html         隱私權政策
  blog/                日誌（部落格），index.html 為列表頁，其餘為文章
  en/                  英文版（結構完全鏡射中文版，見下方「多語系」）
  data/latest-videos.json   YouTube 最新影片資料（CI 自動產生，勿手動編輯）
  assets/               圖片
  script.js / styles.css   全站共用
  robots.txt / sitemap.xml
```

## 多語系（中文為主、英文為輔）

- 預設語言（網站根目錄 `dist/*.html`）是繁體中文（`lang="zh-Hant"`），這是主要版本。
- 英文版鏡射在 `dist/en/` 底下，路徑結構與中文版完全對應（例如 `dist/blog/why-yu-stellar.html` ↔ `dist/en/blog/why-yu-stellar.html`），`lang="en"`。
- 每個頁面的 `<head>` 都要有 `hreflang` 互相指向對方語言版本，並包含 `x-default` 指回中文版（中文是預設）。
- 兩個語言版本的 nav、footer、cookie 橫幅文字要各自完整翻譯，不要中英混雜在同一頁。
- `script.js` 內的動態文字（例如「複製信箱」「開啟選單」）透過讀取 `document.documentElement.lang` 切換 `STRINGS` 字典（zh/en 兩組），新增任何腳本產生的文字時要比照這個模式加進 `STRINGS`，不要在 JS 裡直接寫死中文或英文。
- 新增日誌文章時，中英文版本要同時建立、互相對應；如果只先寫得出中文，至少要在英文版留一個對應頁面（可先簡短摘要），不要讓兩個語言版本的文章清單長期不同步。

## YouTube 影片同步機制

- 首頁「影像」區塊顯示的是**頻道自己的「Uploads」播放清單**（`UU` + 頻道 ID 去掉開頭 `UC`），也就是頻道「影片」分頁看到的內容，**不是**某個手動整理的播放清單。
- `scripts/fetch-youtube-videos.mjs` 透過 YouTube Data API v3 抓資料，會過濾掉非公開影片、Shorts（時長 ≤ 60 秒）與直播/首播，只留最新 3 支正式影片，寫到 `dist/data/latest-videos.json`。
- 兩個 GitHub Actions workflow 分工：`check-videos.yml` 每 5 分鐘檢查一次（只比對影片 ID，忽略時間戳雜訊），真的有變化才 commit + 明確觸發 `pages.yml` 部署；`pages.yml` 負責实際 build（含資源版本號戳記）與部署。細節見 `README.md`。
- 修改抓取邏輯時要保留「API 失敗時不讓整個部署失敗，沿用舊資料」的容錯設計（`try/catch` + `continue-on-error`）。

## 快取與資源版本

- `script.js` / `styles.css` 在每個頁面都用 `?v=__ASSET_VERSION__` 佔位符引用，部署時由 CI 用 commit SHA + run number 取代，達到自動 cache-busting。新增頁面時記得比照加上這個佔位符，不要寫死版本號。

## 圖片

- 大型照片（如 Hero 圖）一律提供 WebP 主版本 + JPEG 備援（`<picture>` + `<source type="image/webp">`），不要直接引用未壓縮的原始 PNG。原始未壓縮素材放在 `assets-src/`（不部署），不要放進 `dist/`。

## AdSense / 合規

- `dist/ads.txt` 保留 publisher ID，但目前頁面上沒有載入任何 AdSense script（尚未重新申請）。若要重新加入，先確認 `dist/privacy.html`（及其英文版）內容仍然準確。
- Cookie 同意橫幅使用網站自訂的 class 名稱（`ys-notice` / `data-ys-action`），刻意避開 `cookie-banner` 這類會被廣告攔截器規則命中的通用命名，修改時請維持這個命名習慣。

## 部署與推送

- 這個環境（AI agent 的沙盒/裝置橋接）通常沒有 GitHub 憑證，commit 完之後需要使用者自己在自己的終端機執行 `git push origin main`。不要嘗試把 token／密碼貼進任何指令或欄位。

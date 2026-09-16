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
  ja/                  日文版（結構同樣完全鏡射中文版）
  data/latest-videos.json   YouTube 最新影片資料（CI 自動產生，勿手動編輯）
  assets/               圖片
  script.js / styles.css   全站共用
  robots.txt / sitemap.xml
```

## 多語系（中文為主，英文／日文為輔）

- 預設語言（網站根目錄 `dist/*.html`）是繁體中文（`lang="zh-Hant"`），這是主要版本。
- 英文版鏡射在 `dist/en/` 底下、日文版鏡射在 `dist/ja/` 底下，路徑結構都與中文版完全對應（例如 `dist/blog/why-yu-stellar.html` ↔ `dist/en/blog/why-yu-stellar.html` ↔ `dist/ja/blog/why-yu-stellar.html`），分別是 `lang="en"` / `lang="ja"`。
- 每個頁面的 `<head>` 都要有三語 `hreflang`（`zh-Hant` / `en` / `ja`）互相指向對方語言版本，並包含 `x-default` 指回中文版（中文是預設）。`sitemap.xml` 也要用 `xhtml:link` 同步標註三語 alternate。
- 三個語言版本的 nav、footer、cookie 橫幅文字要各自完整翻譯，不要混雜在同一頁。每個頁面的語言切換連結（`.lang-switch-group` 內的兩個 `.lang-switch`）永遠指向「另外兩種」語言，不要連回自己。
- `script.js` 內的動態文字（例如「複製信箱」「開啟選單」）透過讀取 `document.documentElement.lang` 切換 `STRINGS` 字典（zh/en/ja 三組），新增任何腳本產生的文字時要比照這個模式加進 `STRINGS`，不要在 JS 裡直接寫死任何一種語言。
- 新增日誌文章時，三個語言版本要同時建立、互相對應；如果暫時只寫得出中文，至少要在英文版與日文版各留一個對應頁面（可先簡短摘要），不要讓三個語言版本的文章清單長期不同步。`blog/template.html`、`en/blog/template.html`、`ja/blog/template.html` 三份範本要保持互相對應。

## YouTube 影片同步機制

- 首頁「影像」區塊顯示的是**頻道自己的「Uploads」播放清單**（`UU` + 頻道 ID 去掉開頭 `UC`），也就是頻道「影片」分頁看到的內容，**不是**某個手動整理的播放清單。
- `scripts/fetch-youtube-videos.mjs` 透過 YouTube Data API v3 抓資料，會過濾掉非公開影片、Shorts（時長 ≤ 60 秒）與直播/首播，只留最新 6 支正式影片，寫到 `dist/data/latest-videos.json`。
- 兩個 GitHub Actions workflow 分工：`check-videos.yml` 每 5 分鐘檢查一次（只比對影片 ID，忽略時間戳雜訊），真的有變化才 commit + 明確觸發 `pages.yml` 部署；`pages.yml` 負責实際 build（含資源版本號戳記）與部署。細節見 `README.md`。
- `cf-worker/`：獨立 git repo（已被主站 `.gitignore` 排除），內容是打算取代 `check-videos.yml` 的 Cloudflare Worker，目前尚未正式啟用。細節見 `cf-worker/README.md`。
- 修改抓取邏輯時要保留「API 失敗時不讓整個部署失敗，沿用舊資料」的容錯設計（`try/catch` + `continue-on-error`）。
- `script.js` 抓 `dist/data/latest-videos.json` 用的是**網站根目錄的絕對路徑**（`/data/latest-videos.json`），不要改回 `./data/...` 這種相對路徑——`script.js` 是三語共用的同一份檔案，頁面深度不一（`/`、`/blog/`、`/en/`、`/ja/blog/` 等），相對路徑在不同深度會解析到不同位置，容易在某個語言版本上悄悄 404。

## 快取與資源版本

- `script.js` / `styles.css` 在每個頁面都用 `?v=__ASSET_VERSION__` 佔位符引用，部署時由 CI 用 commit SHA + run number 取代，達到自動 cache-busting。新增頁面時記得比照加上這個佔位符，不要寫死版本號。

## 圖片

- 大型照片（如 Hero 圖）一律提供 WebP 主版本 + JPEG 備援（`<picture>` + `<source type="image/webp">`），不要直接引用未壓縮的原始 PNG。原始未壓縮素材放在 `assets-src/`（不部署），不要放進 `dist/`。

## 字型載入

- 字型（Noto Sans TC、Space Grotesk）**不要**用 `styles.css` 裡的 `@import` 載入——那會擋住 CSSOM 直到 `styles.css` 自己先被抓取、解析完才會發現字型請求，多一趟往返。改成每個頁面 `<head>` 裡、`styles.css` 連結**之前**放：
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Space+Grotesk:wght@400;500;600&display=swap" />
  ```
  新增頁面（包含新的語言版本、新的日誌文章）都要比照加上這三行，不要漏掉，也不要在 CSS 裡重新加回 `@import`。

## SEO

- **結構化資料（JSON-LD）**：每種頁面類型都要有對應的 schema.org 標記，放在 `<title>` 標籤後面：
  - 首頁（zh/en/ja 三版）：`MusicGroup`，含 `inLanguage`。
  - 日誌文章：`@graph` 內同時放 `BlogPosting`（含 `headline`／`description`／`datePublished`／`inLanguage`／`author`／`publisher`）與 `BreadcrumbList`（首頁 → 日誌 → 這篇文章）。
  - 日誌列表頁：`CollectionPage` + `BreadcrumbList`（首頁 → 日誌）。
  - 隱私權政策頁：`WebPage` + `BreadcrumbList`（首頁 → 隱私權政策）。
  - 新增頁面時比照同類型既有頁面的結構，`headline`/`description`/`url` 等欄位直接對應該頁的 `<h1>`／meta description／canonical，不要手動另外編一套文字。
- **`content="..."` 屬性裡絕對不能出現沒跳脫的雙引號**（例如英文標題裡的引號）。曾經因為 `content="On the name "Yu Stellar," ..."` 這種寫法，讓瀏覽器把屬性值從第一個內部引號就截斷，等於整段 meta description 都壞掉。標題／描述裡如果需要引號，一律用排版引號 `“` `”`，不要用直引號 `"`。
- **hreflang**：每個頁面的 `<head>` 都要有三語 `hreflang`（`zh-Hant`/`en`/`ja`）+ `x-default`（指回中文版），`sitemap.xml` 也要用 `xhtml:link` 同步標註（見上方「多語系」章節）。
- **`og:locale` / `og:locale:alternate`**：每頁的 `og:locale` 是自己的語言，另外兩語都要各加一行 `og:locale:alternate`。
- **`robots.txt` / `noindex`**：`blog/template.html`（及其 en/ja 對應檔）雖然會被部署、可被直接連到，但只是佔位範本，不該被搜尋引擎索引——三份都要有 `<meta name="robots" content="noindex, follow" />`。新增其他「不想被索引但仍需保留」的頁面時比照處理，不要直接從 `robots.txt` 擋掉整個路徑（那樣反而會讓其他正常頁面的連結權重傳遞受影響）。
- **`sitemap.xml`**：只放會被索引的真實頁面（不放 `template.html`），每個 `<url>` 都要用 `xhtml:link` 標三語 alternate（含 `x-default`）。新增日誌文章或任何新頁面時，三語都要一起補進 sitemap。

## AdSense / 合規

- `dist/ads.txt` 保留 publisher ID，但目前頁面上沒有載入任何 AdSense script（尚未重新申請）。若要重新加入，先確認 `dist/privacy.html`（及其英文版）內容仍然準確。
- Cookie 同意橫幅使用網站自訂的 class 名稱（`ys-notice` / `data-ys-action`），刻意避開 `cookie-banner` 這類會被廣告攔截器規則命中的通用命名，修改時請維持這個命名習慣。

## 部署與推送

- 這個環境（AI agent 的沙盒/裝置橋接）通常沒有 GitHub 憑證，commit 完之後需要使用者自己在自己的終端機執行 `git push origin main`。不要嘗試把 token／密碼貼進任何指令或欄位。

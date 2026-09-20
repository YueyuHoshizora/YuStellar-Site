# AGENTS.md — 星語｜Yu Stellar 官方網站設計綱要

這份文件給任何要修改這個網站的人（人類或 AI agent）看，說明網站的設計原則、技術架構與慣例，讓後續修改能維持一致的風格與品質。

## 網站定位

獨立音樂創作人「星語（Yu Stellar）」的官方網站。純靜態單頁站台，走**深夜、極簡、電子感**的視覺風格 —— 深色背景、大量留白、細膩的動效，文字本身就是主要的視覺元素。

## 技術原則（硬性規定）

- **純靜態 HTML / CSS / JS，不使用任何前端框架或建置工具（no React/Vue/Webpack/bundler）。** 所有頁面都是手寫的 `.html` 檔，直接放在 `dist/` 底下部署。這是刻意的選擇，除非使用者明確要求，否則不要引入框架或建置流程。
- `dist/` 是唯一的部署目錄，透過 GitHub Actions 部署到 GitHub Pages，自訂網域 `yustellar.dev`（見 `dist/CNAME`），前面再由 Cloudflare 代理。
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
  data/latest-videos.json   YouTube 最新影片資料（CI 自動產生，勿手動編輯）
  assets/               圖片
  script.js / styles.css   全站共用
  robots.txt / sitemap.xml
```

## 多語系（單一頁面 + 前端 JS 切換）

- **每個頁面只有一份 HTML**，三語（`zh` / `en` / `ja`）都由 `script.js` 在瀏覽器端即時渲染。**不要**再建立 `dist/en/`、`dist/ja/` 這種鏡射目錄，也不要在頁面裡放 `hreflang`（一個網址服務三語，hreflang 不適用）。
- 語言決定順序：網址的 `?lang=zh|en|ja` → `localStorage` 的 `ys-lang` → `navigator.language` → 預設 `zh`。切語言時用 `history.pushState` 把 `?lang=` 寫進網址（`zh` 為預設語言，會把參數移除），因此語言狀態可分享、可用瀏覽器上一頁切回。
- 兩層字典，界線要守住：
  - **全站 chrome**（header／nav／footer／cookie 橫幅／skip link／選單 aria-label）放在 `script.js` 的 `ALL_STRINGS`，因為每頁都一樣。HTML 上用 `data-i18n-global="key"`（文字）與 `data-i18n-global-attr="aria-label:key"`（屬性）標記。
  - **頁面自有內容**（標題、內文、`<head>` meta、JSON-LD）放在該頁尾端的 `<script type="application/json" id="i18n-data">`，結構是 `{zh|en|ja}.{title, description, jsonld, content{…}}`。HTML 上用 `data-i18n`（textContent）、`data-i18n-html`（innerHTML，內含 `<br>`／`<em>`／`<a>` 時用它）、`data-i18n-attr="alt:key"`（屬性）標記。
- 靜態 HTML 裡寫的是**中文版**內容（`<html lang="zh-Hant">`、中文 `<title>`／meta／JSON-LD），JS 啟動後才依偵測到的語言覆寫。新增頁面時照這個慣例，不要改成用別的語言當靜態預設。
- `<script type="application/ld+json">` 一定要帶 `data-i18n-ld` 屬性，JS 才找得到它並整段替換；JSON-LD 內所有 `url`／`@id`／`item` 一律使用單一（中文版）網址。
- cookie 橫幅那句含連結的文字由 `ALL_STRINGS.cookieHtml(href)` 產生，HTML 只寫 `<p data-ys-notice-text data-privacy-href="…">`，`data-privacy-href` 依頁面深度給相對路徑。
- 語言切換器是三顆固定的 `<button class="lang-switch" data-lang="zh|en|ja">`（header 與 mobile-nav 各一組），標籤永遠是 `中文 / EN / 日本語`，當前語言由 JS 加上 `.is-active` 與 `aria-current`。
- 新增任何文字都要三語一起補：chrome 文字補進 `ALL_STRINGS` 三組，頁面文字補進該頁 `#i18n-data` 三組，三語的 `content` key 集合必須完全一致。絕對不要在 HTML 或 JS 裡寫死單一語言的可見文字。
- 新增日誌文章：複製 `blog/template.html`，把三語內容一次填進 `#i18n-data`（只有一份範本檔，不再有 en／ja 版範本）。

## YouTube 影片同步機制

- 首頁「影像」區塊顯示的是**頻道自己的「Uploads」播放清單**（`UU` + 頻道 ID 去掉開頭 `UC`），也就是頻道「影片」分頁看到的內容，**不是**某個手動整理的播放清單。
- `scripts/fetch-youtube-videos.mjs` 透過 YouTube Data API v3 抓資料，會過濾掉非公開影片、Shorts（時長 ≤ 60 秒）與直播/首播，只留最新 6 支正式影片，寫到 `dist/data/latest-videos.json`。
- 兩個 GitHub Actions workflow 分工：`check-videos.yml` 每 5 分鐘檢查一次（只比對影片 ID，忽略時間戳雜訊），真的有變化才 commit + 明確觸發 `pages.yml` 部署；`pages.yml` 負責实際 build（含資源版本號戳記）與部署。細節見 `README.md`。
- `sync-video/`：獨立 git repo（已被主站 `.gitignore` 排除），內容是打算取代 `check-videos.yml` 的 Cloudflare Worker，目前尚未正式啟用。細節見 `sync-video/README.md`。
- 修改抓取邏輯時要保留「API 失敗時不讓整個部署失敗，沿用舊資料」的容錯設計（`try/catch` + `continue-on-error`）。
- `script.js` 抓 `dist/data/latest-videos.json` 用的是**網站根目錄的絕對路徑**（`/data/latest-videos.json`），不要改回 `./data/...` 這種相對路徑——`script.js` 是三語共用的同一份檔案，頁面深度不一（`/`、`/blog/`、`/en/`、`/ja/blog/` 等），相對路徑在不同深度會解析到不同位置，容易在某個語言版本上悄悄 404。

## 快取與資源版本

- **`script.js` / `styles.css` 在 HTML 裡就寫原始檔名**（`./script.js`、`../styles.css`），**不要**加 `?v=` 之類的版本查詢字串。部署時 `scripts/hash-assets.mjs` 會在 CI 把檔案改名成內容 hash 版（`script.<sha256前10碼>.js`、`styles.<hash>.css`）並改寫所有 HTML 引用。內容沒變 → hash 不變 → 瀏覽器沿用快取；內容一變 → 網址一定變 → 不可能吃到舊檔。committed 的 `dist/` 永遠保持原始檔名，本機 `python3 -m http.server` 才能直接預覽。
- 新增頁面時照樣寫 `./script.js` / `./styles.css`（相對深度要對），hash 步驟會自動處理，不要手寫 hash 檔名。
- **HTML 本身不做長快取**：資源已經是 immutable 檔名，HTML 必須能立刻更新。GitHub Pages 固定回 `Cache-Control: max-age=600` 且**不支援自訂 header**（也不吃 `_headers` 檔），所以要真正做到 HTML 不被快取，必須讓網域經 Cloudflare 代理（橘雲）並加一條 Cache Rule：對 `text/html`／路徑結尾為 `/` 或 `.html` 的請求設定 Browser TTL = no-store、Edge TTL 依需求 bypass。這是 repo 外的設定，改完 DNS／Cloudflare 後要回頭確認 `curl -I https://yustellar.dev/` 的 `cache-control`。

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
  - 首頁：`MusicGroup`，含 `inLanguage`（三語版本放在 `#i18n-data` 的 `jsonld` 裡，由 JS 依語言替換）。
  - 日誌文章：`@graph` 內同時放 `BlogPosting`（含 `headline`／`description`／`datePublished`／`inLanguage`／`author`／`publisher`）與 `BreadcrumbList`（首頁 → 日誌 → 這篇文章）。
  - 日誌列表頁：`CollectionPage` + `BreadcrumbList`（首頁 → 日誌）。
  - 隱私權政策頁：`WebPage` + `BreadcrumbList`（首頁 → 隱私權政策）。
  - 新增頁面時比照同類型既有頁面的結構，`headline`/`description`/`url` 等欄位直接對應該頁的 `<h1>`／meta description／canonical，不要手動另外編一套文字。JSON-LD 的 `url`／`@id`／`item` 一律用該頁唯一的網址（不帶 `?lang=`），並且三語版本都要在 `#i18n-data` 裡補齊。
- **`content="..."` 屬性裡絕對不能出現沒跳脫的雙引號**（例如英文標題裡的引號）。曾經因為 `content="On the name "Yu Stellar," ..."` 這種寫法，讓瀏覽器把屬性值從第一個內部引號就截斷，等於整段 meta description 都壞掉。標題／描述裡如果需要引號，一律用排版引號 `“` `”`，不要用直引號 `"`。
- **沒有 hreflang**：一個網址同時服務三語（由 `?lang=` + JS 渲染），所以頁面 `<head>` 與 `sitemap.xml` 都**不放** `hreflang`／`xhtml:link` alternate。這是刻意的取捨：換來單一 canonical、不再需要維護三套鏡射頁面，代價是搜尋引擎預設看到的是中文靜態內容。
- **`og:locale` / `og:locale:alternate`**：靜態 HTML 裡 `og:locale` 寫 `zh_TW`、另外兩語各一行 `og:locale:alternate`；切語言時 `script.js` 會把 `og:locale` 改成當前語言、兩行 alternate 改成另外兩語，順序不用手動維護。
- **`robots.txt` / `noindex`**：`blog/template.html` 雖然會被部署、可被直接連到，但只是佔位範本，不該被搜尋引擎索引——要有 `<meta name="robots" content="noindex, follow" />`。新增其他「不想被索引但仍需保留」的頁面時比照處理，不要直接從 `robots.txt` 擋掉整個路徑（那樣反而會讓其他正常頁面的連結權重傳遞受影響）。
- **`sitemap.xml`**：只放會被索引的真實頁面（不放 `template.html`），每個頁面一個 `<url>`，不帶 alternate 標註。新增日誌文章或任何新頁面時記得補進去。

## AdSense / 合規

- `dist/ads.txt` 保留 publisher ID，但目前頁面上沒有載入任何 AdSense script（尚未重新申請）。若要重新加入，先確認 `dist/privacy.html`（及其英文版）內容仍然準確。
- Cookie 同意橫幅使用網站自訂的 class 名稱（`ys-notice` / `data-ys-action`），刻意避開 `cookie-banner` 這類會被廣告攔截器規則命中的通用命名，修改時請維持這個命名習慣。

## 部署與推送

- 這個環境（AI agent 的沙盒/裝置橋接）通常沒有 GitHub 憑證，commit 完之後需要使用者自己在自己的終端機執行 `git push origin main`。不要嘗試把 token／密碼貼進任何指令或欄位。

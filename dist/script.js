// --- Language ---------------------------------------------------------
// The site ships ONE html file per page; all three languages are rendered
// from that same markup at runtime. Resolution order:
//   ?lang= in the URL  >  saved preference  >  browser language  >  zh
//
// Two dictionaries feed the render:
//   ALL_STRINGS  -- site chrome (header/nav/footer/cookie banner), lives here
//                   because it is identical on every page.
//   #i18n-data   -- page-unique copy + <head> metadata + JSON-LD, embedded in
//                   each html file as an application/json script tag.
const SUPPORTED_LANGS = ['zh', 'en', 'ja'];
const LANG_TAG = { zh: 'zh-Hant', en: 'en', ja: 'ja' };
const OG_LOCALE = { zh: 'zh_TW', en: 'en_US', ja: 'ja_JP' };
const LANG_KEY = 'ys-lang';

function readStoredLang() {
  try {
    return window.localStorage.getItem(LANG_KEY);
  } catch {
    return null;
  }
}

function storeLang(lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* localStorage unavailable (e.g. private browsing) — preference just won't stick */
  }
}

function langFromUrl() {
  const value = new URLSearchParams(window.location.search).get('lang');
  return SUPPORTED_LANGS.includes(value) ? value : null;
}

function detectLang() {
  const fromUrl = langFromUrl();
  if (fromUrl) return fromUrl;

  const stored = readStoredLang();
  if (SUPPORTED_LANGS.includes(stored)) return stored;

  const tags = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language || ''];
  for (const tag of tags) {
    const value = String(tag).toLowerCase();
    if (value.startsWith('zh')) return 'zh';
    if (value.startsWith('ja')) return 'ja';
    if (value.startsWith('en')) return 'en';
  }
  return 'zh';
}

const ALL_STRINGS = {
  zh: {
    brandName: '星語',
    brandSub: 'YU STELLAR',
    brandAria: '星語首頁',
    skipLink: '跳至主要內容',
    mainNavLabel: '主要導覽',
    mobileNavLabel: '行動版導覽',
    langGroupLabel: '語言',
    navListen: '音樂',
    navVideos: '影像',
    navJournal: '日誌',
    navAbout: '關於',
    navContact: '聯絡',
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    copied: '已複製',
    copyEmail: '複製信箱',
    videoSyncing: '最新影片正在同步，你也可以直接前往播放清單。',
    goToYouTube: '前往 YouTube ↗',
    playVideo: (title) => `播放影片：${title}`,
    dateLocale: 'zh-TW',
    privacyLabel: '隱私權政策',
    blogBack: '← 回到日誌',
    cookieHtml: (href) =>
      `本站使用 cookie 以維持基本功能，未來啟用廣告服務後也可能用於個人化廣告，詳見<a href="${href}">隱私權政策</a>。`,
    cookieAccept: '接受',
    cookieDecline: '拒絕個人化',
  },
  en: {
    brandName: 'Yu Stellar',
    brandSub: '星語',
    brandAria: 'Yu Stellar home',
    skipLink: 'Skip to main content',
    mainNavLabel: 'Main navigation',
    mobileNavLabel: 'Mobile navigation',
    langGroupLabel: 'Language',
    navListen: 'Listen',
    navVideos: 'Videos',
    navJournal: 'Journal',
    navAbout: 'About',
    navContact: 'Contact',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    copied: 'Copied',
    copyEmail: 'Copy email',
    videoSyncing: 'The latest videos are syncing — you can also head straight to the playlist.',
    goToYouTube: 'Go to YouTube ↗',
    playVideo: (title) => `Play video: ${title}`,
    dateLocale: 'en-US',
    privacyLabel: 'Privacy Policy',
    blogBack: '← Back to Journal',
    cookieHtml: (href) =>
      `This site uses cookies to keep basic features working, and may use them for personalized ads if advertising is enabled in the future. See the <a href="${href}">Privacy Policy</a>.`,
    cookieAccept: 'Accept',
    cookieDecline: 'Decline personalization',
  },
  ja: {
    brandName: 'Yu Stellar',
    brandSub: '星語',
    brandAria: '星語ホーム',
    skipLink: 'メインコンテンツへスキップ',
    mainNavLabel: 'メインナビゲーション',
    mobileNavLabel: 'モバイルナビゲーション',
    langGroupLabel: '言語',
    navListen: '音楽',
    navVideos: '映像',
    navJournal: 'ジャーナル',
    navAbout: 'アバウト',
    navContact: 'コンタクト',
    openMenu: 'メニューを開く',
    closeMenu: 'メニューを閉じる',
    copied: 'コピーしました',
    copyEmail: 'メールをコピー',
    videoSyncing: '最新の映像を同期中です。再生リストに直接アクセスすることもできます。',
    goToYouTube: 'YouTube で見る ↗',
    playVideo: (title) => `動画を再生：${title}`,
    dateLocale: 'ja-JP',
    privacyLabel: 'プライバシーポリシー',
    blogBack: '← ジャーナルに戻る',
    cookieHtml: (href) =>
      `本サイトでは基本機能を維持するためにCookieを使用しています。将来的に広告サービスを有効にした場合、パーソナライズ広告にも使用される可能性があります。詳しくは<a href="${href}">プライバシーポリシー</a>をご覧ください。`,
    cookieAccept: '同意する',
    cookieDecline: 'パーソナライズを拒否',
  },
};

let LANG = detectLang();
let STRINGS = ALL_STRINGS[LANG];

const pageDataEl = document.querySelector('#i18n-data');
const PAGE_I18N = pageDataEl ? JSON.parse(pageDataEl.textContent) : null;

const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('.mobile-nav');
const emailButton = document.querySelector('.email-button');
const videoGrid = document.querySelector('#video-grid');
const playlistUrl = 'https://www.youtube.com/playlist?list=PL3wGjWZFPUy-_6vqVV9L5Ns8coTmFAnyC';

function setMetaContent(selector, value) {
  if (value == null) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

// Chrome = everything that is byte-identical on every page of the site.
// Elements opt in with data-i18n-global="key" (text) or
// data-i18n-global-attr="attr:key,attr2:key2" (attributes).
function applyChromeStrings() {
  document.querySelectorAll('[data-i18n-global]').forEach((el) => {
    const value = STRINGS[el.dataset.i18nGlobal];
    if (typeof value === 'string') el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-global-attr]').forEach((el) => {
    el.dataset.i18nGlobalAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      const value = STRINGS[key];
      if (attr && typeof value === 'string') el.setAttribute(attr, value);
    });
  });

  const notice = document.querySelector('[data-ys-notice-text]');
  if (notice) notice.innerHTML = STRINGS.cookieHtml(notice.dataset.privacyHref || './privacy.html');

  if (menuButton) {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-label', expanded ? STRINGS.closeMenu : STRINGS.openMenu);
  }
}

// Page copy + <head> metadata + JSON-LD, all from the page's #i18n-data blob.
function applyPageStrings() {
  if (!PAGE_I18N) return;
  const data = PAGE_I18N[LANG];
  if (!data) return;
  const content = data.content || {};

  if (data.title) document.title = data.title;
  setMetaContent('meta[name="description"]', data.description);
  setMetaContent('meta[property="og:title"]', data.ogTitle || data.title);
  setMetaContent('meta[property="og:description"]', data.ogDescription || data.description);
  setMetaContent('meta[name="twitter:title"]', data.ogTitle || data.title);
  setMetaContent('meta[name="twitter:description"]', data.ogDescription || data.description);
  setMetaContent('meta[property="og:locale"]', OG_LOCALE[LANG]);

  const alternates = SUPPORTED_LANGS.filter((lang) => lang !== LANG);
  document.querySelectorAll('meta[property="og:locale:alternate"]').forEach((el, index) => {
    if (alternates[index]) el.setAttribute('content', OG_LOCALE[alternates[index]]);
  });

  if (data.jsonld) {
    const ld = document.querySelector('script[type="application/ld+json"][data-i18n-ld]');
    if (ld) ld.textContent = JSON.stringify(data.jsonld, null, 2);
  }

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = content[el.dataset.i18n];
    if (typeof value === 'string') el.textContent = value;
  });

  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const value = content[el.dataset.i18nHtml];
    if (typeof value === 'string') el.innerHTML = value;
  });

  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':').map((part) => part.trim());
      const value = content[key];
      if (attr && typeof value === 'string') el.setAttribute(attr, value);
    });
  });
}

function updateLangSwitchUI() {
  document.querySelectorAll('.lang-switch').forEach((button) => {
    const isActive = button.dataset.lang === LANG;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function render() {
  document.documentElement.lang = LANG_TAG[LANG];
  applyChromeStrings();
  applyPageStrings();
  updateLangSwitchUI();
  renderVideos();
}

// Keep the address bar honest about what is actually rendered: ?lang=en|ja for
// the non-default languages, no parameter at all for the default (zh).
function syncUrlToLang({ push }) {
  const url = new URL(window.location.href);
  if (LANG === 'zh') url.searchParams.delete('lang');
  else url.searchParams.set('lang', LANG);
  if (url.href === window.location.href) return;
  if (push) window.history.pushState({ lang: LANG }, '', url);
  else window.history.replaceState({ lang: LANG }, '', url);
}

function setLanguage(lang, { push = true } = {}) {
  if (!SUPPORTED_LANGS.includes(lang) || lang === LANG) return;
  LANG = lang;
  STRINGS = ALL_STRINGS[LANG];
  storeLang(LANG);
  if (push) syncUrlToLang({ push: true });
  render();
}

document.querySelectorAll('.lang-switch').forEach((button) => {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang);
    closeMenu();
  });
});

window.addEventListener('popstate', () => {
  const lang = langFromUrl() || (SUPPORTED_LANGS.includes(readStoredLang()) ? readStoredLang() : 'zh');
  setLanguage(lang, { push: false });
});

function closeMenu() {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', STRINGS.openMenu);
  mobileNav.hidden = true;
}

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    menuButton.setAttribute('aria-label', open ? STRINGS.openMenu : STRINGS.closeMenu);
    mobileNav.hidden = open;
  });

  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
}

if (emailButton) {
  emailButton.addEventListener('click', async () => {
    const action = emailButton.querySelector('.email-action');
    try {
      await navigator.clipboard.writeText(emailButton.dataset.email);
      action.textContent = STRINGS.copied;
      setTimeout(() => { action.textContent = STRINGS.copyEmail; }, 1800);
    } catch {
      window.location.href = `mailto:${emailButton.dataset.email}`;
    }
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function showVideoFallback() {
  videoGrid.replaceChildren();
  const state = document.createElement('div');
  const message = document.createElement('p');
  const link = document.createElement('a');

  state.className = 'video-state';
  message.textContent = STRINGS.videoSyncing;
  link.href = playlistUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = STRINGS.goToYouTube;
  state.append(message, link);
  videoGrid.append(state);
  videoGrid.setAttribute('aria-busy', 'false');
}

function createVideoCard(video, index) {
  const article = document.createElement('article');
  const media = document.createElement('button');
  const image = document.createElement('img');
  const play = document.createElement('span');
  const meta = document.createElement('div');
  const number = document.createElement('span');
  const title = document.createElement('h3');
  const date = document.createElement('p');

  article.className = 'video-card';
  media.className = 'video-media';
  media.type = 'button';
  media.setAttribute('aria-label', STRINGS.playVideo(video.title));
  image.src = video.thumbnail;
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  play.className = 'video-play';
  play.setAttribute('aria-hidden', 'true');
  play.textContent = '▶';
  media.append(image, play);

  media.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'video-media';
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`;
    iframe.title = video.title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    media.replaceWith(iframe);
  }, { once: true });

  meta.className = 'video-meta';
  number.className = 'video-index';
  number.textContent = String(index + 1).padStart(2, '0');
  title.className = 'video-title';
  title.textContent = video.title;
  date.className = 'video-date';
  date.textContent = new Intl.DateTimeFormat(STRINGS.dateLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(video.publishedAt));
  meta.append(number, title, date);
  article.append(media, meta);
  return article;
}

// Cached so a language switch can re-render dates and aria-labels without
// re-fetching, and so it can fall back to the right localized message.
let latestVideos = null;

function renderVideos() {
  if (!videoGrid || latestVideos === null) return;
  if (!latestVideos.length) {
    showVideoFallback();
    return;
  }
  videoGrid.replaceChildren(...latestVideos.map(createVideoCard));
  videoGrid.setAttribute('aria-busy', 'false');
}

async function loadLatestVideos() {
  try {
    // Absolute, site-root-relative path -- this file is shared by pages at
    // every depth (/, /blog/, ...), and a relative './data/...' would resolve
    // differently (and 404) depending on which directory the page lives in.
    const response = await fetch('/data/latest-videos.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    latestVideos = Array.isArray(data.videos) ? data.videos.slice(0, 6) : [];
  } catch (error) {
    console.warn('Unable to load latest videos.', error);
    latestVideos = [];
  }
  renderVideos();
}

render();
syncUrlToLang({ push: false });

if (videoGrid) {
  loadLatestVideos();
}

// --- Cookie consent banner (shared across all pages) ---
(function setupCookieBanner() {
  const banner = document.querySelector('#ys-notice');
  if (!banner) return;

  const CONSENT_KEY = 'ys_notice_pref';

  function getConsent() {
    try {
      return window.localStorage.getItem(CONSENT_KEY);
    } catch {
      return null;
    }
  }

  function setConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      /* localStorage unavailable (e.g. private browsing) — banner will just show again next visit */
    }
  }

  if (!getConsent()) {
    banner.hidden = false;
  }

  banner.querySelectorAll('[data-ys-action]').forEach((button) => {
    button.addEventListener('click', () => {
      setConsent(button.dataset.ysAction);
      banner.hidden = true;
    });
  });
})();

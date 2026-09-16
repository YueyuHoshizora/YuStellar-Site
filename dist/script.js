const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('.mobile-nav');
const emailButton = document.querySelector('.email-button');
const videoGrid = document.querySelector('#video-grid');
const playlistUrl = 'https://www.youtube.com/playlist?list=PL3wGjWZFPUy-_6vqVV9L5Ns8coTmFAnyC';

// Small strings that vary by page language. Every page sets <html lang="...">
// itself (zh-Hant for the default site, en for the /en/ mirror), so we just
// read that instead of needing a separate per-page config.
const LANG = (() => {
  const lang = document.documentElement.lang;
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'zh';
})();
const STRINGS = {
  zh: {
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    copied: '已複製',
    copyEmail: '複製信箱',
    videoSyncing: '最新影片正在同步，你也可以直接前往播放清單。',
    goToYouTube: '前往 YouTube ↗',
    playVideo: (title) => `播放影片：${title}`,
    dateLocale: 'zh-TW',
  },
  en: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    copied: 'Copied',
    copyEmail: 'Copy email',
    videoSyncing: 'The latest videos are syncing — you can also head straight to the playlist.',
    goToYouTube: 'Go to YouTube ↗',
    playVideo: (title) => `Play video: ${title}`,
    dateLocale: 'en-US',
  },
  ja: {
    openMenu: 'メニューを開く',
    closeMenu: 'メニューを閉じる',
    copied: 'コピーしました',
    copyEmail: 'メールをコピー',
    videoSyncing: '最新の映像を同期中です。再生リストに直接アクセスすることもできます。',
    goToYouTube: 'YouTube で見る ↗',
    playVideo: (title) => `動画を再生：${title}`,
    dateLocale: 'ja-JP',
  },
}[LANG];

function closeMenu() {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', STRINGS.openMenu);
  mobileNav.hidden = true;
}

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? STRINGS.openMenu : STRINGS.closeMenu);
    mobileNav.hidden = isOpen;
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

async function loadLatestVideos() {
  try {
    // Absolute, site-root-relative path -- this file is shared by pages at
    // every depth (/, /blog/, /en/, /en/blog/, /ja/blog/, ...), and a
    // relative './data/...' would resolve differently (and 404) depending on
    // which directory the current page lives in.
    const response = await fetch('/data/latest-videos.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const videos = Array.isArray(data.videos) ? data.videos.slice(0, 3) : [];
    if (!videos.length) {
      showVideoFallback();
      return;
    }

    videoGrid.replaceChildren(...videos.map(createVideoCard));
    videoGrid.setAttribute('aria-busy', 'false');
  } catch (error) {
    console.warn('Unable to load latest videos.', error);
    showVideoFallback();
  }
}

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

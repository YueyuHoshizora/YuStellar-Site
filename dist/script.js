const menuButton = document.querySelector('.menu-button');
const mobileNav = document.querySelector('.mobile-nav');
const emailButton = document.querySelector('.email-button');
const videoGrid = document.querySelector('#video-grid');
const playlistUrl = 'https://www.youtube.com/playlist?list=PL3wGjWZFPUy-_6vqVV9L5Ns8coTmFAnyC';

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '開啟選單');
  mobileNav.hidden = true;
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '開啟選單' : '關閉選單');
  mobileNav.hidden = isOpen;
});

mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

emailButton.addEventListener('click', async () => {
  const action = emailButton.querySelector('.email-action');
  try {
    await navigator.clipboard.writeText(emailButton.dataset.email);
    action.textContent = '已複製';
    setTimeout(() => { action.textContent = '複製信箱'; }, 1800);
  } catch {
    window.location.href = `mailto:${emailButton.dataset.email}`;
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
document.querySelector('#year').textContent = new Date().getFullYear();

function showVideoFallback() {
  videoGrid.replaceChildren();
  const state = document.createElement('div');
  const message = document.createElement('p');
  const link = document.createElement('a');

  state.className = 'video-state';
  message.textContent = '最新影片正在同步，你也可以直接前往播放清單。';
  link.href = playlistUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = '前往 YouTube ↗';
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
  media.setAttribute('aria-label', `播放影片：${video.title}`);
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
  date.textContent = new Intl.DateTimeFormat('zh-TW', {
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
    const response = await fetch('./data/latest-videos.json', { cache: 'no-cache' });
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

loadLatestVideos();

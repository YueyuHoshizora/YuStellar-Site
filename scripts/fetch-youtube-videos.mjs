import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const PLAYLIST_ID = 'PL3wGjWZFPUy-_6vqVV9L5Ns8coTmFAnyC';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;
const OUTPUT_PATH = resolve('dist/data/latest-videos.json');

function decodeXml(value) {
  const entities = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (_, entity) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()];
  });
}

function readTag(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1].trim()) : null;
}

async function refreshVideos() {
  const response = await fetch(FEED_URL, {
    headers: { 'user-agent': 'YuStellar-site-video-sync/1.0' },
  });

  if (!response.ok) {
    throw new Error(`YouTube feed returned HTTP ${response.status}.`);
  }

  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const videos = entries
    .map((entry) => {
      const id = readTag(entry, 'yt:videoId');
      return {
        id,
        title: readTag(entry, 'title'),
        publishedAt: readTag(entry, 'published'),
        thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
        url: id ? `https://www.youtube.com/watch?v=${id}` : null,
      };
    })
    .filter((video) => video.id && video.title && video.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);

  if (!videos.length) {
    throw new Error('The configured playlist feed did not return any videos.');
  }

  const data = {
    playlistId: PLAYLIST_ID,
    updatedAt: new Date().toISOString(),
    videos,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`Updated ${OUTPUT_PATH} with ${videos.length} videos.`);
}

try {
  await refreshVideos();
} catch (error) {
  // Don't let a flaky YouTube feed block the whole site deploy.
  // Keep whatever dist/data/latest-videos.json already exists (from the
  // last successful sync) and let the rest of the site deploy normally.
  console.warn(`Skipping video sync: ${error.message}`);
  console.warn('Keeping the previously synced dist/data/latest-videos.json as-is.');
}

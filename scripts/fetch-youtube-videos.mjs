import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Channel's own "Uploads" playlist (all videos from the Videos tab, newest
// first) rather than a hand-curated playlist -- this always reflects
// whatever actually appears on https://www.youtube.com/@... 's Videos tab.
// YouTube auto-generates this playlist ID for every channel as
// "UU" + <channel ID without the leading "UC">.
const PLAYLIST_ID = 'UU4sQ-mQ_AiZrNtSOEzqY7FA';
const API_KEY = process.env.YOUTUBE_API_KEY;
const API_URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&maxResults=25&playlistId=${PLAYLIST_ID}&key=${API_KEY}`;
const OUTPUT_PATH = resolve('dist/data/latest-videos.json');

async function refreshVideos() {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not set (add it as a GitHub Actions secret).');
  }

  const response = await fetch(API_URL, {
    headers: { 'user-agent': 'YuStellar-site-video-sync/1.0' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube Data API returned HTTP ${response.status}. ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  const videos = items
    .filter((item) => item.status?.privacyStatus === 'public')
    .map((item) => {
      const snippet = item.snippet ?? {};
      const id = snippet.resourceId?.videoId ?? null;
      return {
        id,
        title: snippet.title ?? null,
        publishedAt: snippet.publishedAt ?? null,
        thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
        url: id ? `https://www.youtube.com/watch?v=${id}` : null,
      };
    })
    .filter((video) => video.id && video.title && video.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);

  if (!videos.length) {
    throw new Error('The YouTube Data API did not return any usable public videos.');
  }

  const output = {
    playlistId: PLAYLIST_ID,
    updatedAt: new Date().toISOString(),
    videos,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Updated ${OUTPUT_PATH} with ${videos.length} videos.`);
}

try {
  await refreshVideos();
} catch (error) {
  // Don't let a flaky/quota-exhausted YouTube API call block the whole
  // site deploy. Keep whatever dist/data/latest-videos.json already
  // exists (from the last successful sync) and let the rest of the site
  // deploy normally.
  console.warn(`Skipping video sync: ${error.message}`);
  console.warn('Keeping the previously synced dist/data/latest-videos.json as-is.');
}

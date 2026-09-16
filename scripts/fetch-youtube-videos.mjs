import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// Channel's own "Uploads" playlist (all videos from the Videos tab, newest
// first) rather than a hand-curated playlist -- this always reflects
// whatever actually appears on https://www.youtube.com/@... 's Videos tab.
// YouTube auto-generates this playlist ID for every channel as
// "UU" + <channel ID without the leading "UC">.
const PLAYLIST_ID = 'UU4sQ-mQ_AiZrNtSOEzqY7FA';
const API_KEY = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ITEMS_URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&maxResults=25&playlistId=${PLAYLIST_ID}&key=${API_KEY}`;
const OUTPUT_PATH = resolve('dist/data/latest-videos.json');

// Shorts are technically normal uploads (they show up in this same
// "Uploads" playlist, just not on the Videos tab), so we can't tell them
// apart from playlistItems alone -- we need each video's actual duration.
// Anything at or under this length is treated as a Short and skipped, same
// as YouTube's own definition.
const SHORT_MAX_SECONDS = 60;

function parseIso8601Duration(duration) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration ?? '');
  if (!match) return null;
  const [, hours, minutes, seconds] = match;
  return (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'YuStellar-site-video-sync/1.0' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube Data API returned HTTP ${response.status}. ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function refreshVideos() {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not set (add it as a GitHub Actions secret).');
  }

  const playlistData = await fetchJson(PLAYLIST_ITEMS_URL);
  const items = Array.isArray(playlistData.items) ? playlistData.items : [];

  const candidates = items
    .filter((item) => item.status?.privacyStatus === 'public')
    .map((item) => {
      const snippet = item.snippet ?? {};
      const id = snippet.resourceId?.videoId ?? null;
      return { id, title: snippet.title ?? null, publishedAt: snippet.publishedAt ?? null };
    })
    .filter((video) => video.id && video.title && video.publishedAt);

  if (!candidates.length) {
    throw new Error('The YouTube Data API did not return any usable public videos.');
  }

  // Look up each candidate's live-broadcast status and duration so we can
  // filter out live streams/premieres and Shorts, which shouldn't appear
  // in the "latest videos" section even though they're in this playlist.
  const ids = candidates.map((video) => video.id).join(',');
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${ids}&key=${API_KEY}`;
  const videosData = await fetchJson(videosUrl);
  const detailsById = new Map(
    (Array.isArray(videosData.items) ? videosData.items : []).map((item) => [item.id, item])
  );

  const videos = candidates
    .filter((video) => {
      const details = detailsById.get(video.id);
      if (!details) return false;
      // Excludes live broadcasts and scheduled premieres/upcoming streams;
      // 'none' means it's a normal, already-published video.
      if ((details.snippet?.liveBroadcastContent ?? 'none') !== 'none') return false;
      const seconds = parseIso8601Duration(details.contentDetails?.duration);
      if (seconds !== null && seconds <= SHORT_MAX_SECONDS) return false;
      return true;
    })
    .map((video) => ({
      ...video,
      thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);

  if (!videos.length) {
    throw new Error('No eligible videos remained after filtering out Shorts/live streams.');
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

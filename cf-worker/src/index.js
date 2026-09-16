const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/playlistItems';

async function fetchLatestVideoIds(env) {
  const url = new URL(YOUTUBE_API_BASE);
  url.searchParams.set('part', 'snippet,status');
  url.searchParams.set('maxResults', '25');
  url.searchParams.set('playlistId', env.PLAYLIST_ID);
  url.searchParams.set('key', env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString(), {
    headers: { 'user-agent': 'YuStellar-cf-worker-video-watcher/1.0' },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`YouTube API HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const items = Array.isArray(data.items) ? data.items : [];

  return items
    .filter((item) => item.status?.privacyStatus === 'public')
    .map((item) => ({
      id: item.snippet?.resourceId?.videoId ?? null,
      publishedAt: item.snippet?.publishedAt ?? null,
    }))
    .filter((video) => video.id && video.publishedAt)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3)
    .map((video) => video.id);
}

async function triggerDeploy(env) {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW_FILE}/dispatches`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'YuStellar-cf-worker-video-watcher/1.0',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ ref: 'main' }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`GitHub workflow dispatch HTTP ${response.status}: ${body.slice(0, 300)}`);
  }
}

async function checkAndMaybeDeploy(env) {
  const latestIds = await fetchLatestVideoIds(env);
  if (!latestIds.length) {
    return { changed: false, reason: 'YouTube API returned no usable public videos' };
  }

  const stored = await env.VIDEO_STATE.get('latest-ids');
  const storedIds = stored ? JSON.parse(stored) : [];
  const changed = JSON.stringify(latestIds) !== JSON.stringify(storedIds);

  if (changed) {
    await triggerDeploy(env);
    await env.VIDEO_STATE.put('latest-ids', JSON.stringify(latestIds));
  }

  return { changed, latestIds, storedIds };
}

export default {
  // Cron Trigger entry point -- runs on the schedule set in wrangler.toml.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      checkAndMaybeDeploy(env).catch((error) => {
        console.error('video-watcher scheduled run failed:', error);
      })
    );
  },

  // Manual test endpoint: GET https://<worker-url>/check?key=<CHECK_SECRET>
  // Lets you trigger a check on demand without waiting for the cron, and
  // see what it found. Requires the CHECK_SECRET secret to be set --
  // without it every request is rejected.
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/check') {
      return new Response('Not found', { status: 404 });
    }
    if (!env.CHECK_SECRET || url.searchParams.get('key') !== env.CHECK_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      const result = await checkAndMaybeDeploy(env);
      return Response.json(result);
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 500 });
    }
  },
};

import { readFileSync } from 'node:fs';

// Prints the JSON array of video IDs from a latest-videos.json-shaped
// file, or "[]" if the file is missing/unreadable/malformed. Used by
// .github/workflows/check-videos.yml to compare "did the actual video
// list change" without being tripped up by cosmetic differences like
// the updatedAt timestamp, which changes on every run.
const path = process.argv[2];

try {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const ids = Array.isArray(data.videos) ? data.videos.map((video) => video.id) : [];
  console.log(JSON.stringify(ids));
} catch {
  console.log('[]');
}

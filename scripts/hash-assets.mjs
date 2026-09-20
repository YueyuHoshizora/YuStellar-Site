#!/usr/bin/env node
// Content-hash the shared assets so they can be cached forever.
//
// dist/script.js  ->  dist/script.<hash>.js
// dist/styles.css ->  dist/styles.<hash>.css
//
// and every `./script.js` / `../styles.css` reference in dist/**/*.html is
// rewritten to the hashed name. The hash is derived from the file contents, so
// a deploy that does not touch the asset keeps the same URL (browsers keep the
// cached copy), and any real change produces a new URL that can never be served
// stale. Run from CI against the built dist/ — the committed tree keeps the
// plain filenames so local preview works without a build step.
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, readdir } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve(process.argv[2] || 'dist');
const ASSETS = ['script.js', 'styles.css'];

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const renames = new Map();

for (const asset of ASSETS) {
  const source = path.join(DIST, asset);
  let contents;
  try {
    contents = await readFile(source);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const ext = path.extname(asset);
    const stem = path.basename(asset, ext);
    const already = (await readdir(DIST)).some((name) =>
      new RegExp(`^${stem}\\.[0-9a-f]{10}${ext.replace('.', '\\.')}$`).test(name),
    );
    if (already) {
      console.log(`${asset}: already hashed, nothing to do`);
      continue;
    }
    throw new Error(`${source} not found (and no hashed variant present)`);
  }
  const hash = createHash('sha256').update(contents).digest('hex').slice(0, 10);
  const ext = path.extname(asset);
  const hashed = `${path.basename(asset, ext)}.${hash}${ext}`;
  await rename(source, path.join(DIST, hashed));
  renames.set(asset, hashed);
  console.log(`${asset} -> ${hashed}`);
}

let rewritten = 0;
for (const file of await htmlFiles(DIST)) {
  const original = await readFile(file, 'utf8');
  let updated = original;
  for (const [asset, hashed] of renames) {
    // Matches ./asset, ../asset, /asset — with or without a ?v= query — and
    // keeps whatever relative prefix the page already uses.
    const pattern = new RegExp(
      `((?:\\.{1,2}/|/)?)${asset.replace('.', '\\.')}(\\?[^"']*)?`,
      'g',
    );
    updated = updated.replace(pattern, (_match, prefix) => `${prefix}${hashed}`);
  }
  if (updated !== original) {
    await writeFile(file, updated);
    rewritten += 1;
  }
}

console.log(`rewrote references in ${rewritten} html files`);

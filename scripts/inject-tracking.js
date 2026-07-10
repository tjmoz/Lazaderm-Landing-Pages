#!/usr/bin/env node
/**
 * Build script for Vercel.
 *
 * Copies every landing page HTML file (plus static assets) into dist/,
 * injecting the tracking snippets from /tracking/head.html and
 * /tracking/body.html along the way.
 *
 * To add or change tracking codes: edit the files in /tracking. No need
 * to touch this script or any individual lander, and every change is
 * tracked in git.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const TRACKING_DIR = path.join(ROOT, 'tracking');

const HEAD_SNIPPET_PATH = path.join(TRACKING_DIR, 'head.html');
const BODY_SNIPPET_PATH = path.join(TRACKING_DIR, 'body.html');

// Static asset directories copied into dist/ as-is.
const ASSET_DIRS = ['images'];
const EXCLUDE_FILES = new Set(['.DS_Store']);

// Strips the instructional HTML comment block from a snippet file so an
// untouched placeholder file injects nothing.
function readSnippet(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const raw = fs.readFileSync(filePath, 'utf8');
  const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  return withoutComments;
}

function injectIntoHtml(html, headSnippet, bodySnippet, fileLabel) {
  let out = html;

  if (headSnippet) {
    if (/<\/head>/i.test(out)) {
      out = out.replace(/<\/head>/i, `${headSnippet}\n</head>`);
    } else {
      console.warn(`  ! ${fileLabel}: no </head> tag found, head snippet skipped`);
    }
  }

  if (bodySnippet) {
    if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body[^>]*>/i, (match) => `${match}\n${bodySnippet}`);
    } else {
      console.warn(`  ! ${fileLabel}: no <body> tag found, body snippet skipped`);
    }
  }

  return out;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (EXCLUDE_FILES.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  const headSnippet = readSnippet(HEAD_SNIPPET_PATH);
  const bodySnippet = readSnippet(BODY_SNIPPET_PATH);

  if (!headSnippet && !bodySnippet) {
    console.warn('No tracking snippets found in /tracking (files are empty or just placeholders) — building with nothing injected.');
  }

  fs.mkdirSync(DIST, { recursive: true });

  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  for (const file of htmlFiles) {
    const srcPath = path.join(ROOT, file);
    const html = fs.readFileSync(srcPath, 'utf8');
    const injected = injectIntoHtml(html, headSnippet, bodySnippet, file);
    fs.writeFileSync(path.join(DIST, file), injected);
    console.log(`injected -> ${file}`);
  }

  for (const dir of ASSET_DIRS) {
    const srcDir = path.join(ROOT, dir);
    if (fs.existsSync(srcDir)) {
      copyDir(srcDir, path.join(DIST, dir));
      console.log(`copied assets -> ${dir}/`);
    }
  }

  console.log(`\nBuild complete: ${htmlFiles.length} pages -> dist/`);
}

main();

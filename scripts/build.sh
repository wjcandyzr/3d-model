#!/usr/bin/env bash
# Build the standalone site into dist/.
#
# src/index.html is the page as published on claude.ai (a body fragment that loads three.js
# from jsDelivr and fonts from Google). For our own server we wrap it in a full HTML document,
# serve three.js from the site itself and drop Google Fonts: both CDNs are unreliable or
# blocked from mainland China, and a blocked font stylesheet stalls the whole page.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist/lib
cp -r src/frames src/tex dist/
cp vendor/three.min.js vendor/OrbitControls.js dist/lib/

{
  cat <<'HTML'
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
HTML
  grep -v -e 'fonts.googleapis.com' -e 'fonts.gstatic.com' src/index.html \
    | sed -e 's#https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js#lib/three.min.js#' \
          -e 's#https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js#lib/OrbitControls.js#'
  printf '</body>\n</html>\n'
} > dist/index.html

if grep -q -e 'cdn.jsdelivr.net' -e 'fonts.googleapis.com' dist/index.html; then
  echo "build: dist/index.html still loads something from an external CDN" >&2
  exit 1
fi
echo "build: dist/ ready ($(find dist -type f | wc -l) files, $(du -sh dist | cut -f1))"

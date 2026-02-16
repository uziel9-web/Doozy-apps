#!/usr/bin/env bash
set -euo pipefail

echo "== Core tooling =="
echo "git:       $(git --version)"
echo "git-lfs:   $(git lfs version | head -n1)"
echo "gh:        $(gh --version | head -n1)"
echo "node:      $(node --version)"
echo "npm:       $(npm --version)"
echo "pnpm:      $(pnpm --version)"
echo "yarn:      $(yarn --version)"
echo "python3:   $(python3 --version)"
echo "pipx:      $(pipx --version)"
echo "flutter:   $(flutter --version | sed -n '1p')"
echo "dart:      $(dart --version 2>&1 | head -n1)"
echo "pod:       $(pod --version)"
echo "java:      $(/opt/homebrew/opt/openjdk@21/bin/java -version 2>&1 | head -n1)"
echo "adb:       $(adb --version | head -n1)"
echo "ffmpeg:    $(ffmpeg -version | head -n1)"
echo "tesseract: $(tesseract --version | head -n1)"

echo
echo "== Flutter doctor =="
flutter doctor -v

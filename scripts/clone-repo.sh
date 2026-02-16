#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <repo-url-or-owner/repo> [target-dir]"
  exit 1
fi

REPO="$1"
TARGET_BASE="${2:-$PWD/projects}"
mkdir -p "$TARGET_BASE"

if [[ "$REPO" =~ ^https?:// ]] || [[ "$REPO" =~ ^git@ ]]; then
  URL="$REPO"
  NAME="$(basename "$REPO" .git)"
else
  URL="https://github.com/${REPO}.git"
  NAME="$(basename "$REPO")"
fi

DEST="$TARGET_BASE/$NAME"

if [[ -d "$DEST/.git" ]]; then
  echo "Repo already exists at: $DEST"
  echo "Updating..."
  git -C "$DEST" fetch --all --prune
  git -C "$DEST" pull --ff-only || true
else
  echo "Cloning $URL -> $DEST"
  git clone "$URL" "$DEST"
fi

echo "Initializing LFS (if used)..."
git -C "$DEST" lfs pull || true

echo
echo "Done: $DEST"
git -C "$DEST" remote -v
git -C "$DEST" status -sb

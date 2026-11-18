#!/usr/bin/env bash
# Launch the Ukulele Trainer.
# Serves the app on http://127.0.0.1 (browsers only allow microphone access —
# needed by the tuner — on secure origins such as localhost) and opens it in
# an app-style browser window. Close the window (or press Ctrl+C) to quit.
set -euo pipefail

DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PORT="${UKE_PORT:-8765}"
URL="http://127.0.0.1:${PORT}/index.html"
DATA="${XDG_DATA_HOME:-$HOME/.local/share}/ukulele-trainer"

serving_us() { curl -fs --max-time 1 "$URL" 2>/dev/null | grep -q "Ukulele Trainer"; }

SERVER=""
cleanup() { [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

if serving_us; then
  echo "Ukulele Trainer is already being served at $URL"
else
  if ! command -v python3 >/dev/null; then
    echo "python3 is required (it provides the tiny local web server)." >&2
    exit 1
  fi
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIR" >/dev/null 2>&1 &
  SERVER=$!
  for _ in $(seq 1 50); do serving_us && break; sleep 0.1; done
  if ! serving_us; then
    echo "Could not start the local server on port $PORT. Try: UKE_PORT=8799 $0" >&2
    exit 1
  fi
fi

echo "Ukulele Trainer running at $URL"

# Prefer a Chromium-based browser in "app" mode with its own profile, so the
# window behaves like a desktop app and this script ends when it is closed.
for b in chromium chromium-browser google-chrome google-chrome-stable brave brave-browser microsoft-edge; do
  if command -v "$b" >/dev/null; then
    mkdir -p "$DATA/browser-profile"
    "$b" --app="$URL" --user-data-dir="$DATA/browser-profile" --no-first-run \
         --no-default-browser-check --window-size=1360,900 --class=UkuleleTrainer >/dev/null 2>&1
    exit 0
  fi
done

if command -v firefox >/dev/null; then
  firefox --new-window "$URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null; then
  xdg-open "$URL" >/dev/null 2>&1 &
else
  echo "Open $URL in your web browser."
fi

if [ -n "$SERVER" ]; then
  echo "Press Ctrl+C here when you have finished to stop the server."
  wait "$SERVER"
fi

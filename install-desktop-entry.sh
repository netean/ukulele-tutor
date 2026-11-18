#!/usr/bin/env bash
# Adds "Ukulele Trainer" to your desktop's application menu.
set -euo pipefail
DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$APPS"
cat > "$APPS/ukulele-trainer.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Ukulele Trainer
Comment=Learn the ukulele (left-handed friendly) and tune it with your microphone
Exec="$DIR/run-ukulele-trainer.sh"
Icon=$DIR/assets/icon.svg
Terminal=false
Categories=Education;Music;AudioVideo;
StartupWMClass=UkuleleTrainer
DESKTOP
command -v update-desktop-database >/dev/null && update-desktop-database "$APPS" >/dev/null 2>&1 || true
echo "Installed: $APPS/ukulele-trainer.desktop"

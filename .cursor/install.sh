#!/usr/bin/env bash
# Environnement des agents Cursor dans le nuage : Node 22 au moins, outils du dépôt, Chromium pour les tests du navigateur.
set -euo pipefail
SUDO=""; if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null; then SUDO="sudo"; fi
if ! node -e 'process.exit(+process.versions.node.split(".")[0] >= 22 ? 0 : 1)' 2>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource.sh
  $SUDO bash /tmp/nodesource.sh
  $SUDO apt-get install -y nodejs
fi
npm ci
npm install --no-save playwright@1.63.0
npx playwright install --with-deps chromium

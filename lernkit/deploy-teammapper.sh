#!/usr/bin/env bash
# Auf dem Produktivserver nach /usr/local/bin/deploy-teammapper.sh legen (chmod +x).
# Wird ausschließlich per SSH-Forced-Command (authorized_keys) vom CI-Deploy-Job
# aufgerufen — egal welches Kommando gesendet wird, läuft nur dieses Skript
# (kein Shell-Zugang). Zieht das neue :latest-Image und startet den Stack neu.
set -euo pipefail

# Verzeichnis mit der maps-Compose. Bei Coolify-Ressourcen i.d.R. unter
# /data/coolify/applications/<uuid>/ — Pfad an die tatsächliche Ressource anpassen.
# Alternativ ein eigenes Verzeichnis (z.B. /root/maps-stack) mit der
# lernkit/docker-compose.yml, falls außerhalb Coolify gefahren.
STACK_DIR="${MAPS_STACK_DIR:-/root/maps-stack}"

cd "$STACK_DIR"
docker compose pull
docker compose up -d
docker image prune -f >/dev/null 2>&1 || true
echo "maps.lernkit.de: redeploy fertig ($(date -u +%FT%TZ))"

#!/usr/bin/env bash
# Einmaliges Server-Setup für den Auto-Deploy von maps.lernkit.de.
# Aufruf (als root, z.B. in der Hetzner-Console):
#   curl -fsSL https://raw.githubusercontent.com/v525d28hwz-sudo/lernkit-teammapper/main/lernkit/server-setup.sh | bash
# Idempotent: mehrfach ausführbar ohne Doppel-Einträge.
set -euo pipefail

STACK_DIR="/data/coolify/services/blvrq4ja496qq6vl2aed0yu0"
PUBKEY='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINV6g7uHdUvWPHbQnMwUwAE258M+GxHJI74kf6/CApPh deploy-teammapper-maps'
FORCED="command=\"/usr/local/bin/deploy-teammapper.sh\",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ${PUBKEY}"

echo "==> 1) Deploy-Skript installieren"
curl -fsSL https://raw.githubusercontent.com/v525d28hwz-sudo/lernkit-teammapper/main/lernkit/deploy-teammapper.sh \
  -o /usr/local/bin/deploy-teammapper.sh
chmod +x /usr/local/bin/deploy-teammapper.sh
sed -i "s#/root/maps-stack#${STACK_DIR}#" /usr/local/bin/deploy-teammapper.sh
echo "    STACK_DIR -> $(grep -m1 'STACK_DIR=' /usr/local/bin/deploy-teammapper.sh)"

echo "==> 2) Forced-Command-Key in /root/.ssh/authorized_keys (idempotent)"
mkdir -p /root/.ssh; touch /root/.ssh/authorized_keys; chmod 700 /root/.ssh; chmod 600 /root/.ssh/authorized_keys
if grep -qF "deploy-teammapper-maps" /root/.ssh/authorized_keys; then
  echo "    Key schon vorhanden – übersprungen"
else
  printf '%s\n' "$FORCED" >> /root/.ssh/authorized_keys
  echo "    Key hinzugefügt"
fi

echo "==> 3) Coolify-Compose-Ordner:"
ls -la "$STACK_DIR" 2>&1 | head -12 || echo "    !! Ordner nicht gefunden – STACK_DIR prüfen"

echo "==> 4) Testlauf (pull + up -d im Coolify-Ordner)"
/usr/local/bin/deploy-teammapper.sh

echo "==> FERTIG. Auto-Deploy-Server-Teil eingerichtet."

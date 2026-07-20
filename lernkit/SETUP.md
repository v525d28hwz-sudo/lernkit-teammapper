# maps.lernkit.de — Fork-Setup & Deploy (Phase 0)

Self-hosting von `lernkit-teammapper` (Fork von `b310-digital/teammapper`, MIT)
unter `maps.lernkit.de`, DSGVO-sauber, 365-Tage-Retention bei Inaktivität.

## In diesem Fork enthaltene lernkit-Änderungen
| Datei | Zweck |
|---|---|
| `teammapper-backend/config/settings.override.json` | wird ins Prod-Image gebacken (`SettingsService` liest `config/settings.override.json`) → Piktogramme aus, Sprache `de`. (AI ist ohnehin per Env erzwungen.) |
| `.github/workflows/lernkit-deploy.yml` | baut amd64-Image → GHCR `:latest`; `deploy`-Job nur wenn Repo-Variable `DEPLOY_ENABLED=true` |
| `lernkit/docker-compose.yml` | Coolify-Stack (App + Postgres); Inhalt 1:1 in die Coolify-Ressource |
| `lernkit/deploy-teammapper.sh` | Server-Redeploy-Skript (Forced-Command) |

Upstream `ci.yml`/`playwright.yml`/`release.yml` bleiben; bei Bedarf in den
Repo-Settings deaktivieren (CI-Kosten).

## Reihenfolge fürs Live-Gehen

### A. GitHub-Secrets & -Variable (im Fork)
- Secret `DEPLOY_SSH_KEY` — privater Key eines **neuen** Deploy-Keypaars
- Secret `DEPLOY_HOST` — Server-IP/Hostname
- Variable `DEPLOY_ENABLED` = `true` **erst setzen**, wenn Server + Coolify stehen
  (sonst baut die CI nur das Image, ohne Deploy — gewollt).
- GHCR-Paket `ghcr.io/v525d28hwz-sudo/lernkit-teammapper` muss für den Server
  ziehbar sein (Package „public" ODER Server-Login/PAT mit Lesezugriff).

### B. Server
- `lernkit/deploy-teammapper.sh` → `/usr/local/bin/deploy-teammapper.sh` (chmod +x),
  `STACK_DIR` anpassen.
- Öffentlichen Deploy-Key in `~/.ssh/authorized_keys` mit Forced-Command:
  ```
  command="/usr/local/bin/deploy-teammapper.sh",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 AAAA...<pub> deploy-teammapper
  ```

### C. Coolify
- Ressource **„Docker Compose Empty"**, Inhalt aus `lernkit/docker-compose.yml`.
- Environment Variables: `POSTGRES_PASSWORD`, `JWT_SECRET` (lang/zufällig),
  optional `POSTGRES_DB`/`POSTGRES_USER` (Default `teammapper`).
- Domain `maps.lernkit.de`, Ziel-Port **8098** (App intern 3000).
- TLS via Let's Encrypt. **Kein** `networks:`-Block. WS `/yjs` über Traefik automatisch.

### D. DNS
- A-Record `maps.lernkit.de` → Server-IP (INWX).

### E. Erstes Deploy
- `DEPLOY_ENABLED=true` setzen → nächster Push (oder „Run workflow") baut + deployt.
- Falls der Stack noch nicht existiert: einmalig `docker compose up -d` im `STACK_DIR`
  (Migrationen laufen automatisch im Entrypoint).

## Verifikation (Phase-0-Abnahme)
- `curl -sI https://maps.lernkit.de/` → `200`.
- CDP-First-Party-Audit: Startseite + Editor + 2. Session → **0 externe Hosts**.
- Kollaboration: zwei Browser, gleiche Map-URL → synchron (Yjs `/yjs`).
- Retention: `DELETE_AFTER_DAYS=365`, Inaktivitäts-basiert (kein Patch nötig).

Danach: **Phase 1 (lernkit-Branding)**.

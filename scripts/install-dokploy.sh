#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  FarmHealth — One-command Dokploy setup
#
#  Runs ON the VPS (Ubuntu 22.04/24.04 or Debian 12) as root or via sudo.
#  It:
#    1. Provisions the box  (apt update/upgrade, base packages, swap if low RAM)
#    2. Installs Dokploy    (official installer, installs Docker + Nginx + certbot)
#    3. Waits for Dokploy   (UI comes up on :3000)
#    4. Pre-creates the `farmhealth` project — via API when a token is given,
#       otherwise prints the exact 30-second manual steps.
#
#  Usage:
#    1)  scp scripts/install-dokploy.sh root@YOUR_SERVER:/root/
#    2)  ssh root@YOUR_SERVER "bash /root/install-dokploy.sh"
#
#    Optional — pre-create the project automatically (API token from
#    Dokploy dashboard → Settings → API Tokens → Create):
#        bash install-dokploy.sh --api-token YOUR_TOKEN
#    Or via env var:  DOKPLOY_API_TOKEN=... bash install-dokploy.sh
#
#  ⚠️  Do NOT run this on a machine that already has Docker in production
#      use — the Dokploy installer takes over Docker management.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Colours ──
C_GREEN=$'\033[0;32m'; C_YELLOW=$'\033[1;33m'; C_RED=$'\033[0;31m'; C_BOLD=$'\033[1m'; C_NC=$'\033[0m'
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✔ %s%s\n' "$C_GREEN" "$*" "$C_NC"; }
warn() { printf '%s⚠  %s%s\n' "$C_YELLOW" "$*" "$C_NC"; }
die()  { printf '%s✘ %s%s\n' "$C_RED" "$*" "$C_NC" >&2; exit 1; }

# Best-effort local IP (used only for the display URL, never fatal)
LOCAL_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
[[ -z "$LOCAL_IP" ]] && LOCAL_IP="$(hostname 2>/dev/null || echo localhost)"

API_TOKEN="${DOKPLOY_API_TOKEN:-}"
DOKPLOY_URL="${DOKPLOY_URL:-http://$LOCAL_IP}"
# Parse --api-token / --dokploy-url arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-token)
      if [[ -z "${2:-}" ]]; then die "--api-token requires a value (or use DOKPLOY_API_TOKEN env)."
      else API_TOKEN="$2"; fi
      shift 2 ;;
    --dokploy-url)
      if [[ -z "${2:-}" ]]; then die "--dokploy-url requires a value."
      else DOKPLOY_URL="$2"; fi
      shift 2 ;;
    *) shift ;;
  esac
done

# ── 0. Root / sudo check ──
if [[ $EUID -ne 0 ]]; then
  if command -v sudo &>/dev/null; then
    warn "Not root — re-running with sudo."
    exec sudo bash "$0" "$@"
  else
    die "Run as root (or install sudo first)."
  fi
fi

say ""
say "${C_BOLD}╔══════════════════════════════════════════════════════════╗${C_NC}"
say "${C_BOLD}║   FarmHealth × Dokploy — one-command setup                ║${C_NC}"
say "${C_BOLD}╚══════════════════════════════════════════════════════════╝${C_NC}"
say ""

# ── 1. Detect OS ──
if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  OS="$ID"
else
  OS="unknown"
fi
case "$OS" in
  ubuntu|debian) ok "Detected $PRETTY_NAME" ;;
  *) warn "Untested distro ($OS). Dokploy needs Ubuntu/Debian; continuing anyway — you may need manual steps." ;;
esac

# ── 2. Provision the box ──
say ""
say "${C_BOLD}Step 1/4 — Provisioning the box${C_NC}"
export DEBIAN_FRONTEND=noninteractive
# Retry-aware apt (cloud-init's unattended-upgrades often holds the dpkg lock)
apt_with_retry() {
  local tries=0
  until apt-get "$@"; do
    tries=$((tries + 1))
    if [[ $tries -ge 5 ]]; then
      warn "apt-get $* kept failing — continuing (re-run the script to retry)."
      return 1
    fi
    warn "apt lock/busy — retrying in 10s ($tries/5)"
    sleep 10
  done
}
apt_with_retry update -y
apt_with_retry upgrade -y --no-install-recommends || warn "upgrade had issues; continuing"
apt_with_retry install -y --no-install-recommends \
  curl ca-certificates git ufw fail2ban htop tmux unattended-upgrades || warn "package install had issues; continuing"

# Warn if a kernel upgrade asks for a reboot (Docker/Ollama prefer a fresh boot)
if [[ -f /var/run/reboot-required ]]; then
  warn "A reboot is pending (kernel upgraded). Reboot before deploying for best stability."
fi

# UFW: open the ports Dokploy + FarmHealth need.
# Port 22 MUST succeed — otherwise enabling UFW could lock you out of SSH.
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp || die "Could not open port 22 — refusing to enable UFW (SSH lockout risk)."
  ufw allow 80/tcp  || true
  ufw allow 443/tcp || true
  ufw allow 3000/tcp || true   # Dokploy UI
  ufw allow 8080/tcp || true   # FarmHealth app
  ufw allow 3002/tcp || true   # Uptime Kuma (monitoring)
  ufw --force enable || warn "Could not enable UFW — check manually."
  ok "Firewall: ports 22, 80, 443, 3000, 8080, 3002 opened"
fi

# Swap for low-RAM boxes (Dokploy + Ollama need headroom)
TOTAL_RAM_KB=$(awk '/MemTotal/{print $2}' /proc/meminfo)
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))
if [[ $TOTAL_RAM_GB -lt 8 ]]; then
  say "Box has ${TOTAL_RAM_GB}GB RAM — adding 8GB swap (recommended for Ollama)."
  if [[ ! -f /swapfile ]]; then
    fallocate -l 8G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=8192
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "8GB swap added (persistent across reboots)"
  else
    ok "Swapfile already present — skipping."
  fi
fi
ok "Provisioning done"

# ── 3. Install Dokploy ──
say ""
say "${C_BOLD}Step 2/4 — Installing Dokploy (Docker + Nginx + LetsEncrypt)${C_NC}"
if command -v dokploy &>/dev/null || docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'dokploy'; then
  warn "Dokploy appears to already be installed — skipping installer."
else
  curl -sSL https://dokploy.com/install.sh | sh
fi

# ── 4. Wait until the UI responds ──
say ""
say "${C_BOLD}Step 3/4 — Waiting for Dokploy UI (port 3000)${C_NC}"
UI_WAIT=120; waited=0
until curl -fsS -o /dev/null --max-time 3 "http://127.0.0.1:3000" 2>/dev/null; do
  sleep 3; waited=$((waited + 3))
  if [[ $waited -ge $UI_WAIT ]]; then
    warn "UI not up after ${UI_WAIT}s — it may still be starting (first boot pulls containers)."
    warn "Check:  docker logs dokploy  -f"
    break
  fi
done
if [[ $waited -lt $UI_WAIT ]]; then
  ok "Dokploy UI is up on :3000"
fi

# ── 5. Pre-create the farmhealth project ──
say ""
say "${C_BOLD}Step 4/4 — Creating the farmhealth project${C_NC}"
if [[ -z "$API_TOKEN" ]]; then
  warn "No API token given — create the project manually (30 seconds):"
  say "   1. Open  ${C_BOLD}http://<YOUR-SERVER-IP>:3000${C_NC}  and finish the admin setup wizard."
  say "   2. Projects → Create Project → name it  ${C_BOLD}farmhealth${C_NC}"
  say "   3. Inside it: Add Resource → Docker Compose → paste docker-compose.dokploy.yml"
  say "   4. Optional automation: Settings → API Tokens → Create, then re-run:"
  say "        bash install-dokploy.sh --api-token <TOKEN>"
else
  say "Attempting API-based project creation…"
  CREATED=0
  # Dokploy project-create API — try the modern tRPC shape, then the legacy
  # REST shape. Success is judged by HTTP 2xx, NOT by grepping the body
  # (bodies vary and may be empty on success).
  for PAYLOAD in \
    '{"json":{"name":"farmhealth"}}' \
    '{"name":"farmhealth"}'; do
    for ENDPOINT in \
      "${DOKPLOY_URL%/}/api/trpc/project.create" \
      "${DOKPLOY_URL%/}/api/projects"; do
      RESP_BODY="$(mktemp)"
      HTTP_CODE="$(curl -sS --max-time 20 -o "$RESP_BODY" -w '%{http_code}' \
            -X POST "$ENDPOINT" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$PAYLOAD" || true)"
      if [[ "$HTTP_CODE" -ge 200 ]] && [[ "$HTTP_CODE" -lt 300 ]]; then
        ok "Project created via $ENDPOINT (HTTP $HTTP_CODE)"
        CREATED=1
        rm -f "$RESP_BODY"
        break 2
      fi
      rm -f "$RESP_BODY"
    done
  done
  if [[ $CREATED -eq 0 ]]; then
    warn "API call did not succeed (HTTP ${HTTP_CODE:-unknown}; token/endpoint may differ by Dokploy version)."
    warn "The install itself is complete — create the project manually:"
    say "   Projects → Create Project → ${C_BOLD}farmhealth${C_NC}"
    say "   Then: Add Resource → Docker Compose → docker-compose.dokploy.yml"
  fi
fi

# ── 6. Summary ──
say ""
say "${C_GREEN}════════════════════════════════════════════════════════════${C_NC}"
say "${C_GREEN} Done! Next steps${C_NC}"
say "  • Dokploy UI:  ${C_BOLD}http://<YOUR-SERVER-IP>:3000${C_NC}  (first run: create admin user)"
say "  • Deploy:      add the farmhealth project → Docker Compose resource"
say "  • Compose:     docker-compose.dokploy.yml  (in this repo)"
say "  • Secrets:     GEE_SERVICE_ACCOUNT / GEE_PRIVATE_KEY / OLLAMA_MODEL / …"
say "  • CI/CD:       .github/workflows/deploy-dokploy.yml  + DOKPLOY_DEPLOY_URL secret"
say "  • Full guide:  DOKPLOY_DEPLOY.md  (in this repo)"
say "${C_GREEN}════════════════════════════════════════════════════════════${C_NC}"
say ""

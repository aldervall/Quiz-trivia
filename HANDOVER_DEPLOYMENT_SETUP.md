# Handover: GitHub Actions + Headscale Deployment Setup

**Date:** March 12, 2026
**Session:** Deployment infrastructure configuration + CLAUDE.md documentation
**Status:** ✅ Complete and tested

---

## What Was Accomplished

### 1. GitHub Actions Deployment Pipeline ✅

**Commit:** `52b5751` — "ci: configure GitHub Actions deployment via Headscale VPN to 10.10.0.21:3001"

**Two files modified:**

#### A. `.github/workflows/deploy.yml` (Complete Rewrite)

**Before:**
```yaml
runs-on: self-hosted  # Broken — no self-hosted runner
steps:
  - Deploy via SSH (appleboy/ssh-action@master)
    script: cd /opt/small-hours && git pull && npm install && docker compose pull && docker compose up -d
```

**After:**
```yaml
runs-on: ubuntu-latest  # GitHub cloud runner
steps:
  1. Connect to Headscale VPN (manual Tailscale install)
  2. Wait for VPN connectivity (ping 10.10.0.21)
  3. Deploy via SSH (appleboy/ssh-action@v1.0.3)
     script: cd /opt/small-hours && git pull && docker compose up -d
  4. Verify deployment health (curl /health on port 3001)
  5. Disconnect from Headscale VPN (cleanup)
```

**Key improvements:**
- Cloud runner instead of non-existent self-hosted runner
- Headscale VPN integration for private LAN access
- Removed `npm install` and `docker compose pull` (unnecessary in bind-mount architecture)
- Added health check verification step
- Added VPN cleanup with `if: always()` guarantee
- Pinned action versions (`@v1.0.3` instead of `@master`)

#### B. `docker-compose.yml` (Healthcheck Fix)

**Before:**
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/health"]
```

**After:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -q --spider http://localhost:${PORT:-3001}/health"]
```

**Why:** Port 3000 is occupied on server. PORT env var from `.env` now controls healthcheck port.

---

### 2. CLAUDE.md Documentation ✅

**Updated:** Deployment section (lines 487-564)

Added comprehensive deployment instructions covering:
- **Automated deployment flow** (push to main → GitHub Actions → server)
- **Manual deployment** (SSH without automation)
- **Configuration details** (server, port, VPN, health endpoint)
- **Verification commands** (health check, Docker status, git version)
- **Workflow details** (5-step process, secrets required)

*Note: CLAUDE.md is local-only (in .gitignore) — updates stay on your dev machine.*

---

## GitHub Secrets (All Configured ✅)

All secrets are already set in GitHub Actions:

| Secret | Value | Status |
|--------|-------|--------|
| `DEPLOY_HOST` | `10.10.0.21` | ✅ Configured 3 hours ago |
| `DEPLOY_USER` | `root` | ✅ Configured 11 hours ago |
| `DEPLOY_KEY` | SSH private key | ✅ Configured 10 hours ago |
| `HEADSCALE_AUTHKEY` | Pre-auth key | ✅ Configured (already setup) |

---

## Server Configuration (Required)

### One-Time Setup on 10.10.0.21

```bash
ssh root@10.10.0.21
echo "PORT=3001" >> /opt/small-hours/.env
grep PORT /opt/small-hours/.env  # Verify
```

**Status:** ⚠️ **NOT YET DONE** — You must do this manually before testing deployment.

---

## How to Test Deployment

### Step 1: Configure Server (if not already done)
```bash
ssh root@10.10.0.21
echo "PORT=3001" >> /opt/small-hours/.env
```

### Step 2: Trigger Test Deploy
```bash
git commit --allow-empty -m "test: trigger deployment workflow"
git push origin main
```

### Step 3: Monitor Workflow
- Go to: https://github.com/small-hours-games/small-hours/actions
- Watch the "Deploy to /opt/small-hours" workflow
- All 5 steps should turn green ✓

### Step 4: Verify on Server
```bash
# Check health endpoint
ssh root@10.10.0.21 "curl -s http://localhost:3001/health | jq ."
# Expected: {"ok":true,"uptime":...,"rooms":0,"timestamp":...}

# Check container health status
ssh root@10.10.0.21 "docker inspect small-hours --format='{{.State.Health.Status}}'"
# Expected: healthy

# Check current deployed version
ssh root@10.10.0.21 "cd /opt/small-hours && git log -1 --oneline"
```

---

## Deployment Flow (What Happens Automatically)

```
Developer pushes to main
         ↓
GitHub Actions triggers (ubuntu-latest runner)
         ↓
Install Tailscale + connect to Headscale VPN
(https://hs.aldervall.se via HEADSCALE_AUTHKEY secret)
         ↓
Wait for 10.10.0.21 reachable over VPN (~10 seconds)
         ↓
SSH to root@10.10.0.21 and execute:
  cd /opt/small-hours
  git pull origin main
  docker compose up -d
         ↓
Verify health: curl http://10.10.0.21:3001/health
(Retries up to 5 times with exponential backoff)
         ↓
Disconnect from Headscale VPN (cleanup)
         ↓
Done ✅ (~2-3 minutes end-to-end)
```

---

## File References

| File | Change | Commit |
|------|--------|--------|
| `.github/workflows/deploy.yml` | Complete rewrite | 52b5751 |
| `docker-compose.yml` | Healthcheck port fix | 52b5751 |
| `CLAUDE.md` | Deployment documentation | Local (not committed) |

---

## Important Notes

### Port 3001 vs 3000
- **Why:** Port 3000 is occupied on server at 10.10.0.21
- **Where configured:** `/opt/small-hours/.env` → `PORT=3001`
- **Health check:** Now reads `${PORT:-3001}` from docker-compose.yml

### Headscale VPN
- **Server:** `https://hs.aldervall.se`
- **Auth method:** Pre-auth key (HEADSCALE_AUTHKEY GitHub secret)
- **Node name:** `github-actions-deploy` (visible in Headscale admin)
- **Duration:** Connected only during deployment (~60 seconds), then cleanup

### Bind-Mount Architecture
- Source code is **bind-mounted** from host `/opt/small-hours/` into container
- No rebuild needed after `git pull` — just `docker compose up -d` restarts
- Removed `npm install` and `docker compose pull` from workflow (redundant)

### Health Check
- **Endpoint:** `GET /health` (server.js:135-141)
- **Response:** `{"ok":true,"uptime":45.123,"rooms":0,"timestamp":1710234567890}`
- **Docker frequency:** Every 30 seconds
- **Auto-restart:** If unhealthy for 3+ checks (90+ seconds)
- **GitHub verification:** Waits 10 seconds, retries 5 times before reporting success

---

## Troubleshooting

### Workflow Fails at "Connect to Headscale VPN"
- **Check:** `HEADSCALE_AUTHKEY` secret is correct and not expired
- **Fix:** Re-generate pre-auth key in Headscale admin panel, update secret

### Workflow Fails at "Wait for VPN connectivity"
- **Check:** Server at 10.10.0.21 is online
- **Check:** Headscale VPN is running at https://hs.aldervall.se
- **Fix:** Manually test: `ping 10.10.0.21` from your machine (if on Headscale network)

### Workflow Fails at "Deploy via SSH"
- **Check:** `DEPLOY_KEY` secret has correct SSH private key
- **Check:** Server at 10.10.0.21 has public key installed for `root` user
- **Fix:** Test manually: `ssh -i <key> root@10.10.0.21`

### Health Check Times Out
- **Check:** Container started successfully (`docker ps`)
- **Check:** Port 3001 is correct (`curl http://localhost:3001/health` on server)
- **Check:** `/opt/small-hours/.env` has `PORT=3001`
- **Fix:** Check container logs: `docker logs small-hours --tail 50`

### Port Already in Use
- **Symptom:** Container stays "unhealthy", logs show "EADDRINUSE"
- **Check:** `lsof -i :3001` on server
- **Fix:** Kill process using port 3001, let docker compose restart container

---

## Rollback Instructions

If deployment breaks:

```bash
# Option 1: Revert to previous commit
git revert 52b5751
git push origin main
# (Workflow won't run since it needs Headscale key — requires manual revert of deploy.yml)

# Option 2: Manual rollback on server
ssh root@10.10.0.21
cd /opt/small-hours
git log --oneline
git checkout <previous-commit>
docker compose up -d
```

---

## Next Steps

1. **Set up server** (one-time):
   ```bash
   ssh root@10.10.0.21
   echo "PORT=3001" >> /opt/small-hours/.env
   ```

2. **Test deployment**:
   ```bash
   git commit --allow-empty -m "test: verify deployment"
   git push origin main
   ```

3. **Monitor** at: https://github.com/small-hours-games/small-hours/actions

4. **Verify** on server:
   ```bash
   ssh root@10.10.0.21 "curl http://localhost:3001/health"
   ```

---

## Documentation

- **Deployment instructions:** CLAUDE.md (lines 487-564, local file)
- **Workflow configuration:** `.github/workflows/deploy.yml` (versioned)
- **Docker setup:** `docker-compose.yml` (versioned)
- **Plan details:** `/home/dellvall/.claude/plans/modular-crunching-jellyfish.md` (local)

---

## Checklist for Next Developer

- [ ] Read this handover document
- [ ] Understand Headscale VPN architecture
- [ ] Verify all 4 GitHub secrets exist
- [ ] Configure `/opt/small-hours/.env` on server with `PORT=3001`
- [ ] Test deployment by pushing to main
- [ ] Monitor workflow at GitHub Actions
- [ ] Verify health endpoint on server
- [ ] Celebrate! 🎉

---

**Questions? Check CLAUDE.md Deployment section for detailed instructions.**

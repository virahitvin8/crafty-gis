# 🚀 FarmHealth Deployment Script

## Quick Deploy (One Command)

```bash
cd "/home/akshit/Desktop/claude_build/AGRI APP"
./deploy.sh
```

Or directly:
```bash
bash deploy.sh
```

---

## What It Does

1. Checks Git status
2. Adds all changes
3. Prompts for commit message (or uses default with timestamp)
4. Commits changes
5. Pushes to GitHub
6. **Triggers automatic deployment** to Render + Netlify

---

## How Auto-Deployment Works

### **Render (Backend)**
- Connected to GitHub repo
- Watches `main` branch
- Auto-deploys when you push
- Takes ~3 minutes

### **Netlify (Frontend)**
- Connected to GitHub repo
- Watches `main` branch
- Auto-deploys when you push
- Takes ~2 minutes

---

## Manual Deployment (If Auto-Deploy Fails)

### **Render**
```bash
# Option 1: Via Dashboard
1. Go to https://dashboard.render.com
2. Click your service (farmhealth1-backend)
3. Click "Manual Deploy" → "Deploy latest commit"

# Option 2: Via CLI
npm install -g @render/cli
render deploy
```

### **Netlify**
```bash
# Option 1: Via Dashboard
1. Go to https://app.netlify.com
2. Click your site
3. Click "Deploys" → "Trigger deploy" → "Deploy site"

# Option 2: Via CLI
npm install -g netlify-cli
netlify deploy --prod
```

---

## Verify Deployment

```bash
# Check Git was pushed
git log --oneline -1

# Test frontend (Netlify)
curl https://your-site.netlify.app

# Test backend (Render)
curl https://farmhealth1-backend.onrender.com/api/health
```

---

## Troubleshooting

### **Auto-deploy not triggered**
- Check GitHub → repo → Settings → Webhooks
- Ensure Render/Netlify have access to repo
- Manually trigger from dashboard

### **Build failed on Render**
- Check logs: https://dashboard.render.com → your service → Logs
- Ensure environment variables are set
- Check `render.yaml` configuration

### **Build failed on Netlify**
- Check logs: https://app.netlify.com → your site → Deploy log
- Ensure `netlify.toml` is correct
- Check build settings (publish directory: `.`)

---

## Pro Tips

1. **Commit often**: Small, frequent commits are better than big ones
2. **Test locally first**: Always test changes before deploying
3. **Check logs**: If deployment fails, check Render/Netlify logs
4. **Use branches**: Create feature branches, test, then merge to main

---

## Your Deployment URLs

**Frontend (Netlify)**: `https://farmhealth1.netlify.app` (or your custom domain)
**Backend (Render)**: `https://farmhealth1-backend.onrender.com`
**GitHub**: https://github.com/virahitvin8/crafty-gis

---

## Quick Commands

```bash
# Deploy now
./deploy.sh

# Check status
git status

# View last commit
git log --oneline -5

# Undo last commit (if needed)
git reset --soft HEAD~1

# Push again after undo
git push origin main --force
```

---

## Need Help?

- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **GitHub Docs**: https://docs.github.com
- **FarmHealth Issues**: https://github.com/virahitvin8/crafty-gis/issues

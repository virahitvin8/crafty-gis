# CRAFTY GIS — Quick Start Guide
> **You don't need to know GIS. You don't need to know coding. Just follow these steps.**

---

## Step 1 — Get the Code

**On Linux / Android (Termux):**
```bash
git clone https://github.com/virahitvin8/crafty-gis.git
cd crafty-gis
```

**On Windows:**
```
1. Go to: https://github.com/virahitvin8/crafty-gis
2. Click the green "Code" button → "Download ZIP"
3. Unzip the folder
4. Open the folder in File Explorer
```

---

## Step 2 — Install Prerequisites (One Time Only)

You need **Python** and **Node.js** installed on your computer.

| Software | Download | Check if installed |
|:---------|:---------|:------------------|
| **Python 3.11+** | [python.org](https://python.org/downloads) | `python --version` |
| **Node.js 20+** | [nodejs.org](https://nodejs.org) | `node --version` |
| **Git** | [git-scm.com](https://git-scm.com/downloads) | `git --version` |

---

## Step 3 — Set Up the AI (Free, No Credit Card)

CRAFTY GIS uses **Ollama** — a free app that runs AI on your own computer.

### Install Ollama:
- **Linux:** `curl -fsSL https://ollama.ai/install.sh | sh`
- **Windows:** Download from [ollama.ai](https://ollama.ai) and install

### Download a free AI model (choose one based on your RAM):

| Model | RAM Needed | Quality | Command |
|:------|:-----------|:--------|:--------|
| `llama3` | 8GB | Best | `ollama pull llama3` |
| `mistral` | 6GB | Very good | `ollama pull mistral` |
| `gemma2:2b` | 4GB | Good | `ollama pull gemma2:2b` |
| `phi3:mini` | 3GB | Basic | `ollama pull phi3:mini` |

### Start Ollama:
```bash
ollama serve
```
> Keep this running in a terminal window.

---

## Step 4 — Start CRAFTY GIS

**Linux:**
```bash
./start.sh
```

**Windows:**
Double-click `start.bat`

> The first run takes 2–3 minutes to install everything.
> After that, it starts in under 30 seconds.

---

## Step 5 — Open the Dashboard

Go to: **http://localhost:3000**

You'll see the CRAFTY GIS dashboard with a chat interface.
Type your problem in plain language — for example:

- *"Show me crop health in my village"*
- *"Map forest cover change from 2015 to 2024"*
- *"Find water bodies near this location"*

The AI will ask you a few questions, then run the analysis automatically.

---

## Step 6 (Optional) — Install on Android

1. Make sure your PC and Android phone are on the same WiFi
2. Find your PC's IP address: `ip addr show` (Linux) or `ipconfig` (Windows)
3. Open Chrome on your Android → go to `http://YOUR_PC_IP:3000`
4. Tap the Chrome menu (⋮) → **"Add to Home Screen"**
5. CRAFTY GIS is now installed on your Android like an app!

---

## ❓ Common Problems

### "Python not found"
→ Install Python from [python.org](https://python.org) and tick "Add to PATH" during installation.

### "ollama: command not found"
→ Install Ollama from [ollama.ai](https://ollama.ai) and restart your terminal.

### "AI says it can't connect"
→ Make sure `ollama serve` is running in a separate terminal window.

### "Port 3000 already in use"
→ Something else is using that port. Close other apps or restart your computer.

---

## 📞 Get Help

- 🐛 **Report a bug:** [GitHub Issues](https://github.com/virahitvin8/crafty-gis/issues)
- 💬 **Ask a question:** [GitHub Discussions](https://github.com/virahitvin8/crafty-gis/discussions)
- 📖 **Full docs:** [README.md](README.md)

# 🔌 PORTABLE JARVIS USB

**A field-ready, zero-install AI command center that lives on your USB drive.**

Plug it into any laptop. Double-click. A web interface opens. You get:
- 🧠 **Persistent Memory** — remembers everything across every computer
- 🔧 **System Access** — hardware info, file manager, network tools
- 🎭 **Role Switching** — System Admin, GIS Tech, Ag Analyst, RS Specialist, Storage Manager
- 🌾 **AG/GIS/RS Integration** — hooks for your 460 repositories, GDAL checks, repo indexer
- 🔒 **Zero Traces** — all temp, cache, config stays on USB

---

## 📦 What You Get (This Package)

```
portable-jarvis-usb/
├── start.bat              ← Windows: double-click to launch
├── start.sh               ← Linux/Mac: run in terminal
├── jarvis/
│   ├── backend.py         ← Flask brain (memory, roles, tools)
│   ├── roles/
│   │   ├── system_admin.json
│   │   ├── gis_field_tech.json
│   │   ├── ag_analyst.json
│   │   ├── rs_specialist.json
│   │   └── storage_manager.json
│   ├── static/
│   │   ├── index.html     ← HUD interface
│   │   ├── style.css      ← Dark theme
│   │   └── app.js         ← Frontend logic
│   └── tools/             ← (reserved for your custom modules)
└── README.md
```

---

## 🚀 Quick Start

### 1. Prepare Your USB Drive
- **Minimum:** 8GB USB 3.0 stick
- **Recommended:** 32GB+ for repos and models
- **Format:** exFAT (works on Windows, Mac, Linux)

### 2. Add Portable Python (Windows)
If the target computer might not have Python:

1. Download **WinPython** or **python-embeddable** for Windows
   - Option A: [WinPython](https://winpython.github.io/) (~500MB, includes everything)
   - Option B: [python-embeddable](https://www.python.org/downloads/windows/) (~15MB, minimal)
2. Extract to your USB as `python_portable/`
3. Install dependencies once:
   ```
   python_portable\python.exe -m pip install flask flask-cors psutil
   ```

For **Linux/Mac**: `python3` is usually pre-installed. The launcher auto-detects.

### 3. Copy This Package
Copy the entire `portable-jarvis-usb/` folder to your USB drive root.

### 4. Launch
- **Windows:** Double-click `start.bat`
- **Linux:** `bash /media/YOURUSB/start.sh`
- **Mac:** `bash /Volumes/YOURUSB/start.sh`

The browser opens automatically at `http://localhost:5000`.

---

## 🧠 How Memory Works

Everything is stored in `jarvis/memory.db` (SQLite) on your USB.

| What | Where |
|------|-------|
| Saved notes/keys | `memory.db` → `memory` table |
| Session logs | `memory.db` → `logs` table |
| Computer fingerprints | `memory.db` → `sessions` table |

**Example:** Save GPS coordinates on a field laptop in India. Fly home. Plug into your desktop. The coordinates are there.

---

## 🎭 Roles

Switch roles from the dropdown in the top-right. Each role changes:
- The AI prompt context
- Available tools
- UI accent color

| Role | Use Case |
|------|----------|
| **System Admin** | Diagnose laptops, network debugging, hardware audit |
| **GIS Field Tech** | Coordinate conversion, shapefile checks, QGIS portable |
| **Ag Analyst** | Soil data, yield logs, weather notes, crop health |
| **RS Specialist** | Sentinel-2 indices, band math, orthorectification logs |
| **Storage Manager** | USB/host disk audit, file organization, backup |

---

## 🌾 Agriculture + GIS + Remote Sensing Integration

### Add Your 460 Repositories
Create a `repos/` folder on your USB and clone your starred repositories:
```bash
cd /path/to/USB
git clone https://github.com/user/repo1.git repos/repo1
git clone https://github.com/user/repo2.git repos/repo2
# ... or use a bulk clone script
```

The **AG/GIS tab** will index and list all repositories with `.git` folders.

### Add Portable GDAL/QGIS (Optional)
For offline GIS power:
1. Download [OSGeo4W](https://trac.osgeo.org/osgeo4w/) or [QGIS Portable](https://github.com/opengisch/QField/releases)
2. Add `gdalinfo`, `ogr2ogr`, etc. to a `gis_bin/` folder on USB
3. Modify `start.bat` / `start.sh` to add `gis_bin/` to PATH

---

## 🔒 Privacy & Zero Traces

| Host Location | Redirected To |
|---------------|---------------|
| Windows `%TEMP%` | `USB:/temp/` |
| Windows `%APPDATA%` | `USB:/appdata/` |
| Linux `$HOME` | `USB:/home/` |
| Linux `/tmp` | `USB:/temp/` |

**No registry entries. No host files. Unplug = gone.**

*(OS-level USB mount logs are unavoidable and harmless.)*

---

## 🛠️ Extending JARVIS

### Add a New Role
1. Create `jarvis/roles/my_role.json`:
```json
{
  "name": "my_role",
  "label": "🚀 My Role",
  "description": "What it does",
  "prompt_prefix": "You are...",
  "tools": ["sysinfo", "fileman"],
  "color": "#ff00ff",
  "icon": "🚀"
}
```
2. Restart JARVIS. It appears in the dropdown.

### Add a New Tool
1. Write a Python function in `jarvis/backend.py`
2. Add a route like `@app.route("/api/my_tool")`
3. Add a button in `jarvis/static/index.html`
4. Wire it in `jarvis/static/app.js`

---

## ⚠️ Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| USB Drive | 8 GB | 32 GB |
| USB Speed | 2.0 | 3.0+ |
| RAM | 2 GB | 4 GB+ |
| Host OS | Windows 10 / Linux / Mac | Any modern OS |
| Internet | Not required | For cloud AI boost (optional) |

---

## 📜 License

MIT — Use freely. Modify heavily. Make it yours.

---

**Built for field work. Built for memory. Built for you.**

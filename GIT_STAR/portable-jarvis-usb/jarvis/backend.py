#!/usr/bin/env python3
"""
PORTABLE JARVIS USB — Backend Brain
Runs from USB. Zero host installation. All data stays on USB.
"""
import os, sys, sqlite3, json, subprocess, platform, socket, psutil
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# ── Paths: everything stays on USB ──
USB_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(USB_ROOT, "jarvis", "memory.db")
ROLES_DIR = os.path.join(USB_ROOT, "jarvis", "roles")
TOOLS_DIR = os.path.join(USB_ROOT, "jarvis", "tools")

app = Flask(__name__, static_folder="static")
CORS(app)

# ═══════════════════════════════════════
# MEMORY SYSTEM (SQLite)
# ═══════════════════════════════════════
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT,
            key TEXT UNIQUE,
            value TEXT,
            timestamp TEXT,
            host_id TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event TEXT,
            detail TEXT,
            timestamp TEXT,
            host_id TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            host_name TEXT,
            ip TEXT,
            os TEXT,
            plugged_at TEXT,
            unplugged_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def get_host_id():
    """Unique fingerprint per computer"""
    try:
        return platform.node() + "_" + socket.gethostbyname(socket.gethostname())
    except:
        return platform.node()

def log_event(event, detail=""):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO logs (event, detail, timestamp, host_id) VALUES (?, ?, ?, ?)",
              (event, detail, datetime.now().isoformat(), get_host_id()))
    conn.commit()
    conn.close()

# ═══════════════════════════════════════
# ROUTES: Memory
# ═══════════════════════════════════════
@app.route("/api/memory", methods=["GET", "POST"])
def memory():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if request.method == "POST":
        data = request.json
        c.execute("""INSERT INTO memory (category, key, value, timestamp, host_id)
                       VALUES (?, ?, ?, ?, ?)
                       ON CONFLICT(key) DO UPDATE SET
                       value=excluded.value, timestamp=excluded.timestamp""",
                  (data.get("category","general"), data["key"], data["value"],
                   datetime.now().isoformat(), get_host_id()))
        conn.commit()
        conn.close()
        return jsonify({"status": "stored"})
    else:
        category = request.args.get("category")
        if category:
            c.execute("SELECT * FROM memory WHERE category=? ORDER BY timestamp DESC", (category,))
        else:
            c.execute("SELECT * FROM memory ORDER BY timestamp DESC")
        rows = c.fetchall()
        conn.close()
        return jsonify([{"id":r[0],"category":r[1],"key":r[2],"value":r[3],"timestamp":r[4],"host":r[5]} for r in rows])

@app.route("/api/memory/search")
def memory_search():
    q = request.args.get("q", "")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM memory WHERE key LIKE ? OR value LIKE ? ORDER BY timestamp DESC",
              (f"%{q}%", f"%{q}%"))
    rows = c.fetchall()
    conn.close()
    return jsonify([{"id":r[0],"category":r[1],"key":r[2],"value":r[3],"timestamp":r[4],"host":r[5]} for r in rows])

# ═══════════════════════════════════════
# ROUTES: Roles
# ═══════════════════════════════════════
@app.route("/api/roles")
def list_roles():
    roles = []
    for f in sorted(os.listdir(ROLES_DIR)):
        if f.endswith(".json"):
            with open(os.path.join(ROLES_DIR, f)) as fp:
                roles.append(json.load(fp))
    return jsonify(roles)

@app.route("/api/role/<name>")
def get_role(name):
    path = os.path.join(ROLES_DIR, f"{name}.json")
    if os.path.exists(path):
        with open(path) as fp:
            return jsonify(json.load(fp))
    return jsonify({"error": "Role not found"}), 404

# ═══════════════════════════════════════
# ROUTES: System Info (Read-only safe)
# ═══════════════════════════════════════
@app.route("/api/sysinfo")
def sysinfo():
    log_event("sysinfo_accessed")
    return jsonify({
        "platform": platform.system(),
        "node": platform.node(),
        "release": platform.release(),
        "processor": platform.processor(),
        "cpu_count": psutil.cpu_count(),
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "ram_total": psutil.virtual_memory().total,
        "ram_used": psutil.virtual_memory().used,
        "ram_percent": psutil.virtual_memory().percent,
        "disk_partitions": [
            {"device": p.device, "mountpoint": p.mountpoint, "fstype": p.fstype,
             "total": psutil.disk_usage(p.mountpoint).total,
             "used": psutil.disk_usage(p.mountpoint).used,
             "percent": psutil.disk_usage(p.mountpoint).percent}
            for p in psutil.disk_partitions() if os.path.exists(p.mountpoint)
        ],
        "network_io": {"bytes_sent": psutil.net_io_counters().bytes_sent, "bytes_recv": psutil.net_io_counters().bytes_recv},
        "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        "host_id": get_host_id()
    })

# ═══════════════════════════════════════
# ROUTES: File Manager (USB + scoped host)
# ═══════════════════════════════════════
@app.route("/api/files")
def list_files():
    path = request.args.get("path", USB_ROOT)
    # Security: block escaping above USB_ROOT unless explicitly allowed
    real_path = os.path.abspath(path)
    if not real_path.startswith(USB_ROOT) and not request.args.get("allow_host"):
        return jsonify({"error": "Access denied. Use allow_host=true for host filesystem."}), 403
    try:
        items = []
        for entry in os.scandir(real_path):
            items.append({
                "name": entry.name,
                "path": entry.path,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else 0,
                "modified": datetime.fromtimestamp(entry.stat().st_mtime).isoformat()
            })
        return jsonify({"path": real_path, "items": sorted(items, key=lambda x: (not x["is_dir"], x["name"].lower()))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/files/read")
def read_file():
    path = request.args.get("path")
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return jsonify({"content": f.read()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════
# ROUTES: Network Tools
# ═══════════════════════════════════════
@app.route("/api/net/ping")
def ping():
    target = request.args.get("target", "8.8.8.8")
    count = "-n" if platform.system() == "Windows" else "-c"
    try:
        result = subprocess.run(["ping", count, "4", target], capture_output=True, text=True, timeout=15)
        return jsonify({"output": result.stdout + result.stderr})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/net/scan")
def net_scan():
    """Quick local network scan"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        base = ".".join(local_ip.split(".")[:3])
        found = []
        for i in range(1, 255):
            ip = f"{base}.{i}"
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.1)
                result = sock.connect_ex((ip, 80))
                if result == 0:
                    found.append(ip)
                sock.close()
            except:
                pass
        return jsonify({"local_ip": local_ip, "active_hosts": found[:20]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════
# ROUTES: Agriculture/GIS/RS Integration
# ═══════════════════════════════════════
@app.route("/api/aggis/repos")
def list_repos():
    """Index your 460 repos if synced to USB"""
    repos_path = os.path.join(USB_ROOT, "repos")
    if not os.path.exists(repos_path):
        return jsonify({"repos": [], "note": "No repos/ folder found on USB. Create it and clone your 460 repos."})
    repos = []
    for entry in os.scandir(repos_path):
        if entry.is_dir() and os.path.exists(os.path.join(entry.path, ".git")):
            repos.append({"name": entry.name, "path": entry.path})
    return jsonify({"repos": repos, "count": len(repos)})

@app.route("/api/aggis/gdal_info")
def gdal_info():
    """Check if GDAL is available on host or portable"""
    try:
        result = subprocess.run(["gdalinfo", "--version"], capture_output=True, text=True, timeout=5)
        return jsonify({"gdal": result.stdout.strip(), "status": "available"})
    except FileNotFoundError:
        return jsonify({"gdal": None, "status": "not_found", "tip": "Add GDAL portable bin/ to PATH in launcher script"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ═══════════════════════════════════════
# STATIC: Web Interface
# ═══════════════════════════════════════
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

# ═══════════════════════════════════════
# BOOT
# ═══════════════════════════════════════
if __name__ == "__main__":
    init_db()
    log_event("jarvis_booted", f"Host: {get_host_id()}, USB: {USB_ROOT}")
    print(f"\n{'='*50}")
    print("  PORTABLE JARVIS USB — ONLINE")
    print(f"  USB Root: {USB_ROOT}")
    print(f"  Memory DB: {DB_PATH}")
    print(f"  Open browser: http://localhost:5000")
    print(f"{'='*50}\n")
    app.run(host="0.0.0.0", port=5000, debug=False)

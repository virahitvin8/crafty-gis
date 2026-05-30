// ── PORTABLE JARVIS USB — Frontend Controller ──
const API = "http://localhost:5000/api";
let currentRole = "system_admin";
let currentPath = "";
let rolesData = [];

// ── BOOT ──
document.addEventListener("DOMContentLoaded", () => {
  loadRoles();
  loadSysInfo();
  loadMemory();
  loadFiles();
  setInterval(loadSysInfo, 5000);
});

// ── ROLES ──
async function loadRoles() {
  try {
    const res = await fetch(`${API}/roles`);
    rolesData = await res.json();
    const sel = document.getElementById("role-select");
    sel.innerHTML = "";
    rolesData.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.textContent = `${r.icon} ${r.label}`;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", e => {
      currentRole = e.target.value;
      const role = rolesData.find(r => r.name === currentRole);
      document.documentElement.style.setProperty("--accent", role.color);
      updateStatus(`Role switched to ${role.label}`);
    });
    // Set initial accent
    const first = rolesData[0];
    if (first) document.documentElement.style.setProperty("--accent", first.color);
  } catch (err) {
    console.error("Role load failed:", err);
  }
}

// ── SYSTEM INFO ──
async function loadSysInfo() {
  try {
    const res = await fetch(`${API}/sysinfo`);
    const d = await res.json();
    document.getElementById("host-info").textContent = `${d.node} | ${d.platform} ${d.release} | ${d.host_id}`;
    document.getElementById("stat-os").textContent = d.platform;
    document.getElementById("stat-cpu").textContent = `${d.cpu_percent}% (${d.cpu_count}c)`;
    const ramGB = (d.ram_used / 1e9).toFixed(1) + " / " + (d.ram_total / 1e9).toFixed(1) + " GB";
    document.getElementById("stat-ram").textContent = ramGB;

    // Disk bars
    const container = document.getElementById("disk-bars");
    container.innerHTML = "";
    d.disk_partitions.forEach(disk => {
      const pct = disk.percent;
      const cls = pct > 90 ? "danger" : pct > 75 ? "warn" : "";
      const div = document.createElement("div");
      div.className = "disk-bar";
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between">
          <span>${disk.device} (${disk.fstype})</span>
          <span style="color:var(--text-dim)">${pct}%</span>
        </div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
        <div style="font-size:10px;color:#475569;margin-top:2px">${disk.mountpoint}</div>
      `;
      container.appendChild(div);
    });

    // Find USB free space (heuristic: find removable or smallest)
    const usb = d.disk_partitions.find(p => p.mountpoint.includes("USB") || p.mountpoint.includes("Removable")) || d.disk_partitions[0];
    if (usb) {
      const free = ((usb.total - usb.used) / 1e9).toFixed(1);
      document.getElementById("stat-usb").textContent = `${free} GB`;
    }
  } catch (err) {
    document.getElementById("host-info").textContent = "Backend offline — start the USB launcher";
  }
}

// ── MEMORY ──
async function loadMemory() {
  try {
    const res = await fetch(`${API}/memory`);
    const items = await res.json();
    renderMemory(items);
    updateStatus(`Memory: ${items.length} entries`);
  } catch (err) { console.error(err); }
}

function renderMemory(items) {
  const list = document.getElementById("memory-list");
  list.innerHTML = "";
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = "mem-item";
    div.innerHTML = `
      <span class="mem-key">[${item.category}] ${item.key}</span>
      <span class="mem-val">${item.value}</span>
      <span class="mem-meta">${item.timestamp} | Host: ${item.host || "unknown"}</span>
    `;
    list.appendChild(div);
  });
}

async function addMemory() {
  const key = document.getElementById("mem-key").value.trim();
  const value = document.getElementById("mem-value").value.trim();
  const category = document.getElementById("mem-category").value;
  if (!key || !value) return alert("Key and Value required");
  try {
    await fetch(`${API}/memory`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({key, value, category})
    });
    document.getElementById("mem-key").value = "";
    document.getElementById("mem-value").value = "";
    loadMemory();
    updateStatus("Memory saved ✓");
  } catch (err) { alert("Failed to save memory"); }
}

async function searchMemory() {
  const q = document.getElementById("mem-search").value.trim();
  if (!q) { loadMemory(); return; }
  try {
    const res = await fetch(`${API}/memory/search?q=${encodeURIComponent(q)}`);
    const items = await res.json();
    renderMemory(items);
  } catch (err) { console.error(err); }
}

// ── FILE MANAGER ──
async function loadFiles(path = "") {
  currentPath = path;
  document.getElementById("breadcrumb").textContent = "USB_ROOT / " + (path || "").replace(/\\/g, "/");
  try {
    const res = await fetch(`${API}/files?path=${encodeURIComponent(path || "")}`);
    const data = await res.json();
    const list = document.getElementById("file-list");
    list.innerHTML = "";
    if (data.error) {
      list.innerHTML = `<div style="color:var(--danger);padding:10px">${data.error}</div>`;
      return;
    }
    // Parent dir link
    if (path) {
      const parent = path.split(/[\\/]/).slice(0, -1).join("/");
      const row = document.createElement("div");
      row.className = "file-row";
      row.innerHTML = `<span class="icon">⬆️</span><span class="name">..</span>`;
      row.onclick = () => loadFiles(parent);
      list.appendChild(row);
    }
    data.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "file-row";
      const icon = item.is_dir ? "📁" : "📄";
      const size = item.is_dir ? "" : formatBytes(item.size);
      row.innerHTML = `<span class="icon">${icon}</span><span class="name">${item.name}</span><span class="size">${size}</span>`;
      row.onclick = () => item.is_dir ? loadFiles(item.path) : viewFile(item.path);
      list.appendChild(row);
    });
  } catch (err) {
    document.getElementById("file-list").innerHTML = `<div style="color:var(--danger)">Cannot access files: ${err}</div>`;
  }
}

async function viewFile(path) {
  try {
    const res = await fetch(`${API}/files/read?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    alert(data.content?.substring(0, 2000) || data.error || "Empty file");
  } catch (err) { alert("Cannot read file"); }
}

function formatBytes(b) {
  if (b === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return parseFloat((b / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// ── NETWORK TOOLS ──
async function doPing() {
  const target = document.getElementById("ping-target").value;
  const out = document.getElementById("net-output");
  out.textContent = `Pinging ${target}...`;
  try {
    const res = await fetch(`${API}/net/ping?target=${encodeURIComponent(target)}`);
    const data = await res.json();
    out.textContent = data.output || data.error;
  } catch (err) { out.textContent = "Error: " + err; }
}

async function scanNet() {
  const out = document.getElementById("net-output");
  out.textContent = "Scanning local network (this may take a minute)...";
  try {
    const res = await fetch(`${API}/net/scan`);
    const data = await res.json();
    out.textContent = `Local IP: ${data.local_ip}\nActive hosts: ${data.active_hosts.join(", ") || "None found"}`;
  } catch (err) { out.textContent = "Error: " + err; }
}

// ── AG/GIS TOOLS ──
async function checkGdal() {
  const out = document.getElementById("aggis-output");
  out.textContent = "Checking GDAL...";
  try {
    const res = await fetch(`${API}/aggis/gdal_info`);
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) { out.textContent = "Error: " + err; }
}

async function listRepos() {
  const out = document.getElementById("aggis-output");
  out.textContent = "Indexing repos folder...";
  try {
    const res = await fetch(`${API}/aggis/repos`);
    const data = await res.json();
    out.textContent = `Found ${data.count} repos\n${data.repos.map(r => r.name).join("\n")}`;
    if (data.note) out.textContent += "\n\n" + data.note;
  } catch (err) { out.textContent = "Error: " + err; }
}

// ── TABS ──
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  event.target.classList.add("active");
  document.getElementById(`tab-${tab}`).classList.add("active");
}

// ── UTILS ──
function updateStatus(msg) {
  const role = rolesData.find(r => r.name === currentRole);
  const roleLabel = role ? role.label : currentRole;
  document.getElementById("status-bar").textContent = `🟢 ${msg} | Role: ${roleLabel}`;
}

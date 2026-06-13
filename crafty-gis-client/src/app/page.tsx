"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User, Info, Sparkles, Map, History, FileDown, CheckSquare, Zap, Satellite, Globe, BarChart2, AlertCircle, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Role = "user" | "assistant" | "system";
type Msg = { id: string; role: Role; content: string; ts: string };
type Task = { id: string; title: string; tool: string; status: "pending"|"running"|"completed"|"failed"; progress: number };
type OutFile = { id: string; name: string; type: string; size: string; url?: string };

const SUGGESTIONS = [
  "Show me crop health using NDVI for my fields",
  "Map forest cover change from 2015 to 2024",
  "Detect water bodies and flood extent",
  "Urban sprawl analysis for my city",
  "Generate a land use land cover map",
  "Watershed delineation from DEM data",
];

const SYSTEM_MSG: Msg = {
  id: "welcome",
  role: "system",
  content: `🌍 **Welcome to CRAFTY GIS**\n\nI'm your AI geospatial consultant. Describe any GIS, remote sensing, or agriculture problem in plain language — I'll ask the right questions and handle everything automatically.\n\n**What can I do for you today?**`,
  ts: new Date().toISOString(),
};

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([SYSTEM_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<OutFile[]>([]);
  const [tab, setTab] = useState<"chat"|"workflow"|"files"|"history">("chat");
  const [aiStatus, setAiStatus] = useState<"checking"|"groq"|"ollama"|"offline">("checking");
  const [interrupt, setInterrupt] = useState(false);
  const [showSugg, setShowSugg] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI backend on mount
  useEffect(() => {
    fetch(`${API_URL}/api/ai/status`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(d => setAiStatus(d.primary === "groq" && d.groq?.status === "connected" ? "groq" : d.ollama?.status === "connected" ? "ollama" : "offline"))
      .catch(() => setAiStatus("offline"));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading]);

  const addMsg = (role: Role, content: string) => {
    const m: Msg = { id: `m_${Date.now()}_${Math.random()}`, role, content, ts: new Date().toISOString() };
    setMsgs(p => [...p, m]);
    return m;
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput(""); setLoading(true); setShowSugg(false);
    addMsg("user", text);

    try {
      const res = await fetch(`${API_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: text, message_type: "chat" }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d.session_id) setSessionId(d.session_id);
        addMsg("assistant", d.reply || "Got it. Let me process that.");
        if (d.workflow_update?.tasks) setTasks(d.workflow_update.tasks);
      } else {
        addMsg("assistant", await getDemoReply(text));
      }
    } catch {
      addMsg("assistant", await getDemoReply(text));
    }
    setLoading(false);
  }, [loading, sessionId]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-zinc-900/80 border-r border-zinc-800 flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight">CRAFTY GIS</div>
              <div className="text-[10px] text-zinc-500">v1.0 · Geospatial AI</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-2 flex-1 space-y-1">
          {([
            ["chat",     "Chat",     Bot],
            ["workflow", "Workflow",  CheckSquare],
            ["files",    "Outputs",   FileDown],
            ["history",  "History",   History],
          ] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              {id === "workflow" && tasks.length > 0 && (
                <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Data Sources */}
        <div className="p-3 border-t border-zinc-800">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Data Sources</div>
          {[
            ["Sentinel-1/2", "ESA Copernicus"],
            ["Landsat 8/9", "NASA/USGS"],
            ["SRTM/MODIS", "NASA Earthdata"],
            ["Bhoonidhi", "ISRO India"],
          ].map(([a, b]) => (
            <div key={a} className="flex items-center gap-1.5 mb-1">
              <Satellite className="w-3 h-3 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] text-zinc-300 leading-tight">{a}</div>
                <div className="text-[9px] text-zinc-600">{b}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Status */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              aiStatus === "groq" ? "bg-emerald-400" : aiStatus === "ollama" ? "bg-blue-400" : aiStatus === "offline" ? "bg-red-400" : "bg-zinc-500 animate-pulse"
            }`} />
            <span className="text-[10px] text-zinc-500">
              {aiStatus === "groq" ? "Groq AI · Connected" : aiStatus === "ollama" ? "Ollama · Local" : aiStatus === "offline" ? "AI · Demo Mode" : "Checking..."}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-11 flex items-center px-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0 gap-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-zinc-500 flex-1">
            {tab === "chat" ? "AI Geospatial Consultant — Describe your problem in plain language"
             : tab === "workflow" ? "Live Workflow — Task execution status"
             : tab === "files" ? "Output Files — Download your results"
             : "Session History"}
          </span>
          {tasks.some(t => t.status === "running") && (
            <button onClick={() => setInterrupt(true)}
              className="text-[11px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded font-medium">
              ⏸ Interrupt
            </button>
          )}
        </div>

        {/* ── Chat Tab ─────────────────────────────────────────── */}
        {tab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {msgs.map(m => <MsgBubble key={m.id} msg={m} />)}
              {loading && (
                <div className="flex gap-3 animate-[slide-up_0.3s_ease-out]">
                  <Avatar role="assistant" />
                  <div className="bg-zinc-800/40 border border-zinc-700/30 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="typing-dot" />
                    <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
              {/* Suggestions */}
              {showSugg && msgs.length <= 1 && (
                <div className="mt-2 animate-[fade-in_0.3s_ease-out]">
                  <p className="text-[11px] text-zinc-500 mb-2 uppercase tracking-wider font-medium">Try asking:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => send(s)}
                        className="text-left text-xs text-zinc-400 hover:text-blue-300 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-blue-500/30 px-3 py-2 rounded-lg transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 bg-zinc-900/50 p-3 safe-bottom">
              <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea ref={inputRef} value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Describe your GIS problem..."
                    rows={1} disabled={loading}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 disabled:opacity-50"
                    style={{ minHeight: 42, maxHeight: 120 }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 120) + "px";
                    }}
                  />
                </div>
                <button type="submit" disabled={!input.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
              <p className="text-[10px] text-zinc-600 mt-1.5 px-1">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        )}

        {/* ── Workflow Tab ──────────────────────────────────────── */}
        {tab === "workflow" && (
          <div className="flex-1 overflow-y-auto p-4">
            {tasks.length === 0 ? (
              <EmptyState icon={<CheckSquare className="w-8 h-8" />} title="No active workflow" sub="Start a conversation to generate an analysis plan" />
            ) : (
              <div className="space-y-2">
                {tasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </div>
        )}

        {/* ── Files Tab ────────────────────────────────────────── */}
        {tab === "files" && (
          <div className="flex-1 overflow-y-auto p-4">
            {files.length === 0 ? (
              <EmptyState icon={<FileDown className="w-8 h-8" />} title="No output files yet" sub="Completed analyses will appear here for download" />
            ) : (
              <div className="space-y-2">
                {files.map(f => <FileRow key={f.id} file={f} />)}
              </div>
            )}
          </div>
        )}

        {/* ── History Tab ──────────────────────────────────────── */}
        {tab === "history" && (
          <div className="flex-1 overflow-y-auto p-4">
            <EmptyState icon={<History className="w-8 h-8" />} title="No session history yet" sub="Your past analyses will be saved here automatically" />
          </div>
        )}
      </main>

      {/* ── Interrupt Modal ───────────────────────────────────── */}
      {interrupt && <InterruptModal onClose={() => setInterrupt(false)} onSend={t => { setInterrupt(false); send(`[ADJUST] ${t}`); }} />}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function Avatar({ role }: { role: Role }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
      role === "user" ? "bg-blue-500/20 text-blue-400"
      : role === "system" ? "bg-zinc-700 text-zinc-400"
      : "bg-gradient-to-br from-blue-500 to-emerald-500 text-white"
    }`}>
      {role === "user" ? <User className="w-3.5 h-3.5" />
       : role === "system" ? <Info className="w-3.5 h-3.5" />
       : <Bot className="w-3.5 h-3.5" />}
    </div>
  );
}

function MsgBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 animate-[slide-up_0.3s_ease-out] ${isUser ? "flex-row-reverse" : ""}`}>
      <Avatar role={msg.role} />
      <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser ? "bg-blue-600/20 border border-blue-500/20 text-zinc-100"
        : msg.role === "system" ? "bg-zinc-800/50 border border-zinc-700/40 text-zinc-300"
        : "bg-zinc-800/30 border border-zinc-700/30 text-zinc-200"
      }`}>
        <MsgContent content={msg.content} />
      </div>
    </div>
  );
}

function MsgContent({ content }: { content: string }) {
  return (
    <div className="prose-crafty space-y-1">
      {content.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const html = line
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/`(.*?)`/g, '<code>$1</code>');
        const prefix = line.startsWith("• ") || line.startsWith("- ") ? "ml-3" : "";
        return <p key={i} className={`text-sm ${prefix}`} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const color = { pending: "text-zinc-500", running: "text-blue-400", completed: "text-emerald-400", failed: "text-red-400" }[task.status];
  const dot = { pending: "bg-zinc-600", running: "bg-blue-400 animate-pulse", completed: "bg-emerald-400", failed: "bg-red-400" }[task.status];
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 font-medium truncate">{task.title}</p>
        <p className="text-xs text-zinc-500">{task.tool}</p>
      </div>
      <span className={`text-xs font-medium ${color} shrink-0`}>{task.status}</span>
    </div>
  );
}

function FileRow({ file }: { file: OutFile }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
      <FileDown className="w-4 h-4 text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-200 font-medium truncate">{file.name}</p>
        <p className="text-xs text-zinc-500">{file.type} · {file.size}</p>
      </div>
      {file.url && (
        <a href={file.url} download className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-2 py-1 rounded-lg">
          Download
        </a>
      )}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-48 gap-3 text-center">
      <div className="text-zinc-600">{icon}</div>
      <p className="text-sm text-zinc-400 font-medium">{title}</p>
      <p className="text-xs text-zinc-600 max-w-48">{sub}</p>
    </div>
  );
}

function InterruptModal({ onClose, onSend }: { onClose: () => void; onSend: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Adjust Your Request</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-zinc-400" /></button>
        </div>
        <p className="text-xs text-zinc-500 mb-3">Add new instructions or change parameters. The system will update the plan and continue.</p>
        <textarea value={val} onChange={e => setVal(e.target.value)} rows={3} autoFocus
          placeholder="e.g. Use 7 classes instead of 5, also add water bodies..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <div className="flex gap-2 mt-3 justify-end">
          <button onClick={onClose} className="text-xs text-zinc-400 px-3 py-1.5 rounded-lg border border-zinc-700">Cancel</button>
          <button onClick={() => onSend(val)} disabled={!val.trim()}
            className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white px-3 py-1.5 rounded-lg font-medium">
            Update Plan
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Demo AI responses when backend offline ──────────────────── */
async function getDemoReply(input: string): Promise<string> {
  const q = input.toLowerCase();
  if (q.includes("ndvi") || q.includes("crop") || q.includes("vegetation"))
    return `🌿 **NDVI Crop Health Analysis**\n\nI'll compute the Normalized Difference Vegetation Index to assess your crop health.\n\n**What I need:**\n• Which district/state/area?\n• What time period? (e.g. Kharif 2024)\n• Output: map, report, or both?\n\n*(Running in demo mode — connect backend for real satellite data)*`;
  if (q.includes("forest") || q.includes("lulc") || q.includes("land cover"))
    return `🗺️ **Land Use / Land Cover Analysis**\n\nI'll map land cover change using Sentinel-2 and Landsat imagery.\n\n**Clarifying questions:**\n• Which region or district?\n• Start year vs end year?\n• How many classification classes?`;
  if (q.includes("water") || q.includes("flood") || q.includes("mndwi"))
    return `💧 **Water Body / Flood Mapping**\n\nUsing MNDWI and Sentinel-1 SAR for all-weather flood detection.\n\n**I need to know:**\n• Target region?\n• Is this current flooding or historical analysis?`;
  if (q.includes("urban") || q.includes("city") || q.includes("sprawl"))
    return `🏙️ **Urban Sprawl Analysis**\n\nI'll track urban expansion using Built-up Index from Landsat time series.\n\n**Questions:**\n• Which city or urban area?\n• Time period to analyze?`;
  if (q.includes("adjust") || q.includes("change") || q.includes("update"))
    return `🔄 **Plan Updated!**\n\nI've noted your adjustment and will incorporate it into the analysis workflow.\n\nThe remaining tasks have been updated accordingly.`;
  return `🤔 **Let me understand your request better.**\n\nI specialize in:\n• 🌿 Vegetation & crop health (NDVI, EVI)\n• 🗺️ Land cover mapping (LULC)\n• 💧 Water & flood detection\n• 🏙️ Urban sprawl analysis\n• ⛰️ Terrain & watershed analysis\n• 🌡️ Land surface temperature\n\nDescribe your problem and I'll ask targeted questions to understand exactly what you need!\n\n*(Backend offline — connect server for real AI responses)*`;
}

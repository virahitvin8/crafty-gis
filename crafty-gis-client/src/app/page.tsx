"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  Globe, LayoutDashboard, Map, BarChart3, Grid3X3, FileText,
  Settings, Bell, Search, User, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Leaf, Droplets, Cloud,
  Sun, CloudRain, Wind, Thermometer, Sprout, Target,
  Activity, Clock, Plus, Download, RefreshCw, Filter,
  Layers, ZoomIn, ZoomOut, Compass, Maximize2,
  TreePine, Mountain, Waves, Wheat, AlertTriangle,
  CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight,
  ChevronLeft, X, Menu, Satellite, Radio, Cpu,
  Calendar, MapPin, Ruler, BarChart2, PieChart,
  ArrowRight, ExternalLink, Copy,
  Upload, Trash2, Edit3,
  Loader2, AlertCircle, Info, Sparkles, Zap, Play,
  ArrowDown, ArrowUp
} from "lucide-react";

// Dynamic import for MapLibre
const MapView = dynamic(() => import("./components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-900">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  ),
});

// ============================================================================
// TYPES
// ============================================================================

type View = "dashboard" | "map" | "analysis" | "fields" | "reports" | "settings";
type AnalysisTab = "vegetation" | "soil" | "terrain" | "weather" | "crop" | "prediction";
type FieldView = "grid" | "list";

interface Field {
  id: string;
  name: string;
  area: number;
  cropType: string;
  healthScore: number;
  ndvi: number;
  lastAnalysis: string;
  location: string;
  status: "healthy" | "stressed" | "critical";
}

interface VegetationIndex {
  name: string;
  abbr: string;
  value: number;
  status: "healthy" | "stressed" | "critical";
  trend: "up" | "down" | "stable";
  description: string;
}

interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  forecast: { day: string; temp: number; condition: string }[];
}

interface SoilData {
  moisture: number;
  ph: number;
  nitrogen: number;
  organic: number;
}

interface Activity {
  id: string;
  type: "analysis" | "alert" | "update";
  message: string;
  time: string;
}

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  status: "completed" | "pending" | "failed";
  size: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_FIELDS: Field[] = [
  { id: "f1", name: "North Wheat Block", area: 45.2, cropType: "Wheat", healthScore: 87, ndvi: 0.72, lastAnalysis: "2 hours ago", location: "Punjab, India", status: "healthy" },
  { id: "f2", name: "East Rice Paddy", area: 32.8, cropType: "Rice", healthScore: 64, ndvi: 0.48, lastAnalysis: "5 hours ago", location: "Haryana, India", status: "stressed" },
  { id: "f3", name: "South Cotton Zone", area: 28.5, cropType: "Cotton", healthScore: 91, ndvi: 0.78, lastAnalysis: "1 hour ago", location: "Gujarat, India", status: "healthy" },
  { id: "f4", name: "Central Sugarcane", area: 52.1, cropType: "Sugarcane", healthScore: 42, ndvi: 0.31, lastAnalysis: "30 min ago", location: "Maharashtra, India", status: "critical" },
  { id: "f5", name: "West Soybean Plot", area: 38.7, cropType: "Soybean", healthScore: 78, ndvi: 0.65, lastAnalysis: "3 hours ago", location: "Madhya Pradesh, India", status: "healthy" },
  { id: "f6", name: "Northwest Mustard", area: 22.4, cropType: "Mustard", healthScore: 55, ndvi: 0.42, lastAnalysis: "6 hours ago", location: "Rajasthan, India", status: "stressed" },
];

const MOCK_VEGETATION: VegetationIndex[] = [
  { name: "Normalized Difference Vegetation Index", abbr: "NDVI", value: 0.72, status: "healthy", trend: "up", description: "Measures vegetation greenness and density" },
  { name: "Enhanced Vegetation Index", abbr: "EVI", value: 0.68, status: "healthy", trend: "stable", description: "Optimized for high biomass regions" },
  { name: "Green NDVI", abbr: "GNDVI", value: 0.61, status: "healthy", trend: "up", description: "Uses green band for chlorophyll sensitivity" },
  { name: "Normalized Difference Red Edge", abbr: "NDRE", value: 0.45, status: "stressed", trend: "down", description: "Sensitive to leaf chlorophyll content" },
  { name: "Normalized Difference Moisture Index", abbr: "NDMI", value: 0.38, status: "stressed", trend: "down", description: "Indicates vegetation water content" },
  { name: "Normalized Difference Water Index", abbr: "NDWI", value: 0.52, status: "healthy", trend: "stable", description: "Measures water content in vegetation" },
];

const MOCK_WEATHER: WeatherData = {
  temp: 32,
  humidity: 65,
  windSpeed: 12,
  condition: "Partly Cloudy",
  forecast: [
    { day: "Mon", temp: 32, condition: "sunny" },
    { day: "Tue", temp: 30, condition: "cloudy" },
    { day: "Wed", temp: 28, condition: "rainy" },
    { day: "Thu", temp: 29, condition: "cloudy" },
    { day: "Fri", temp: 31, condition: "sunny" },
    { day: "Sat", temp: 33, condition: "sunny" },
    { day: "Sun", temp: 30, condition: "cloudy" },
  ],
};

const MOCK_SOIL: SoilData = {
  moisture: 42,
  ph: 6.8,
  nitrogen: 78,
  organic: 3.2,
};

const MOCK_ACTIVITY: Activity[] = [
  { id: "a1", type: "analysis", message: "NDVI analysis completed for North Wheat Block", time: "2 hours ago" },
  { id: "a2", type: "alert", message: "Water stress detected in East Rice Paddy", time: "3 hours ago" },
  { id: "a3", type: "update", message: "Sentinel-2 imagery acquired for region", time: "5 hours ago" },
  { id: "a4", type: "analysis", message: "Soil moisture analysis updated", time: "6 hours ago" },
  { id: "a5", type: "alert", message: "Critical health score in Central Sugarcane", time: "8 hours ago" },
  { id: "a6", type: "update", message: "Weather forecast refreshed", time: "12 hours ago" },
];

const MOCK_REPORTS: Report[] = [
  { id: "r1", title: "Weekly Crop Health Summary", date: "2026-08-09", type: "Health", status: "completed", size: "2.4 MB" },
  { id: "r2", title: "NDVI Trend Analysis - July 2026", date: "2026-08-01", type: "Vegetation", status: "completed", size: "5.1 MB" },
  { id: "r3", title: "Soil Moisture Report", date: "2026-07-28", type: "Soil", status: "completed", size: "1.8 MB" },
  { id: "r4", title: "Yield Prediction Model Output", date: "2026-07-25", type: "Prediction", status: "pending", size: "3.2 MB" },
];

const DATA_SOURCES = [
  { name: "Sentinel-2", provider: "ESA Copernicus", status: "connected" as const, lastSync: "12 min ago" },
  { name: "Landsat 8/9", provider: "NASA/USGS", status: "connected" as const, lastSync: "1 hour ago" },
  { name: "SoilGrids", provider: "ISRIC", status: "connected" as const, lastSync: "3 hours ago" },
  { name: "Open-Meteo", provider: "Open-Meteo API", status: "connected" as const, lastSync: "5 min ago" },
];

const NAV_ITEMS: { id: View; label: string; icon: typeof Globe }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "map", label: "Map View", icon: Map },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "fields", label: "Fields", icon: Grid3X3 },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

// ============================================================================
// STATUS HELPERS
// ============================================================================

function getStatusColor(status: "healthy" | "stressed" | "critical") {
  return status === "healthy" ? "emerald" : status === "stressed" ? "amber" : "red";
}

function getStatusBg(status: "healthy" | "stressed" | "critical") {
  return status === "healthy"
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
    : status === "stressed"
    ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
    : "bg-red-500/15 text-red-400 border-red-500/20";
}

function getStatusLabel(status: "healthy" | "stressed" | "critical") {
  return status === "healthy" ? "Healthy" : status === "stressed" ? "Stressed" : "Critical";
}

function getTrendIcon(trend: "up" | "down" | "stable") {
  return trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> :
    trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-red-400" /> :
    <Minus className="w-3.5 h-3.5 text-zinc-400" />;
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("sun") || c.includes("clear")) return <Sun className="w-5 h-5 text-amber-400" />;
  if (c.includes("rain") || c.includes("shower")) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (c.includes("cloud")) return <Cloud className="w-5 h-5 text-zinc-400" />;
  return <Sun className="w-5 h-5 text-amber-400" />;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CraftyGISDashboard() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("vegetation");
  const [fieldView, setFieldView] = useState<FieldView>("grid");
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Check AI status
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/api/ai/status`, { signal: AbortSignal.timeout(5000) })
      .then((r) => r.json())
      .then((d) => setAiStatus(d.primary === "groq" && d.groq?.status === "connected" ? "online" : "offline"))
      .catch(() => setAiStatus("offline"));
  }, []);

  // Refresh timer
  useEffect(() => {
    const timer = setInterval(() => setLastUpdate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const refreshData = useCallback(() => {
    setLastUpdate(new Date());
  }, []);

  const viewTitle = NAV_ITEMS.find((n) => n.id === activeView)?.label || "Dashboard";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static z-50 h-full w-64 shrink-0 bg-zinc-900/95 border-r border-zinc-800 flex flex-col transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${sidebarOpen ? "" : "lg:w-16 lg:overflow-hidden"}`}>
        {/* Brand */}
        <div className="p-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center shadow-lg shrink-0">
            <Globe className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white tracking-tight">CRAFTY GIS</div>
              <div className="text-[10px] text-zinc-500 truncate">Agricultural Intelligence</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto hidden lg:block p-1 rounded hover:bg-zinc-800 text-zinc-500">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <button onClick={() => setMobileMenuOpen(false)} className="ml-auto lg:hidden p-1 rounded hover:bg-zinc-800 text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Data Sources */}
        {sidebarOpen && (
          <div className="p-3 border-t border-zinc-800">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2.5">Data Sources</div>
            <div className="space-y-2">
              {DATA_SOURCES.map((ds) => (
                <div key={ds.name} className="flex items-start gap-2">
                  <Satellite className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-zinc-300 font-medium leading-tight">{ds.name}</div>
                    <div className="text-[9px] text-zinc-600">{ds.provider}</div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${ds.status === "connected" ? "bg-emerald-400" : "bg-zinc-600"}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Status */}
        <div className="p-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${
              aiStatus === "online" ? "bg-emerald-400 animate-pulse" : aiStatus === "offline" ? "bg-red-400" : "bg-zinc-500 animate-pulse"
            }`} />
            {sidebarOpen && (
              <span className="text-[11px] text-zinc-500">
                {aiStatus === "online" ? "AI Connected" : aiStatus === "offline" ? "Demo Mode" : "Checking..."}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 flex items-center px-4 border-b border-zinc-800 bg-zinc-900/60 shrink-0 gap-3">
          <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-white">{viewTitle}</h1>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search fields, reports..."
              className="bg-transparent text-sm text-zinc-200 placeholder-zinc-500 outline-none w-48"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 relative">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
            A
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto">
          {activeView === "dashboard" && <DashboardView onNavigate={setActiveView} />}
          {activeView === "map" && <MapView />}
          {activeView === "analysis" && <AnalysisView activeTab={analysisTab} onTabChange={setAnalysisTab} />}
          {activeView === "fields" && (
            <FieldsView
              fields={MOCK_FIELDS}
              viewMode={fieldView}
              onViewChange={setFieldView}
              onSelectField={setSelectedField}
            />
          )}
          {activeView === "reports" && <ReportsView />}
          {activeView === "settings" && <SettingsView />}
        </div>
      </main>

      {/* Field Detail Modal */}
      {selectedField && (
        <FieldDetailModal field={selectedField} onClose={() => setSelectedField(null)} />
      )}
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Welcome back, Operator</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Monitoring {MOCK_FIELDS.length} fields across India &middot; Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => onNavigate("analysis")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Quick Analysis
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Average NDVI"
          value="0.66"
          subtitle="Across all fields"
          trend={{ direction: "up", value: "+0.03" }}
          icon={<Leaf className="w-5 h-5" />}
          color="emerald"
        />
        <KpiCard
          label="Soil Health Score"
          value="78/100"
          subtitle="Good condition"
          trend={{ direction: "up", value: "+2" }}
          icon={<Droplets className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          label="Active Fields"
          value={`${MOCK_FIELDS.length}`}
          subtitle="Under surveillance"
          trend={{ direction: "stable", value: "0" }}
          icon={<Target className="w-5 h-5" />}
          color="violet"
        />
        <KpiCard
          label="Weather"
          value="32°C"
          subtitle="Partly Cloudy"
          trend={{ direction: "down", value: "-2°" }}
          icon={<Cloud className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vegetation Indices - 2 columns */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Vegetation Indices</h3>
            <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View Details <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MOCK_VEGETATION.map((idx) => (
              <div key={idx.abbr} className="bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-300">{idx.abbr}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getStatusBg(idx.status)}`}>
                    {getStatusLabel(idx.status)}
                  </span>
                </div>
                <div className="text-lg font-bold text-white mb-0.5">{idx.value.toFixed(2)}</div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 truncate">{idx.name}</span>
                  {getTrendIcon(idx.trend)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {MOCK_ACTIVITY.slice(0, 5).map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  act.type === "analysis" ? "bg-blue-500/15 text-blue-400" :
                  act.type === "alert" ? "bg-red-500/15 text-red-400" :
                  "bg-zinc-700/50 text-zinc-400"
                }`}>
                  {act.type === "analysis" ? <BarChart3 className="w-3.5 h-3.5" /> :
                   act.type === "alert" ? <AlertTriangle className="w-3.5 h-3.5" /> :
                   <RefreshCw className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 leading-relaxed">{act.message}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Analyze Field", icon: <BarChart3 className="w-5 h-5" />, color: "blue", action: () => onNavigate("analysis") },
            { label: "View Map", icon: <Map className="w-5 h-5" />, color: "emerald", action: () => onNavigate("map") },
            { label: "Generate Report", icon: <FileText className="w-5 h-5" />, color: "violet", action: () => onNavigate("reports") },
            { label: "Weather Forecast", icon: <Cloud className="w-5 h-5" />, color: "amber", action: () => onNavigate("analysis") },
          ].map((qa) => (
            <button
              key={qa.label}
              onClick={qa.action}
              className="flex flex-col items-center gap-2.5 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-800/50 transition-all"
            >
              <div className={`p-2.5 rounded-lg ${
                qa.color === "blue" ? "bg-blue-500/15 text-blue-400" :
                qa.color === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
                qa.color === "violet" ? "bg-violet-500/15 text-violet-400" :
                "bg-amber-500/15 text-amber-400"
              }`}>
                {qa.icon}
              </div>
              <span className="text-xs font-medium text-zinc-300">{qa.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// KPI CARD
// ============================================================================

function KpiCard({
  label,
  value,
  subtitle,
  trend,
  icon,
  color,
}: {
  label: string;
  value: string;
  subtitle: string;
  trend: { direction: "up" | "down" | "stable"; value: string };
  icon: React.ReactNode;
  color: "emerald" | "blue" | "violet" | "amber";
}) {
  const colorMap = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    blue: "bg-blue-500/15 text-blue-400",
    violet: "bg-violet-500/15 text-violet-400",
    amber: "bg-amber-500/15 text-amber-400",
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">{subtitle}</span>
        {trend.direction !== "stable" && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${
            trend.direction === "up" ? "text-emerald-400" : "text-red-400"
          }`}>
            {trend.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ANALYSIS VIEW
// ============================================================================

const ANALYSIS_TABS: { id: AnalysisTab; label: string; icon: typeof Globe }[] = [
  { id: "vegetation", label: "Vegetation", icon: Leaf },
  { id: "soil", label: "Soil", icon: Droplets },
  { id: "terrain", label: "Terrain", icon: Mountain },
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "crop", label: "Crop", icon: Wheat },
  { id: "prediction", label: "Prediction", icon: Cpu },
];

function AnalysisView({ activeTab, onTabChange }: { activeTab: AnalysisTab; onTabChange: (t: AnalysisTab) => void }) {
  const [selectedIndex, setSelectedIndex] = useState("NDVI");
  const [dateRange, setDateRange] = useState("last30");
  const [computing, setComputing] = useState(false);
  const [results, setResults] = useState<{ computed: boolean; value: number; status: string } | null>(null);

  const handleCompute = useCallback(() => {
    setComputing(true);
    setResults(null);
    setTimeout(() => {
      setResults({ computed: true, value: 0.67, status: "healthy" });
      setComputing(false);
    }, 2000);
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Analysis Suite</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:bg-zinc-700">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
        {ANALYSIS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive ? "bg-blue-600/20 text-blue-400 border border-blue-500/20" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        {activeTab === "vegetation" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Vegetation Index</label>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  {MOCK_VEGETATION.map((v) => (
                    <option key={v.abbr} value={v.abbr}>{v.abbr} — {v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1.5">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="last7">Last 7 Days</option>
                  <option value="last30">Last 30 Days</option>
                  <option value="last90">Last 90 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleCompute}
                  disabled={computing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {computing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {computing ? "Computing..." : "Run Analysis"}
                </button>
              </div>
            </div>

            {results && (
              <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-white">Results: {selectedIndex}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 block">Mean Value</span>
                    <span className="text-xl font-bold text-white">{results.value.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block">Status</span>
                    <span className={`text-sm font-semibold text-emerald-400 capitalize`}>{results.status}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block">Coverage</span>
                    <span className="text-xl font-bold text-white">94.2%</span>
                  </div>
                </div>
                {/* Simulated bar chart */}
                <div className="mt-3">
                  <span className="text-xs text-zinc-500 block mb-2">Distribution</span>
                  <div className="flex gap-1 h-16 items-end">
                    {[0.2, 0.35, 0.5, 0.65, 0.8, 0.9, 0.75, 0.6, 0.45, 0.3].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${h * 100}%` }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
                    <span>0.0</span><span>0.5</span><span>1.0</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "soil" && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">Soil Properties</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SoilGauge label="Moisture" value={MOCK_SOIL.moisture} unit="%" max={100} color="blue" />
              <SoilGauge label="pH Level" value={MOCK_SOIL.ph} unit="" max={14} color="emerald" />
              <SoilGauge label="Nitrogen" value={MOCK_SOIL.nitrogen} unit="%" max={100} color="violet" />
              <SoilGauge label="Organic Matter" value={MOCK_SOIL.organic} unit="%" max={10} color="amber" />
            </div>
          </div>
        )}

        {activeTab === "terrain" && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">Terrain Analysis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <span className="text-xs text-zinc-500 block mb-1">Elevation</span>
                <span className="text-2xl font-bold text-white">342m</span>
                <span className="text-xs text-zinc-500 block mt-1">Above sea level</span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <span className="text-xs text-zinc-500 block mb-1">Average Slope</span>
                <span className="text-2xl font-bold text-white">4.2°</span>
                <span className="text-xs text-zinc-500 block mt-1">Gentle gradient</span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <span className="text-xs text-zinc-500 block mb-1">Aspect</span>
                <span className="text-2xl font-bold text-white">SW</span>
                <span className="text-xs text-zinc-500 block mt-1">225° South-West</span>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <span className="text-xs text-zinc-500 block mb-3">Elevation Profile</span>
              <div className="flex gap-0.5 h-24 items-end">
                {Array.from({ length: 30 }, (_, i) => {
                  const h = 0.3 + Math.sin(i / 4) * 0.3 + Math.random() * 0.2;
                  return <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-700 to-amber-500" style={{ height: `${h * 100}%` }} />;
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "weather" && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">Current Conditions</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <Thermometer className="w-5 h-5 text-red-400 mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">{MOCK_WEATHER.temp}°C</span>
                <span className="text-xs text-zinc-500">Temperature</span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">{MOCK_WEATHER.humidity}%</span>
                <span className="text-xs text-zinc-500">Humidity</span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <Wind className="w-5 h-5 text-zinc-400 mx-auto mb-2" />
                <span className="text-2xl font-bold text-white block">{MOCK_WEATHER.windSpeed} km/h</span>
                <span className="text-xs text-zinc-500">Wind Speed</span>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
                {getWeatherIcon(MOCK_WEATHER.condition)}
                <span className="text-lg font-bold text-white block mt-2">{MOCK_WEATHER.condition}</span>
                <span className="text-xs text-zinc-500">Condition</span>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-white pt-2">7-Day Forecast</h4>
            <div className="grid grid-cols-7 gap-2">
              {MOCK_WEATHER.forecast.map((day) => (
                <div key={day.day} className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <span className="text-xs text-zinc-500 block">{day.day}</span>
                  <div className="my-2">{getWeatherIcon(day.condition)}</div>
                  <span className="text-sm font-bold text-white block">{day.temp}°</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "crop" && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">Crop Health Assessment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MOCK_FIELDS.slice(0, 4).map((field) => (
                <div key={field.id} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white">{field.name}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBg(field.status)}`}>
                      {getStatusLabel(field.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-500">Health Score</span>
                        <span className="text-white font-medium">{field.healthScore}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            field.healthScore >= 80 ? "bg-emerald-500" :
                            field.healthScore >= 60 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${field.healthScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <h5 className="text-sm font-medium text-white mb-3">Stress Detection</h5>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-2xl font-bold text-emerald-400">3</span>
                  <span className="text-xs text-zinc-500 block">Healthy Fields</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-amber-400">2</span>
                  <span className="text-xs text-zinc-500 block">Stressed Fields</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-400">1</span>
                  <span className="text-xs text-zinc-500 block">Critical Fields</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "prediction" && (
          <div className="space-y-5">
            <h4 className="text-sm font-semibold text-white">ML Yield Prediction</h4>
            <div className="bg-zinc-800/50 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-500/15 rounded-lg">
                  <Cpu className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-white block">Prediction Model</span>
                  <span className="text-xs text-zinc-500">Random Forest Regressor (v2.1)</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-zinc-500 block mb-1">Predicted Yield</span>
                  <span className="text-2xl font-bold text-white">4.8 t/ha</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-1">Confidence</span>
                  <span className="text-2xl font-bold text-emerald-400">92%</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block mb-1">vs Last Year</span>
                  <span className="text-2xl font-bold text-emerald-400">+12%</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-700/30">
                <span className="text-xs text-zinc-500 block mb-2">Feature Importance</span>
                <div className="space-y-2">
                  {[
                    { name: "NDVI Trend", importance: 0.32 },
                    { name: "Soil Moisture", importance: 0.24 },
                    { name: "Temperature", importance: 0.18 },
                    { name: "Rainfall", importance: 0.15 },
                    { name: "Soil pH", importance: 0.11 },
                  ].map((f) => (
                    <div key={f.name} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-24 shrink-0">{f.name}</span>
                      <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{ width: `${f.importance * 100}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-8 text-right">{(f.importance * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SOIL GAUGE
// ============================================================================

function SoilGauge({ label, value, unit, max, color }: { label: string; value: number; unit: string; max: number; color: string }) {
  const pct = (value / max) * 100;
  const colorMap: Record<string, string> = {
    blue: "from-blue-600 to-blue-400",
    emerald: "from-emerald-600 to-emerald-400",
    violet: "from-violet-600 to-violet-400",
    amber: "from-amber-600 to-amber-400",
  };

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <span className="text-sm font-bold text-white">{value}{unit}</span>
      </div>
      <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${colorMap[color] || colorMap.blue} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
        <span>0</span><span>{max / 2}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ============================================================================
// FIELDS VIEW
// ============================================================================

function FieldsView({ fields, viewMode, onViewChange, onSelectField }: {
  fields: Field[];
  viewMode: FieldView;
  onViewChange: (v: FieldView) => void;
  onSelectField: (f: Field) => void;
}) {
  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Fields</h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => onViewChange("grid")}
              className={`p-1.5 rounded-md ${viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewChange("list")}
              className={`p-1.5 rounded-md ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg">
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        </div>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
        {fields.map((field) => (
          <div
            key={field.id}
            onClick={() => onSelectField(field)}
            className={`bg-zinc-900/50 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all cursor-pointer ${
              viewMode === "grid" ? "p-4" : "p-3 flex items-center gap-4"
            }`}
          >
            {viewMode === "grid" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">{field.name}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBg(field.status)}`}>
                    {getStatusLabel(field.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-zinc-500 block">Area</span>
                    <span className="text-white font-medium">{field.area} ha</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Crop</span>
                    <span className="text-white font-medium">{field.cropType}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">NDVI</span>
                    <span className="text-white font-medium">{field.ndvi.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Health</span>
                    <span className="text-white font-medium">{field.healthScore}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-600 pt-2 border-t border-zinc-800">
                  <span>{field.location}</span>
                  <span>{field.lastAnalysis}</span>
                </div>
              </>
            ) : (
              <>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  field.status === "healthy" ? "bg-emerald-500/15 text-emerald-400" :
                  field.status === "stressed" ? "bg-amber-500/15 text-amber-400" :
                  "bg-red-500/15 text-red-400"
                }`}>
                  <Sprout className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white block truncate">{field.name}</span>
                  <span className="text-xs text-zinc-500">{field.cropType} &middot; {field.area} ha &middot; {field.location}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-white block">{field.healthScore}%</span>
                  <span className="text-[10px] text-zinc-500">Health</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// FIELD DETAIL MODAL
// ============================================================================

function FieldDetailModal({ field, onClose }: { field: Field; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-white">{field.name}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{field.location} &middot; {field.cropType}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <span className="text-xs text-zinc-500 block">Area</span>
              <span className="text-lg font-bold text-white">{field.area} ha</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <span className="text-xs text-zinc-500 block">NDVI</span>
              <span className="text-lg font-bold text-white">{field.ndvi.toFixed(2)}</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <span className="text-xs text-zinc-500 block">Health Score</span>
              <span className="text-lg font-bold text-white">{field.healthScore}%</span>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <span className="text-xs text-zinc-500 block">Status</span>
              <span className={`text-sm font-semibold ${
                field.status === "healthy" ? "text-emerald-400" :
                field.status === "stressed" ? "text-amber-400" : "text-red-400"
              }`}>{getStatusLabel(field.status)}</span>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-4">
            <span className="text-xs text-zinc-500 block mb-2">Health Progress</span>
            <div className="w-full h-2.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  field.healthScore >= 80 ? "bg-emerald-500" :
                  field.healthScore >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${field.healthScore}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
              <span>Critical</span><span>Stressed</span><span>Healthy</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
            <span>Last analysis: {field.lastAnalysis}</span>
            <span>ID: {field.id}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg">
              <BarChart3 className="w-3.5 h-3.5" /> Analyze
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg border border-zinc-700">
              <Map className="w-3.5 h-3.5" /> View on Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REPORTS VIEW
// ============================================================================

function ReportsView() {
  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Reports</h2>
        <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg">
          <Plus className="w-3.5 h-3.5" />
          Generate Report
        </button>
      </div>

      <div className="space-y-3">
        {MOCK_REPORTS.map((report) => (
          <div key={report.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 hover:border-zinc-700 transition-colors">
            <div className={`p-2.5 rounded-lg ${
              report.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
              report.status === "pending" ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            }`}>
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white block truncate">{report.title}</span>
              <span className="text-xs text-zinc-500">{report.type} &middot; {report.date} &middot; {report.size}</span>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
              report.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" :
              report.status === "pending" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" :
              "bg-red-500/15 text-red-400 border-red-500/20"
            }`}>
              {report.status}
            </span>
            <button className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS VIEW
// ============================================================================

function SettingsView() {
  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in max-w-2xl">
      <h2 className="text-lg font-bold text-white">Settings</h2>

      {/* API Configuration */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">Backend URL</label>
            <input
              type="text"
              defaultValue="http://localhost:8000"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-1.5">API Key</label>
            <input
              type="password"
              defaultValue="sk-••••••••••••••••"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Data Source Settings</h3>
        <div className="space-y-3">
          {DATA_SOURCES.map((ds) => (
            <div key={ds.name} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Satellite className="w-4 h-4 text-zinc-400" />
                <div>
                  <span className="text-sm text-white block">{ds.name}</span>
                  <span className="text-xs text-zinc-500">{ds.provider} &middot; Last sync: {ds.lastSync}</span>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full relative cursor-pointer ${
                ds.status === "connected" ? "bg-blue-600" : "bg-zinc-700"
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  ds.status === "connected" ? "left-[18px]" : "left-0.5"
                }`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Appearance</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Dark Mode</span>
            <div className="w-9 h-5 rounded-full bg-blue-600 relative cursor-pointer">
              <div className="absolute top-0.5 left-[18px] w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Map Labels</span>
            <div className="w-9 h-5 rounded-full bg-blue-600 relative cursor-pointer">
              <div className="absolute top-0.5 left-[18px] w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Auto-refresh Data</span>
            <div className="w-9 h-5 rounded-full bg-zinc-700 relative cursor-pointer">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

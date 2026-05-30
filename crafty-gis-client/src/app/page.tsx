"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  MessageSquare,
  Map,
  ListChecks,
  Files,
  History,
  Sparkles,
  Menu,
  X,
  Globe,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import MapPreview from "@/components/MapPreview";
import WorkflowPanel from "@/components/WorkflowPanel";
import OutputFiles from "@/components/OutputFiles";
import ActivityHistory from "@/components/ActivityHistory";

// --- Types ---
export type TabKey = "chat" | "map" | "workflow" | "files" | "history";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type: "chat" | "wizard_question" | "wizard_answer" | "investigation_question" | "investigation_complete" | "system" | "plan_updated";
  timestamp: string;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  tool: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  progress: number;
}

export interface OutputFile {
  id: string;
  name: string;
  file_type: string;
  file_size_display: string;
  created_at: string;
  is_downloadable: boolean;
}

export interface Activity {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: `🌍 **Welcome to CRAFTY GIS**

I'm your AI-powered geospatial analysis assistant. Tell me what you want to analyze — in plain language.

**Try saying something like:**
• "Show me land use change in my district over the last 5 years"
• "Analyze crop health for my farm using satellite data"
• "Create a flood risk map for this region"
• "Calculate NDVI for agricultural fields"`,
      type: "system",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([]);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "1",
      action: "session_started",
      description: "CRAFTY GIS session started",
      created_at: new Date().toISOString(),
    },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("default");
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("ready");
  const [investigationComplete, setInvestigationComplete] = useState(false);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { key: "chat", label: "Chat", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "map", label: "Map", icon: <Map className="w-4 h-4" />, badge: "Live" },
    { key: "workflow", label: "Workflow", icon: <ListChecks className="w-4 h-4" />, badge: workflowTasks.filter(t => t.status === "running").length || undefined },
    { key: "files", label: "Outputs", icon: <Files className="w-4 h-4" />, badge: outputFiles.length || undefined },
    { key: "history", label: "History", icon: <History className="w-4 h-4" /> },
  ];

  // Initialize session
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/chat/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.session_id) setSessionId(data.session_id);
      })
      .catch(() => {
        // Server not running - demo mode
        setSessionId("demo");
      });
  }, [projectId]);

  const handleSendMessage = useCallback(
    async (content: string, type: string = "chat") => {
      if (!content.trim() || isProcessing) return;

      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: "user",
        content: content,
        type: type as any,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiUrl}/api/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            project_id: projectId,
            message: content,
            message_type: type,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          const assistantMsg: Message = {
            id: `msg_${Date.now()}_resp`,
            role: "assistant",
            content: data.reply,
            type: data.message_type || "chat",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          if (data.workflow_update) {
            setWorkflowTasks(
              data.workflow_update.tasks?.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                tool: t.tool,
                status: t.status,
                progress: t.progress,
              })) || []
            );
          }

          if (data.investigation_complete) {
            setInvestigationComplete(true);
          }

          // Add activity
          setActivities((prev) => [
            {
              id: `act_${Date.now()}`,
              action: data.message_type || "message_sent",
              description: content.slice(0, 100) + (content.length > 100 ? "..." : ""),
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        } else {
          // Fallback AI response for demo mode
          const demoResponse = await getDemoResponse(content);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_resp`,
              role: "assistant",
              content: demoResponse.reply,
              type: demoResponse.type as any,
              timestamp: new Date().toISOString(),
            },
          ]);
          if (demoResponse.workflowTasks) {
            setWorkflowTasks(demoResponse.workflowTasks);
          }
        }
      } catch {
        // Demo mode - server not available
        const demoResponse = await getDemoResponse(content);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}_resp`,
            role: "assistant",
            content: demoResponse.reply,
            type: demoResponse.type as any,
            timestamp: new Date().toISOString(),
          },
        ]);
        if (demoResponse.workflowTasks) {
          setWorkflowTasks(demoResponse.workflowTasks);
        }
      }

      setIsProcessing(false);
    },
    [sessionId, projectId, isProcessing]
  );

  const handleExecuteAnalysis = useCallback(async () => {
    if (!sessionId) return;
    setIsProcessing(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/chat/session/${sessionId}/execute`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisStatus("running");
        setWorkflowTasks(
          data.workflow?.tasks?.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            tool: t.tool,
            status: t.status,
            progress: t.progress,
          })) || []
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}_exec`,
            role: "system",
            content: `🚀 **Analysis Started!**

Executing ${data.workflow?.tasks?.length || 0} tasks in the workflow. You can monitor progress in the **Workflow** tab and view results on the **Map**.

*You can interrupt at any time to add new requirements.*`,
            type: "system",
            timestamp: new Date().toISOString(),
          },
        ]);

        setActiveTab("workflow");
        pollWorkflowStatus(data.workflow_id);
      }
    } catch {
      // Demo mode
      setAnalysisStatus("running");
      const demoWorkflow = generateDemoWorkflow();
      setWorkflowTasks(demoWorkflow);
      setActiveTab("workflow");
      simulateProgress(demoWorkflow);
    }

    setIsProcessing(false);
  }, [sessionId]);

  const pollWorkflowStatus = (workflowId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/analysis/workflow/${workflowId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.tasks) {
            setWorkflowTasks(
              data.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                tool: t.tool,
                status: t.status,
                progress: t.progress,
              }))
            );
          }
          if (!data.is_running) {
            clearInterval(interval);
            setAnalysisStatus("completed");
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}_done`,
                role: "system",
                content: "✅ **Analysis Complete!** All tasks finished. Check the **Outputs** tab to download your results.",
                type: "system",
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        }
      } catch {
        clearInterval(interval);
      }
    }, 2000);
  };

  const simulateProgress = (tasks: WorkflowTask[]) => {
    let completed = 0;
    const interval = setInterval(() => {
      if (completed < tasks.length) {
        setWorkflowTasks((prev) =>
          prev.map((t, i) =>
            i === completed ? { ...t, status: "running", progress: 100 } : t
          )
        );
        setTimeout(() => {
          setWorkflowTasks((prev) =>
            prev.map((t, i) =>
              i === completed ? { ...t, status: "completed", progress: 100 } : t
            )
          );
          completed++;
        }, 1000);
      } else {
        clearInterval(interval);
        setAnalysisStatus("completed");
        setOutputFiles([
          {
            id: "out1", name: "classification_map.png", file_type: "png",
            file_size_display: "2.4 MB", created_at: new Date().toISOString(), is_downloadable: true,
          },
          {
            id: "out2", name: "analysis_report.html", file_type: "html",
            file_size_display: "156 KB", created_at: new Date().toISOString(), is_downloadable: true,
          },
          {
            id: "out3", name: "ndvi_output.tif", file_type: "geotiff",
            file_size_display: "8.1 MB", created_at: new Date().toISOString(), is_downloadable: true,
          },
          {
            id: "out4", name: "statistics.json", file_type: "json",
            file_size_display: "12 KB", created_at: new Date().toISOString(), is_downloadable: true,
          },
        ]);
        setActiveTab("files");
      }
    }, 1500);
  };

  const handleInterrupt = useCallback(async () => {
    if (!sessionId) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${apiUrl}/api/chat/session/${sessionId}/interrupt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", message_type: "interruption" }),
      });
    } catch {}
    setAnalysisStatus("interrupted");
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}_int`,
        role: "system",
        content: "⏸️ **Analysis Interrupted.** You can now provide additional instructions to adjust the workflow.",
        type: "system",
        timestamp: new Date().toISOString(),
      },
    ]);
    setActiveTab("chat");
  }, [sessionId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-zinc-900/90 backdrop-blur-xl border-r border-zinc-800 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crafty-500 to-emerald-500 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">CRAFTY GIS</h1>
              <p className="text-[10px] text-zinc-500 font-medium">v1.0.0 · AI Platform</p>
            </div>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? "bg-crafty-500/10 text-crafty-400 border border-crafty-500/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab.key === "map"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : tab.key === "workflow"
                      ? "bg-crafty-500/20 text-crafty-400 animate-pulse"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Status footer */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                analysisStatus === "running"
                  ? "bg-crafty-400 animate-pulse"
                  : analysisStatus === "completed"
                  ? "bg-emerald-400"
                  : "bg-zinc-500"
              }`}
            />
            <span className="text-xs text-zinc-500 capitalize">
              {analysisStatus === "ready"
                ? "Ready"
                : analysisStatus === "running"
                ? "Processing..."
                : analysisStatus}
            </span>
            {investigationComplete && analysisStatus === "ready" && (
              <button
                onClick={handleExecuteAnalysis}
                disabled={isProcessing}
                className="ml-auto text-[10px] bg-crafty-500 hover:bg-crafty-600 disabled:opacity-50 text-white px-2 py-1 rounded font-medium"
              >
                Execute
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 h-14 bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 flex items-center px-4 gap-3">
        <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-crafty-500 to-emerald-500 flex items-center justify-center">
          <Globe className="w-3 h-3 text-white" />
        </div>
        <span className="text-sm font-semibold">CRAFTY GIS</span>
        {analysisStatus === "running" && (
          <span className="ml-auto text-xs text-crafty-400 animate-pulse flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Processing
          </span>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 lg:pt-0 pt-14">
        {/* Top bar */}
        <div className="hidden lg:flex h-12 items-center px-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Sparkles className="w-3.5 h-3.5 text-crafty-400" />
            <span>
              {analysisStatus === "ready"
                ? "Describe your geospatial problem in the chat panel"
                : analysisStatus === "running"
                ? "Analysis in progress"
                : `Analysis ${analysisStatus}`}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {analysisStatus === "running" && (
              <button
                onClick={handleInterrupt}
                className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded font-medium"
              >
                Interrupt
              </button>
            )}
            {investigationComplete && analysisStatus === "ready" && (
              <button
                onClick={handleExecuteAnalysis}
                disabled={isProcessing}
                className="text-xs bg-crafty-500 hover:bg-crafty-600 disabled:opacity-50 text-white px-3 py-1 rounded font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Execute Analysis
              </button>
            )}
          </div>
        </div>

        {/* Panels */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <ChatPanel
              messages={messages}
              onSend={handleSendMessage}
              onExecute={handleExecuteAnalysis}
              isProcessing={isProcessing}
              investigationComplete={investigationComplete}
              analysisStatus={analysisStatus}
            />
          )}
          {activeTab === "map" && <MapPreview />}
          {activeTab === "workflow" && (
            <WorkflowPanel
              tasks={workflowTasks}
              isRunning={analysisStatus === "running"}
              onInterrupt={handleInterrupt}
            />
          )}
          {activeTab === "files" && (
            <OutputFiles files={outputFiles} onRefresh={() => {}} />
          )}
          {activeTab === "history" && (
            <ActivityHistory activities={activities} />
          )}
        </div>
      </main>
    </div>
  );
}

// --- Demo / Fallback Responses ---

async function getDemoResponse(input: string): Promise<{
  reply: string;
  type: string;
  workflowTasks?: WorkflowTask[];
}> {
  const lower = input.toLowerCase();

  if (input === "Proceed with analysis" || input === "Execute analysis" || input === "Proceed") {
    return {
      reply: "✅ **Starting analysis now!** I'll execute the full workflow. Check the Workflow tab for progress.",
      type: "system",
      workflowTasks: generateDemoWorkflow(),
    };
  }

  if (lower.includes("ndvi") || lower.includes("vegetation") || lower.includes("crop health")) {
    return {
      reply: `🌿 **Vegetation Analysis Investigation**

To run a comprehensive vegetation health analysis, I need a few details:

1. **📍 Location:** Which area should I analyze? (e.g., district, farm name, coordinates)
2. **📅 Time Period:** For what dates? (e.g., "last 3 months" or "compare this year vs last year")
3. **📊 Output Format:** Do you want a map, a report with statistics, or both?
4. **🎯 Purpose:** Is this for academic research, farm management, or a business report?

Please share these details and I'll create the perfect analysis plan!`,
      type: "investigation_question",
    };
  }

  if (lower.includes("lulc") || lower.includes("land cover") || lower.includes("land use") || lower.includes("classification")) {
    return {
      reply: `🗺️ **Land Use/Land Cover Classification Investigation**

Great choice! Let me understand what you need:

1. **📍 Study Area:** Which region/district?
2. **📅 Time Period:** Single date or multi-temporal change analysis?
3. **🎯 Classification Scheme:** How many classes? (Standard: Built-up, Agriculture, Forest, Water, Barren)
4. **📏 Resolution Preference:** Use Sentinel-2 (10m) or Landsat (30m)?
5. **✅ Accuracy:** Need accuracy assessment with ground truth data?

Answer these and I'll set up the complete workflow!`,
      type: "investigation_question",
    };
  }

  if (lower.includes("flood") || lower.includes("water")) {
    return {
      reply: `🌊 **Flood Mapping Investigation**

I'll help you map flood extents. Please tell me:

1. **📍 Location:** Which area was affected?
2. **📅 Date:** When did the flood occur? (For matching satellite overpass)
3. **🛰️ Data Preference:** Use Sentinel-1 SAR (sees through clouds) or optical imagery?
4. **📋 Output:** Need flood extent map, area statistics, or affected infrastructure analysis?

Let me know and I'll get started!`,
      type: "investigation_question",
    };
  }

  if (lower.includes("terrain") || lower.includes("dem") || lower.includes("elevation") || lower.includes("slope")) {
    return {
      reply: `⛰️ **Terrain Analysis Investigation**

I can generate comprehensive terrain products. Please specify:

1. **📍 Location:** Which area's elevation data?
2. **📏 Resolution:** SRTM 30m is default — need finer resolution?
3. **📊 Products Needed:** Slope, Aspect, Hillshade, Contours, or all?
4. **💧 Hydrology:** Include watershed delineation and drainage networks?

Tell me what you need and I'll process the DEM data!`,
      type: "investigation_question",
    };
  }

  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return {
      reply: `👋 **Hello! Welcome to CRAFTY GIS.**

I'm ready to help you with any geospatial analysis. Here's what I can do:

🌿 **Vegetation Analysis** — NDVI, EVI, crop health assessment
🗺️ **Land Cover Classification** — LULC mapping from satellite data
🌊 **Flood Mapping** — Flood extent from SAR/optical imagery
⛰️ **Terrain Analysis** — DEM processing, slope, hydrology
🏙️ **Urban Analysis** — Sprawl mapping, land use change
📈 **Change Detection** — Multi-temporal analysis
📄 **Report Generation** — Auto-generated analysis reports

**What would you like to analyze today?** 🚀`,
      type: "chat",
      workflowTasks: generateDemoWorkflow(),
    };
  }

  // Default investigation response
  return {
    reply: `🤔 **Let me understand your request better.**

I can help with many types of geospatial analysis. Could you tell me:

1. **📍 What area** are you interested in? (district, city, farm, coordinates)
2. **📋 What type** of analysis do you need? (LULC, NDVI, flood mapping, terrain, urban, change detection?)
3. **📅 Time frame:** Is this for current conditions or historical analysis?
4. **🎯 Your goal:** Research, business decision, academic project, or personal curiosity?

The more you share, the better I can tailor the analysis! 🌍`,
    type: "investigation_question",
  };
}

function generateDemoWorkflow(): WorkflowTask[] {
  return [
    {
      id: "t1",
      title: "Search & Download Satellite Imagery",
      description: "Query Sentinel-2 archive for study area",
      tool: "Sentinel Hub",
      status: "pending",
      progress: 0,
    },
    {
      id: "t2",
      title: "Preprocess & Cloud Mask",
      description: "Atmospheric correction, cloud masking, resampling",
      tool: "GDAL",
      status: "pending",
      progress: 0,
    },
    {
      id: "t3",
      title: "Compute Vegetation Indices",
      description: "NDVI, EVI, NDWI computation from multispectral bands",
      tool: "Rasterio",
      status: "pending",
      progress: 0,
    },
    {
      id: "t4",
      title: "Run Classification",
      description: "Random Forest LULC classification",
      tool: "Python/Scikit-learn",
      status: "pending",
      progress: 0,
    },
    {
      id: "t5",
      title: "Generate Maps & Visualizations",
      description: "Create publication-ready maps with legends",
      tool: "Matplotlib",
      status: "pending",
      progress: 0,
    },
    {
      id: "t6",
      title: "Generate Comprehensive Report",
      description: "Auto-generated PDF/HTML report with statistics",
      tool: "Report Generator",
      status: "pending",
      progress: 0,
    },
  ];
}

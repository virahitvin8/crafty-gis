"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, Map, Sparkles, Bot, User, Info, Loader2, Send } from "lucide-react";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  type: string;
  timestamp: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: `🌍 **Welcome to CRAFTY GIS**

I'm your geospatial analysis assistant. Tell me what you want to analyze in plain language.

**Examples:**
• "Show me crop health using NDVI"
• "Detect water bodies with MNDWI"
• "Map urban areas with Built-up Index"
• "Detect methane plumes"
• "Classify land cover"`,
      type: "system",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>("ready");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: content,
      type: "chat",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Try to connect to the backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/analysis/types`, {
        method: "GET",
      });

      if (response.ok) {
        // Backend is available, send the message to chat endpoint
        const chatResponse = await fetch(`${apiUrl}/api/chat/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            message_type: "chat",
          }),
        });

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          const assistantMsg: Message = {
            id: `msg_${Date.now()}_resp`,
            role: "assistant",
            content: data.reply,
            type: data.message_type || "chat",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // If the response indicates we should execute analysis
          if (data.analysis_type) {
            setAnalysisStatus("running");
            // Execute the analysis
            const analysisResponse = await fetch(`${apiUrl}/api/analysis/run`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                analysis_type: data.analysis_type,
                parameters: data.parameters || {},
              }),
            });

            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              setMessages((prev) => [
                ...prev,
                {
                  id: `msg_${Date.now()}_analysis`,
                  role: "system",
                  content: `🚀 **Analysis Started**: ${data.analysis_type.replace("_", " ").toUpperCase()}`,
                  type: "system",
                  timestamp: new Date().toISOString(),
                },
              ]);
              // In a real app, we'd poll for completion
              setTimeout(() => {
                setAnalysisStatus("completed");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `msg_${Date.now()}_done`,
                    role: "system",
                    content: "✅ **Analysis Complete!** Results are ready for download.",
                    type: "system",
                    timestamp: new Date().toISOString(),
                  },
                ]);
              }, 3000);
            }
          }
        }
      } else {
        // Backend not available, use demo responses
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
          // Handle demo workflow
          setAnalysisStatus("running");
          setTimeout(() => {
            setAnalysisStatus("completed");
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}_done`,
                role: "system",
                content: "✅ **Demo Analysis Complete!**",
                type: "system",
                timestamp: new Date().toISOString(),
              },
            ]);
          }, 2000);
        }
      }
    } catch (error) {
      // Demo mode - backend not available
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
        setAnalysisStatus("running");
        setTimeout(() => {
          setAnalysisStatus("completed");
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_done`,
              role: "system",
              content: "✅ **Demo Analysis Complete!**",
              type: "system",
              timestamp: new Date().toISOString(),
            },
          ]);
        }, 2000);
      }
    }

    setIsProcessing(false);
  };

  const getDemoResponse = async (input: string): Promise<{
    reply: string;
    type: string;
    workflowTasks?: any[];
  }> => {
    const lower = input.toLowerCase();

    if (lower.includes("ndvi") || lower.includes("vegetation") || lower.includes("crop health")) {
      return {
        reply: `🌿 **NDVI Analysis Selected**

I'll compute the Normalized Difference Vegetation Index to assess vegetation health and crop conditions.

This analysis uses near-infrared and red bands to quantify plant vigor and health.

In a full implementation, this would process satellite imagery and generate:
- NDVI value map (-1 to 1 scale)
- Health classification (stressed, moderate, healthy)
- Statistical summary (mean, min, max, std deviation)`,
        type: "chat",
      };
    }

    if (lower.includes("mndwi") || lower.includes("water") || lower.includes("wet")) {
      return {
        reply: `💧 **MNDWI Analysis Selected**

I'll compute the Modified Normalized Difference Water Index to detect and map water bodies.

This index uses green and short-wave infrared bands to enhance water features while suppressing built-up areas.

Results would include:
- Water extent map
- Water body statistics
- Change detection capabilities (with multi-temporal data)`,
        type: "chat",
      };
    }

    if (lower.includes("built") || lower.includes("urban") || lower.includes("built-up")) {
      return {
        reply: `🏙️ **Built-up Index Analysis Selected**

I'll calculate the Built-up Index to detect urban areas and monitor urban sprawl.

This index uses short-wave infrared and near-infrared bands to highlight built-up surfaces.

Output would include:
- Urban extent map
- Built-up density analysis
- Sprawl monitoring capabilities`,
        type: "chat",
      };
    }

    if (lower.includes("methane") || lower.includes("gas") || lower.includes("plume")) {
      return {
        reply: `🌫️ **Methane Detection Analysis Selected**

I'll analyze short-wave infrared bands to detect methane gas plumes and emissions.

This analysis identifies anomalous absorption features indicative of methane leaks.

Results would show:
- Methane concentration hotspots
- Plume morphology and extent
- Emission rate estimates`,
        type: "chat",
      };
    }

    if (lower.includes("lulc") || lower.includes("land cover") || lower.includes("classification")) {
      return {
        reply: `🗺️ **Land Use/Land Cover Classification Selected**

I'll perform unsupervised classification of satellite imagery to map land cover types.

Using clustering algorithms on multispectral bands, I'll identify:
- Different land cover classes (vegetation, water, urban, bare soil, etc.)
- Spatial distribution of each class
- Classification accuracy metrics`,
        type: "chat",
      };
    }

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      return {
        reply: `👋 **Hello! Welcome to CRAFTY GIS.**

I can help you with these core geospatial analyses:

🌿 **NDVI** - Vegetation health and crop monitoring
💧 **MNDWI** - Water body detection and mapping
🏙️ **Built-up Index** - Urban area detection and sprawl monitoring
🌫️ **Methane Detection** - Gas leak and plume identification
🗺️ **LULC Classification** - Land cover mapping and change detection

**What would you like to analyze?**
Just describe it in plain language!`,
        type: "chat",
      };
    }

    // Default response
    return {
      reply: `🤔 **Let me understand your request better.**

I specialize in these five core analyses for agriculture, gas, and remote sensing:

1. **NDVI** - Crop health and vegetation monitoring
2. **MNDWI** - Water body detection
3. **Built-up Index** - Urban area detection
4. **Methane Detection** - Gas plume identification
5. **LULC Classification** - Land cover mapping

Please describe what you'd like to analyze, and I'll select the appropriate method!

**Examples:**
- "Show me crop health in my fields"
- "Map the lakes and rivers in this area"
- "Detect urban expansion near the city"
- "Look for methane leaks near the facility"
- "Classify land cover for this watershed"`,
      type: "investigation_question",
    };
  };

  const renderMessage = (msg: Message) => {
    const isUser = msg.role === "user";
    const isSystem = msg.role === "system";

    return (
      <div
        key={msg.id}
        className={`flex gap-3 animate-slide-up ${
          isUser ? "flex-row-reverse" : ""
        } ${isSystem ? "opacity-80" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser
              ? "bg-crafty-500/20 text-crafty-400"
              : isSystem
                ? "bg-zinc-700 text-zinc-400"
                : "bg-gradient-to-br from-crafty-500 to-emerald-500 text-white"
          }`}
        >
          {isUser ? (
            <User className="w-4 h-4" />
          ) : isSystem ? (
            <Info className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <div className={`flex-1 max-w-[85%] ${
          isUser ? "items-end" : "items-start"
        }`}>
          <div
            className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "bg-crafty-500/20 border border-crafty-500/20 text-zinc-100"
                : isSystem
                  ? "bg-zinc-800/50 border border-zinc-700/50 text-zinc-300"
                  : "bg-zinc-800/30 border border-zinc-700/30 text-zinc-200"
            }`}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              {renderContent(msg.content)}
            </div>
          </div>

          {/* Execute button for completed investigations */}
          {msg.type === "investigation_complete" && analysisStatus === "ready" && (
            <div className="mt-2">
              <button
                onClick={() => {
                  // In a real app, this would trigger analysis based on the investigation
                  setAnalysisStatus("running");
                  setTimeout(() => {
                    setAnalysisStatus("completed");
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `msg_${Date.now()}_done`,
                        role: "system",
                        content: "✅ **Analysis Complete!**",
                        type: "system",
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }, 1500);
                }}
                disabled={isProcessing}
                className="flex items-center gap-1.5 text-xs bg-crafty-500 hover:bg-crafty-600
                         disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium
                         transition-all duration-150"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold headers
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-semibold text-zinc-100 mb-1">
            {line.slice(2, -2)}
          </p>
        );
      }
      // Bullet points
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <p key={i} className="text-zinc-300 ml-2 mb-0.5">
            {line}
          </p>
        );
      }
      // Numbered items
      if (/^\d+\./.test(line)) {
        return (
          <p key={i} className="text-zinc-300 ml-2 mb-0.5">
            {line}
          </p>
        );
      }
      // Bold inline text
      const withBold = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>');
      return (
        <p key={i} className="mb-0.5" dangerouslySetInnerHTML={{ __html: withBold }} />
      );
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Sidebar */}
      <aside
        className="w-64 bg-zinc-900/90 backdrop-blur-xl border-r border-zinc-800 flex flex-col"
      >
        {/* Brand */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crafty-500 to-emerald-500 flex items-center justify-center">
              <Map className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">CRAFTY GIS</h1>
              <p className="text-[10px] text-zinc-500 font-medium">v1.0.0 · Analysis Platform</p>
            </div>
          </div>
        </div>

        {/* Status */}
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
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 lg:pt-0 pt-14">
        {/* Top bar */}
        <div className="hidden lg:flex h-12 items-center px-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Sparkles className="w-3.5 h-3.5 text-crafty-400" />
            <span>
              {analysisStatus === "ready"
                ? "Ask me to perform a geospatial analysis"
                : analysisStatus === "running"
                  ? "Analysis in progress"
                  : `Analysis ${analysisStatus}`}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {analysisStatus === "running" && (
              <button
                onClick={() => {
                  // In a real app, this would interrupt the analysis
                  setAnalysisStatus("ready");
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `msg_${Date.now()}_int`,
                      role: "system",
                      content: "⏸️ **Analysis Interrupted.**",
                      type: "system",
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }}
                className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1 rounded font-medium"
              >
                Interrupt
              </button>
            )}
            {analysisStatus === "ready" && (
              <button
                onClick={() => {
                  // Trigger a sample analysis for demonstration
                  setAnalysisStatus("running");
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `msg_${Date.now()}_demo`,
                      role: "system",
                      content: "🚀 **Starting NDVI Analysis Demo...**",
                      type: "system",
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                  setTimeout(() => {
                    setAnalysisStatus("completed");
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `msg_${Date.now()}_done`,
                        role: "system",
                        content: "✅ **NDVI Analysis Complete!** Vegetation health map generated.",
                        type: "system",
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }, 2000);
                }}
                className="text-xs bg-crafty-500 hover:bg-crafty-600 disabled:opacity-50 text-white px-3 py-1 rounded font-medium"
              >
                Try Demo Analysis
              </button>
            )}
          </div>
        </div>

        {/* Panels */}
        <div className="flex-1 overflow-hidden">
          {/* Chat panel */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(renderMessage)}

            {/* AI Processing indicator */}
            {isProcessing && (
              <div className="flex gap-3 animate-slide-up">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-crafty-500 to-emerald-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              </div>
            )}

            {/* Welcome suggestions */}
            {messages.length === 1 && (
              <div className="mt-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-crafty-400" />
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Try asking:
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">• "Show me crop health using NDVI"</p>
                  <p className="text-xs text-zinc-400">• "Detect water bodies with MNDWI"</p>
                  <p className="text-xs text-zinc-400">• "Map urban areas"</p>
                  <p className="text-xs text-zinc-400">• "Look for methane plumes"</p>
                  <p className="text-xs text-zinc-400">• "Classify land cover"</p>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-zinc-800 bg-zinc-900/50 p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe your geospatial analysis..."
                  rows={1}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
                           text-sm text-zinc-100 placeholder-zinc-500 resize-none
                           focus:outline-none focus:ring-2 focus:ring-crafty-500/30 focus:border-crafty-500/50
                           transition-all duration-150"
                  style={{ minHeight: "44px", maxHeight: "120px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 120) + "px";
                  }}
                  disabled={isProcessing}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="flex-shrink-0 w-11 h-11 rounded-xl bg-crafty-500 hover:bg-crafty-600
                         disabled:bg-zinc-800 disabled:text-zinc-600 text-white
                         flex items-center justify-center transition-all duration-150"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {/* Status indicators */}
            <div className="flex items-center gap-3 mt-2 px-1">
              <span className="text-[10px] text-zinc-600">
                {isProcessing
                  ? "AI is analyzing your request..."
                  : analysisStatus === "running"
                    ? "Analysis in progress"
                    : "Shift+Enter for new line"}
              </span>
              {analysisStatus === "running" && (
                <span className="flex items-center gap-1 text-[10px] text-crafty-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing
                </span>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Import Lightbulb for the suggestions
import { Lightbulb } from "lucide-react";
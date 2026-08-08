"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Info,
  Loader2,
  StopCircle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import type { Message } from "@/app/page";

interface ChatPanelProps {
  messages: Message[];
  onSend: (content: string, type?: string) => void;
  onExecute: () => void;
  isProcessing: boolean;
  investigationComplete: boolean;
  analysisStatus: string;
}

const suggestionExamples = [
  "Show me land use change in my district",
  "Analyze crop health using satellite data",
  "Create a flood risk map for this region",
  "Calculate NDVI for agricultural fields",
  "Generate a terrain analysis report",
];

export default function ChatPanel({
  messages,
  onSend,
  onExecute,
  isProcessing,
  investigationComplete,
  analysisStatus,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
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

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;
    setShowSuggestions(false);
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setShowSuggestions(false);
    onSend(suggestion);
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
        <div
          className={`flex-1 max-w-[85%] ${
            isUser ? "items-end" : "items-start"
          }`}
        >
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

          {/* Wizard suggestions / Quick actions */}
          {(msg.type === "investigation_question" || msg.type === "wizard_question") && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Yes, let me provide details", "Show me options", "Skip this step"].map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSend(suggestion, "wizard_answer")}
                    disabled={isProcessing}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 
                             px-2.5 py-1 rounded-lg transition-all duration-150 
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          )}

          {/* Investigation complete - show execute button */}
          {msg.type === "investigation_complete" && analysisStatus === "ready" && (
            <div className="mt-2">
              <button
                onClick={onExecute}
                disabled={isProcessing}
                className="flex items-center gap-1.5 text-xs bg-crafty-500 hover:bg-crafty-600 
                         disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-medium
                         transition-all duration-150"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Execute Analysis
                <ArrowRight className="w-3.5 h-3.5" />
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
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
        {showSuggestions && messages.length <= 1 && (
          <div className="mt-6 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-crafty-400" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Try these examples
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestionExamples.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isProcessing}
                  className="text-left text-xs bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 
                           text-zinc-300 px-3 py-2.5 rounded-lg transition-all duration-150
                           hover:border-crafty-500/30 hover:text-zinc-100
                           disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="line-clamp-2">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
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
              placeholder="Describe your geospatial analysis problem..."
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
    </div>
  );
}

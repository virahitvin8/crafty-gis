"use client";

import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import type { WorkflowTask } from "@/app/page";

interface WorkflowPanelProps {
  tasks: WorkflowTask[];
  isRunning: boolean;
  onInterrupt: () => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: {
    icon: <Circle className="w-4 h-4" />,
    color: "text-zinc-600",
    label: "Pending",
  },
  running: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    color: "text-crafty-400",
    label: "Running",
  },
  completed: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "text-emerald-400",
    label: "Completed",
  },
  failed: {
    icon: <XCircle className="w-4 h-4" />,
    color: "text-red-400",
    label: "Failed",
  },
  skipped: {
    icon: <SkipForward className="w-4 h-4" />,
    color: "text-zinc-500",
    label: "Skipped",
  },
};

export default function WorkflowPanel({
  tasks,
  isRunning,
  onInterrupt,
}: WorkflowPanelProps) {
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <Play className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Active Workflow</h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Start a conversation in the Chat panel. When the AI investigation is complete,
          you can execute the analysis and see the workflow here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Workflow Progress</h2>
            <p className="text-xs text-zinc-500">
              {completedCount} of {tasks.length} tasks completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={onInterrupt}
                className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 
                         hover:bg-amber-500/20 border border-amber-500/20 px-2.5 py-1.5 rounded-lg
                         transition-all duration-150"
              >
                <Pause className="w-3 h-3" />
                Interrupt
              </button>
            )}
            <div className="text-right">
              <div className="text-lg font-bold text-zinc-200">{progress}%</div>
              <div className="text-[10px] text-zinc-500">Complete</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              failedCount > 0
                ? "bg-red-500"
                : progress === 100
                ? "bg-emerald-500"
                : "bg-crafty-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {failedCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" />
            {failedCount} task(s) failed
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tasks.map((task, index) => {
          const config = statusConfig[task.status] || statusConfig.pending;

          return (
            <div
              key={task.id}
              className={`group rounded-xl border p-3.5 transition-all duration-150 ${
                task.status === "running"
                  ? "bg-crafty-500/5 border-crafty-500/20 animate-pulse-glow"
                  : task.status === "completed"
                  ? "bg-zinc-800/20 border-zinc-700/30"
                  : task.status === "failed"
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-zinc-800/10 border-zinc-800/50 hover:bg-zinc-800/20"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                  {config.icon}
                </div>

                {/* Task details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                    <h3
                      className={`text-sm font-medium truncate ${
                        task.status === "completed"
                          ? "text-zinc-400 line-through"
                          : "text-zinc-200"
                      }`}
                    >
                      {task.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
                      {task.tool}
                    </span>
                    <span className={`text-[10px] font-medium ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </div>

                {/* Progress indicator */}
                {task.status === "running" && (
                  <div className="flex-shrink-0">
                    <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-crafty-500 rounded-full transition-all duration-500"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

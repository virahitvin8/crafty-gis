"use client";

import {
  History,
  MessageSquare,
  Map,
  Sparkles,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";
import type { Activity } from "@/app/page";

interface ActivityHistoryProps {
  activities: Activity[];
}

const activityIcons: Record<string, React.ReactNode> = {
  session_started: <Sparkles className="w-3.5 h-3.5" />,
  message_sent: <MessageSquare className="w-3.5 h-3.5" />,
  investigation_question: <MessageSquare className="w-3.5 h-3.5" />,
  investigation_complete: <CheckCircle2 className="w-3.5 h-3.5" />,
  analysis_started: <Map className="w-3.5 h-3.5" />,
  analysis_completed: <CheckCircle2 className="w-3.5 h-3.5" />,
  analysis_failed: <AlertCircle className="w-3.5 h-3.5" />,
  file_downloaded: <Download className="w-3.5 h-3.5" />,
  workflow_updated: <Sparkles className="w-3.5 h-3.5" />,
};

const activityColors: Record<string, string> = {
  session_started: "text-crafty-400",
  message_sent: "text-blue-400",
  investigation_question: "text-crafty-400",
  investigation_complete: "text-emerald-400",
  analysis_started: "text-crafty-400",
  analysis_completed: "text-emerald-400",
  analysis_failed: "text-red-400",
  file_downloaded: "text-purple-400",
  workflow_updated: "text-amber-400",
};

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function ActivityHistory({ activities }: ActivityHistoryProps) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
          <History className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Activity Yet</h3>
        <p className="text-sm text-zinc-500 max-w-md">
          Your session activity will appear here — including queries, analyses, file downloads, and system events.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Activity History</h2>
          <p className="text-xs text-zinc-500">{activities.length} event(s)</p>
        </div>
        <button
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 
                   transition-colors duration-150"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-800" />

          <div className="space-y-3">
            {activities.map((activity, index) => {
              const icon = activityIcons[activity.action] || <Clock className="w-3.5 h-3.5" />;
              const color = activityColors[activity.action] || "text-zinc-400";

              return (
                <div key={activity.id} className="relative flex items-start gap-4 animate-fade-in">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full 
                                bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center ${color}`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="text-sm text-zinc-300 line-clamp-2">
                      {activity.description}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

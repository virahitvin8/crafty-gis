import React from 'react';
import { Clock, CheckCircle2, AlertCircle, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface ActivityHistoryProps {
  history: any[];
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={14} className="text-green-400" />;
    case 'failed':
      return <AlertCircle size={14} className="text-red-400" />;
    case 'running':
      return <Play size={14} className="text-amber-400" />;
    default:
      return <Clock size={14} className="text-surface-500" />;
  }
};

export default function ActivityHistory({ history }: ActivityHistoryProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 py-4 border-b border-surface-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crafty-400 to-crafty-700 flex items-center justify-center">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Activity</h2>
            <p className="text-[10px] text-surface-400">Past sessions & analyses</p>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {history.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mx-auto mb-3">
              <Clock size={24} className="text-surface-600" />
            </div>
            <p className="text-sm text-surface-500">No activity yet</p>
            <p className="text-xs text-surface-600 mt-1">
              Your analysis history will appear here
            </p>
            <div className="mt-4 p-3 rounded-xl bg-surface-800/30 border border-surface-800/50">
              <p className="text-[10px] text-surface-500 leading-relaxed">
                <span className="text-crafty-400 font-medium">Tip:</span> Start by describing a problem in the chat. CRAFTY GIS will ask questions, generate a workflow, and save everything here.
              </p>
            </div>
          </div>
        ) : (
          history.map((item, i) => (
            <div
              key={item.id || i}
              className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-surface-800/50 transition-colors cursor-pointer group"
            >
              <div className="mt-0.5">{statusIcon(item.status)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-surface-200 truncate group-hover:text-white transition-colors">
                  {item.name}
                </p>
                <p className="text-[10px] text-surface-500 mt-0.5">
                  {new Date(item.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded text-surface-500 hover:text-crafty-400 transition-all">
                <RotateCcw size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-surface-800">
        <div className="flex items-center justify-between text-[10px] text-surface-600">
          <span>CRAFTY GIS v0.1.0</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Local AI
          </span>
        </div>
      </div>
    </div>
  );
}

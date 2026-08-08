import React from 'react';
import { WorkflowTask } from '../App';
import { CheckCircle2, Circle, Loader2, AlertCircle, Play, ListTodo } from 'lucide-react';
import clsx from 'clsx';

interface WorkflowPanelProps {
  tasks: WorkflowTask[];
  status: 'idle' | 'planned' | 'running' | 'completed' | 'failed';
}

const statusConfig = {
  idle: { icon: ListTodo, color: 'text-surface-500', label: 'Waiting...' },
  planned: { icon: Play, color: 'text-crafty-400', label: 'Ready to Execute' },
  running: { icon: Loader2, color: 'text-amber-400', label: 'Processing...' },
  completed: { icon: CheckCircle2, color: 'text-green-400', label: 'Completed' },
  failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
};

const taskStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 size={16} className="text-green-400 shrink-0" />;
    case 'running':
      return <Loader2 size={16} className="text-amber-400 animate-spin shrink-0" />;
    case 'failed':
      return <AlertCircle size={16} className="text-red-400 shrink-0" />;
    default:
      return <Circle size={16} className="text-surface-600 shrink-0" />;
  }
};

const toolColors: Record<string, string> = {
  gdal: 'bg-green-500/10 text-green-400 border-green-500/20',
  qgis: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  saga: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  grass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  python: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  fragstats: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function WorkflowPanel({ tasks, status }: WorkflowPanelProps) {
  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="flex flex-col h-1/2 min-h-0">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-surface-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ListTodo size={16} className="text-crafty-400" />
            Workflow
          </h3>
          <span className={clsx('text-xs font-medium flex items-center gap-1', statusConfig[status].color)}>
            {status === 'running' ? <StatusIcon size={12} className="animate-spin" /> : <StatusIcon size={12} />}
            {statusConfig[status].label}
          </span>
        </div>
        {tasks.length > 0 && (
          <div className="flex gap-1">
            {['pending', 'running', 'completed', 'failed'].map(s => {
              const count = tasks.filter(t => t.status === s).length;
              if (count === 0) return null;
              return (
                <span
                  key={s}
                  className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    s === 'completed' && 'bg-green-500/10 text-green-400',
                    s === 'running' && 'bg-amber-500/10 text-amber-400',
                    s === 'failed' && 'bg-red-500/10 text-red-400',
                    s === 'pending' && 'bg-surface-800 text-surface-400'
                  )}
                >
                  {count} {s}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-surface-800 flex items-center justify-center mb-3">
              <ListTodo size={24} className="text-surface-600" />
            </div>
            <p className="text-sm text-surface-500">No workflow generated yet</p>
            <p className="text-xs text-surface-600 mt-1">
              Describe a problem in the chat to create one
            </p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div
              key={task.id}
              className={clsx(
                'flex items-start gap-3 p-2.5 rounded-xl transition-all',
                task.status === 'running'
                  ? 'bg-amber-500/5 border border-amber-500/10'
                  : task.status === 'completed'
                  ? 'bg-green-500/5 border border-green-500/10'
                  : 'bg-surface-800/30 border border-surface-800/50'
              )}
            >
              {/* Step number or icon */}
              <div className="mt-0.5">{taskStatusIcon(task.status)}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'text-xs font-medium',
                    task.status === 'completed' ? 'text-green-400' :
                    task.status === 'running' ? 'text-amber-300' :
                    task.status === 'failed' ? 'text-red-400' :
                    'text-surface-300'
                  )}>
                    {task.title}
                  </span>
                  {task.tool && (
                    <span className={clsx(
                      'text-[9px] px-1.5 py-0.5 rounded border font-medium',
                      toolColors[task.tool] || 'bg-surface-700 text-surface-400 border-surface-600'
                    )}>
                      {task.tool.toUpperCase()}
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-1">{task.description}</p>
                )}
                {/* Progress bar */}
                {task.status === 'running' && (
                  <div className="mt-1.5 h-1 bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

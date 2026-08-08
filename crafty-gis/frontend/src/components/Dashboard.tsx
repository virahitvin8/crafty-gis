import React, { useState } from 'react';
import { Message, WorkflowTask, OutputFile } from '../App';
import ChatPanel from './ChatPanel';
import MapPreview from './MapPreview';
import WorkflowPanel from './WorkflowPanel';
import OutputFiles from './OutputFiles';
import ActivityHistory from './ActivityHistory';
import { Globe, Bot, Menu, X, Sparkles } from 'lucide-react';

interface DashboardProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  workflowTasks: WorkflowTask[];
  workflowStatus: 'idle' | 'planned' | 'running' | 'completed' | 'failed';
  onExecuteWorkflow: () => void;
  onInterrupt: (instruction: string) => void;
  outputFiles: OutputFile[];
  activityHistory: any[];
  currentPlan: Record<string, any> | null;
  error: string | null;
}

export default function Dashboard({
  messages,
  onSendMessage,
  isProcessing,
  workflowTasks,
  workflowStatus,
  onExecuteWorkflow,
  onInterrupt,
  outputFiles,
  activityHistory,
  currentPlan,
  error,
}: DashboardProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInterrupt, setShowInterrupt] = useState(false);
  const [interruptText, setInterruptText] = useState('');

  const handleInterruptSubmit = () => {
    if (interruptText.trim()) {
      onInterrupt(interruptText);
      setInterruptText('');
      setShowInterrupt(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* === TOP NAVBAR === */}
      <header className="glass border-b border-surface-800 px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-surface-800 transition-colors text-surface-400"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crafty-400 to-crafty-700 flex items-center justify-center">
              <Globe size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white leading-tight">CRAFTY GIS</h1>
              <p className="text-[10px] text-surface-400 leading-tight">Conversational Remote Analysis & Field Technology</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-green-400 font-medium">AI Ready</span>
          </div>
          {workflowStatus === 'running' && (
            <button
              onClick={() => setShowInterrupt(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <Sparkles size={14} />
              Adjust
            </button>
          )}
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <div className="flex flex-1 overflow-hidden">
        {/* === SIDEBAR (Activity History) === */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } absolute lg:relative lg:translate-x-0 z-10 w-72 h-full transition-transform duration-200 ease-in-out bg-surface-900 border-r border-surface-800 overflow-y-auto shrink-0`}
        >
          <ActivityHistory history={activityHistory} />
        </aside>

        {/* === CENTER: Chat + Map === */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Map Preview */}
          <div className="h-[45%] min-h-[200px] bg-surface-900 relative">
            <MapPreview />
          </div>

          {/* Chat Panel */}
          <div className="flex-1 min-h-0 border-t border-surface-800">
            <ChatPanel
              messages={messages}
              onSendMessage={onSendMessage}
              isProcessing={isProcessing}
              workflowStatus={workflowStatus}
              onExecuteWorkflow={onExecuteWorkflow}
            />
          </div>
        </main>

        {/* === RIGHT PANEL: Workflow + Outputs === */}
        <aside className="w-80 border-l border-surface-800 bg-surface-900/50 flex flex-col shrink-0 overflow-hidden">
          <WorkflowPanel
            tasks={workflowTasks}
            status={workflowStatus}
          />
          <div className="h-px bg-surface-800" />
          <OutputFiles files={outputFiles} />
        </aside>
      </div>

      {/* === INTERRUPT MODAL === */}
      {showInterrupt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-900 rounded-2xl border border-surface-700 p-6 w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Adjust Your Request</h3>
                <p className="text-sm text-surface-400">Add new instructions or change the analysis parameters</p>
              </div>
            </div>
            <textarea
              value={interruptText}
              onChange={(e) => setInterruptText(e.target.value)}
              placeholder="e.g., Also include agricultural land in the analysis, or use 7 classes instead of 5..."
              className="w-full h-28 bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 text-sm text-white placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-crafty-500 resize-none"
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowInterrupt(false)}
                className="px-4 py-2 rounded-xl text-sm text-surface-300 hover:bg-surface-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInterruptSubmit}
                className="px-5 py-2 rounded-xl bg-crafty-600 hover:bg-crafty-500 text-white text-sm font-medium transition-colors"
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../App';
import { Send, Bot, User, Play, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  workflowStatus: string;
  onExecuteWorkflow: () => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isProcessing,
  workflowStatus,
  onExecuteWorkflow,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Format message content with basic markdown-like rendering
  const formatMessage = (content: string) => {
    // Bold
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-surface-300">$1</em>');
    // Code blocks
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-surface-950 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-crafty-300 border border-surface-700"><code>$2</code></pre>');
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-surface-800 px-1.5 py-0.5 rounded text-xs font-mono text-crafty-300">$1</code>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br/>');
    return formatted;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'flex gap-3 chat-enter',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div
              className={clsx(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
                msg.role === 'user'
                  ? 'bg-crafty-600/20 border border-crafty-500/20'
                  : 'bg-gradient-to-br from-crafty-400 to-crafty-700'
              )}
            >
              {msg.role === 'user' ? (
                <User size={15} className="text-crafty-400" />
              ) : (
                <Bot size={15} className="text-white" />
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-crafty-600/20 border border-crafty-500/20 text-surface-200'
                  : 'bg-surface-800/50 border border-surface-700/50 text-surface-200'
              )}
            >
              <div
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                className="space-y-1"
              />
              <div className="mt-1.5 text-[10px] text-surface-500">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex gap-3 chat-enter">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-crafty-400 to-crafty-700 flex items-center justify-center shrink-0">
              <Bot size={15} className="text-white" />
            </div>
            <div className="bg-surface-800/50 border border-surface-700/50 rounded-2xl px-5 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-crafty-400 pulse-dot" />
                <span className="w-2 h-2 rounded-full bg-crafty-400 pulse-dot" />
                <span className="w-2 h-2 rounded-full bg-crafty-400 pulse-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Execute Workflow Button */}
        {workflowStatus === 'planned' && (
          <div className="flex justify-center py-2 chat-enter">
            <button
              onClick={onExecuteWorkflow}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-crafty-600 to-crafty-500 hover:from-crafty-500 hover:to-crafty-400 text-white font-medium text-sm shadow-lg shadow-crafty-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play size={16} />
              Execute Analysis Workflow
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-surface-800 px-4 py-3 bg-surface-900/80"
      >
        <div className="flex items-center gap-2 bg-surface-800 rounded-xl border border-surface-700 focus-within:border-crafty-500/50 focus-within:ring-1 focus-within:ring-crafty-500/20 transition-all px-3 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your geospatial problem..."
            className="flex-1 bg-transparent text-sm text-white placeholder-surface-500 focus:outline-none py-2"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className={clsx(
              'p-2 rounded-lg transition-all',
              input.trim() && !isProcessing
                ? 'bg-crafty-600 hover:bg-crafty-500 text-white shadow-lg shadow-crafty-500/20'
                : 'bg-surface-700 text-surface-500 cursor-not-allowed'
            )}
          >
            {isProcessing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-surface-600 mt-1.5 text-center">
          Describe any GIS, remote sensing, or agriculture problem — CRAFTY GIS handles the rest
        </p>
      </form>
    </div>
  );
}

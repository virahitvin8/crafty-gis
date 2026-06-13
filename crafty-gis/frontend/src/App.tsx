import React, { useState, useCallback, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { sendChatMessage, interruptAnalysis, listProjects, createProject, ChatResponse } from './services/api';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  tool?: string;
}

export interface OutputFile {
  name: string;
  path: string;
  size: number;
  format: string;
  type: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Welcome to **CRAFTY GIS**! 🌍\n\nI'm your AI-powered geospatial analysis assistant. Tell me what problem you want to solve — whether it's land cover mapping, vegetation health analysis, terrain modeling, or any other GIS task — and I'll handle everything from data download to final report.\n\n**What would you like to analyze today?**",
      timestamp: new Date(),
    },
  ]);
  const [projectId, setProjectId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<'idle' | 'planned' | 'running' | 'completed' | 'failed'>('idle');
  const [currentPlan, setCurrentPlan] = useState<Record<string, any> | null>(null);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize project on mount
  useEffect(() => {
    const init = async () => {
      try {
        const projects = await listProjects();
        if (projects.projects.length === 0) {
          const project = await createProject({ name: 'My First Analysis' });
          setProjectId(project.id);
        } else {
          setProjectId(projects.projects[0].id);
        }
      } catch (e) {
        console.warn('Backend not available, running in demo mode');
        setProjectId('demo-project');
      }
    };
    init();
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isProcessing) return;

    setError(null);
    const userMsg: Message = { role: 'user', content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await sendChatMessage(message, projectId);

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response || 'Processing your request...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setProjectId(response.project_id);

      // If plan is ready, update workflow
      if (response.plan && response.message_type === 'plan_ready') {
        setCurrentPlan(response.plan);
        if (response.plan.tasks) {
          setWorkflowTasks(
            response.plan.tasks.map((t: any) => ({
              id: t.id || `task_${Math.random().toString(36).slice(2)}`,
              title: t.title,
              description: t.description || '',
              status: 'pending',
              progress: 0,
              tool: t.tool,
            }))
          );
          setWorkflowStatus('planned');
        }
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Connection Issue**: ${e.message || 'Unable to reach the AI service.'}\n\nPlease ensure Ollama is running (\`ollama serve\`) and the backend is started.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [projectId, isProcessing]);

  const handleExecuteWorkflow = useCallback(async () => {
    if (!currentPlan || !projectId) return;
    setWorkflowStatus('running');

    // Simulate task execution
    const updatedTasks = [...workflowTasks];
    for (let i = 0; i < updatedTasks.length; i++) {
      updatedTasks[i] = { ...updatedTasks[i], status: 'running' };
      setWorkflowTasks([...updatedTasks]);
      await new Promise(r => setTimeout(r, 1500));
      updatedTasks[i] = { ...updatedTasks[i], status: 'completed', progress: 100 };
      setWorkflowTasks([...updatedTasks]);
    }
    setWorkflowStatus('completed');

    // Add to activity history
    setActivityHistory(prev => [
      {
        id: projectId,
        name: currentPlan.analysis_type || 'Analysis',
        date: new Date().toISOString(),
        status: 'completed',
      },
      ...prev,
    ]);

    // Mock output files
    setOutputFiles([
      { name: 'classified_map.tif', path: '/outputs/classified_map.tif', size: 2450000, format: '.tif', type: 'Raster' },
      { name: 'analysis_report.pdf', path: '/outputs/report.pdf', size: 1200000, format: '.pdf', type: 'Report' },
      { name: 'land_cover_stats.csv', path: '/outputs/stats.csv', size: 45000, format: '.csv', type: 'Table' },
      { name: 'study_area_boundary.geojson', path: '/outputs/boundary.geojson', size: 128000, format: '.geojson', type: 'Vector' },
    ]);
  }, [currentPlan, projectId, workflowTasks]);

  const handleInterrupt = useCallback(async (newInstruction: string) => {
    try {
      const response = await interruptAnalysis(projectId, newInstruction);
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response || 'Plan updated!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.plan) {
        setCurrentPlan(response.plan);
        if (response.plan.tasks) {
          setWorkflowTasks(
            response.plan.tasks.map((t: any) => ({
              id: t.id || `task_${Math.random().toString(36).slice(2)}`,
              title: t.title,
              description: t.description || '',
              status: 'pending',
              progress: 0,
              tool: t.tool,
            }))
          );
          setWorkflowStatus('planned');
        }
      }
    } catch (e: any) {
      console.error('Interrupt error:', e);
    }
  }, [projectId]);

  return (
    <Dashboard
      messages={messages}
      onSendMessage={handleSendMessage}
      isProcessing={isProcessing}
      workflowTasks={workflowTasks}
      workflowStatus={workflowStatus}
      onExecuteWorkflow={handleExecuteWorkflow}
      onInterrupt={handleInterrupt}
      outputFiles={outputFiles}
      activityHistory={activityHistory}
      currentPlan={currentPlan}
      error={error}
    />
  );
}

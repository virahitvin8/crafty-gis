/** API client for CRAFTY GIS backend */

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }
  return res.json();
}

// === Chat API ===

export interface ChatResponse {
  response: string;
  project_id: string;
  message_type: 'question' | 'plan_ready' | 'plan_updated' | 'error';
  plan?: Record<string, any>;
}

export async function sendChatMessage(
  message: string,
  projectId?: string
): Promise<ChatResponse> {
  return request<ChatResponse>('/chat/send', {
    method: 'POST',
    body: JSON.stringify({ message, project_id: projectId }),
  });
}

export async function interruptAnalysis(
  projectId: string,
  newInstruction: string
): Promise<ChatResponse> {
  return request<ChatResponse>('/chat/interrupt', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, new_instruction: newInstruction }),
  });
}

// === Projects API ===

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function listProjects(): Promise<{ projects: Project[] }> {
  return request('/projects/');
}

export async function createProject(data: {
  name: string;
  description?: string;
}): Promise<Project> {
  return request<Project>('/projects/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<Project> {
  return request(`/projects/${id}`);
}

// === Analysis API ===

export async function startAnalysis(
  projectId: string,
  plan: Record<string, any>,
  execute: boolean = false
): Promise<any> {
  return request('/analysis/start', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, plan, execute }),
  });
}

export async function getWorkflow(projectId: string): Promise<any> {
  return request(`/analysis/workflow/${projectId}`);
}

// === Data API ===

export async function downloadData(params: {
  source: string;
  bounds: [number, number, number, number];
  start_date?: string;
  end_date?: string;
  location_name?: string;
}): Promise<any> {
  return request('/data/download', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function listDataFiles(): Promise<any> {
  return request('/data/files');
}

// === System ===

export async function checkHealth(): Promise<any> {
  return request('/health');
}

export async function checkOllamaHealth(): Promise<any> {
  return request('/chat/health');
}

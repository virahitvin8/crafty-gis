// Crafty GIS API Client
// Handles all communication with the backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

class CraftyAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async health() {
    return this.request<{ status: string; version: string }>("/health");
  }

  // Vegetation indices
  async computeNDVI(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/ndvi", { method: "POST", body: params });
  }

  async computeEVI(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/evi", { method: "POST", body: params });
  }

  async computeGNDVI(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/gndvi", { method: "POST", body: params });
  }

  async computeNDRE(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/ndre", { method: "POST", body: params });
  }

  async computeNDMI(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/ndmi", { method: "POST", body: params });
  }

  async computeNDWI(params: { lat: number; lng: number; start_date: string; end_date: string }) {
    return this.request("/api/vegetation/ndwi", { method: "POST", body: params });
  }

  async getVegetationTimeSeries(params: { lat: number; lng: number; start_date: string; end_date: string; index: string }) {
    return this.request("/api/vegetation/timeseries", { method: "POST", body: params });
  }

  // Soil
  async getSoilProperties(params: { lat: number; lng: number }) {
    return this.request("/api/soil/properties", { method: "POST", body: params });
  }

  async getSoilHealthScore(params: { lat: number; lng: number }) {
    return this.request("/api/soil/health-score", { method: "POST", body: params });
  }

  // Terrain
  async getElevation(params: { lat: number; lng: number }) {
    return this.request("/api/terrain/elevation", { method: "POST", body: params });
  }

  async getSlope(params: { lat: number; lng: number }) {
    return this.request("/api/terrain/slope", { method: "POST", body: params });
  }

  // Weather
  async getCurrentWeather(params: { lat: number; lng: number }) {
    return this.request(`/api/weather/current?lat=${params.lat}&lng=${params.lng}`);
  }

  async getWeatherForecast(params: { lat: number; lng: number }) {
    return this.request(`/api/weather/forecast?lat=${params.lat}&lng=${params.lng}`);
  }

  async getET0(params: { lat: number; lng: number }) {
    return this.request(`/api/weather/et0?lat=${params.lat}&lng=${params.lng}`);
  }

  // Crop monitoring
  async getCropHealth(params: { lat: number; lng: number; crop_type: string }) {
    return this.request("/api/crop/health", { method: "POST", body: params });
  }

  async detectCropStress(params: { lat: number; lng: number; crop_type: string }) {
    return this.request("/api/crop/stress", { method: "POST", body: params });
  }

  async predictYield(params: { lat: number; lng: number; crop_type: string; area: number }) {
    return this.request("/api/crop/yield-prediction", { method: "POST", body: params });
  }

  // Fields
  async listFields() {
    return this.request("/api/field/list");
  }

  async saveField(field: any) {
    return this.request("/api/field/save", { method: "POST", body: field });
  }

  async getField(id: string) {
    return this.request(`/api/field/${id}`);
  }

  async deleteField(id: string) {
    return this.request(`/api/field/${id}`, { method: "DELETE" });
  }

  // Reports
  async generateReport(params: { field_id: string; type: string }) {
    return this.request("/api/report/generate", { method: "POST", body: params });
  }

  // Chat
  async sendChatMessage(message: string, sessionId?: string) {
    return this.request("/api/chat/message", {
      method: "POST",
      body: { message, session_id: sessionId },
    });
  }

  // AI Status
  async getAIStatus() {
    return this.request("/api/ai/status");
  }
}

export const api = new CraftyAPI();
export default api;

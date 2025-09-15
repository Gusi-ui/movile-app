/**
 * API Client para conectar con el panel web SAD Gusi
 */
const API_BASE_URL = process.env["EXPO_PUBLIC_API_URL"] ||
  "http://localhost:3001";

interface ApiResponse<T> {
  data: T;
  error?: string;
}

class ApiClient {
  private readonly baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return {
        data: null as T,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Autenticación
  async loginWorker(email: string, password: string) {
    return this.request("/api/workers/auth", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logoutWorker() {
    return this.request("/api/workers/logout", {
      method: "POST",
    });
  }

  // Asignaciones
  async getAssignments(workerId: string) {
    return this.request(`/api/assignments?workerId=${workerId}`);
  }

  async getAssignment(assignmentId: string) {
    return this.request(`/api/assignments/${assignmentId}`);
  }

  async updateAssignmentStatus(assignmentId: string, status: string) {
    return this.request(`/api/assignments/${assignmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  // Trabajadores
  async getWorker(workerId: string) {
    return this.request(`/api/workers/${workerId}`);
  }

  async getWorkerBalances(workerId: string) {
    return this.request(`/api/workers/${workerId}/balances`);
  }

  async getWorkerNotes(workerId: string) {
    return this.request(`/api/workers/${workerId}/notes`);
  }

  async createWorkerNote(workerId: string, note: string) {
    return this.request(`/api/workers/${workerId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  // Rutas
  async getWorkerRoute(workerId: string, date?: string) {
    const endpoint = date
      ? `/api/workers/${workerId}/route/${date}`
      : `/api/workers/${workerId}/route`;
    return this.request(endpoint);
  }

  // Usuarios
  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`);
  }

  async getUserAddress(userId: string) {
    return this.request(`/api/users/${userId}/address`);
  }

  // Festivos
  async getHolidays() {
    return this.request("/api/holidays");
  }

  async validateHolidays() {
    return this.request("/api/holidays/validate");
  }
}

// Instancia del cliente API
export const apiClient = new ApiClient(API_BASE_URL);

// Funciones de conveniencia
export const {
  loginWorker,
  logoutWorker,
  getAssignments,
  getAssignment,
  updateAssignmentStatus,
  getWorker,
  getWorkerBalances,
  getWorkerNotes,
  createWorkerNote,
  getWorkerRoute,
  getUser,
  getUserAddress,
  getHolidays,
  validateHolidays,
} = apiClient;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Worker } from '../types';
import { 
  Assignment, 
  Route, 
  Balance, 
  Note, 
  UserSettings, 
  WorkerStats,
  ApiResponse,
  PaginatedResponse,
  AssignmentFilters,
  RouteFilters,
  BalanceFilters
} from '../types/database';

// Configuración de la API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sadlas.com/v1';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.baseURL}${endpoint}`;
      
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: data.message || `HTTP error! status: ${response.status}`,
          status: response.status,
        };
      }

      return {
        data,
        error: null,
        status: response.status,
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Métodos de autenticación
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  // Métodos de trabajador
  async getWorkerProfile(): Promise<ApiResponse<Worker>> {
    return this.request<Worker>('/worker/profile');
  }

  async updateWorkerProfile(data: Partial<Worker>): Promise<ApiResponse<Worker>> {
    return this.request<Worker>('/worker/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Métodos de asignaciones
  async getAssignments(filters?: AssignmentFilters): Promise<ApiResponse<PaginatedResponse<Assignment>>> {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = queryParams ? `/worker/assignments?${queryParams}` : '/worker/assignments';
    return this.request<PaginatedResponse<Assignment>>(endpoint);
  }

  async getAssignmentDetail(id: string): Promise<ApiResponse<Assignment>> {
    return this.request<Assignment>(`/worker/assignments/${id}`);
  }

  async updateAssignmentStatus(id: string, status: string): Promise<ApiResponse<Assignment>> {
    return this.request<Assignment>(`/worker/assignments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Métodos de ruta
  async getRoutes(filters?: RouteFilters): Promise<ApiResponse<PaginatedResponse<Route>>> {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = queryParams ? `/worker/routes?${queryParams}` : '/worker/routes';
    return this.request<PaginatedResponse<Route>>(endpoint);
  }

  async getCurrentRoute(): Promise<ApiResponse<Route | null>> {
    return this.request<Route | null>('/worker/route/current');
  }

  async getRouteDetail(id: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/worker/routes/${id}`);
  }

  async updateRouteStatus(id: string, status: string): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/worker/routes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Métodos de balances
  async getBalances(filters?: BalanceFilters): Promise<ApiResponse<PaginatedResponse<Balance>>> {
    const queryParams = filters ? new URLSearchParams(filters as any).toString() : '';
    const endpoint = queryParams ? `/worker/balances?${queryParams}` : '/worker/balances';
    return this.request<PaginatedResponse<Balance>>(endpoint);
  }

  async getBalanceDetail(id: string): Promise<ApiResponse<Balance>> {
    return this.request<Balance>(`/worker/balances/${id}`);
  }

  // Métodos de notas
  async getNotes(): Promise<ApiResponse<PaginatedResponse<Note>>> {
    return this.request<PaginatedResponse<Note>>('/worker/notes');
  }

  async createNote(data: Partial<Note>): Promise<ApiResponse<Note>> {
    return this.request<Note>('/worker/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(id: string, data: Partial<Note>): Promise<ApiResponse<Note>> {
    return this.request<Note>(`/worker/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/worker/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos de configuración
  async getUserSettings(): Promise<ApiResponse<UserSettings>> {
    return this.request<UserSettings>('/worker/settings');
  }

  async updateUserSettings(settings: Partial<UserSettings>): Promise<ApiResponse<UserSettings>> {
    return this.request<UserSettings>('/worker/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Métodos de estadísticas
  async getWorkerStats(): Promise<ApiResponse<WorkerStats>> {
    return this.request<WorkerStats>('/worker/stats');
  }
}

// Instancia singleton del cliente API
const apiClient = new ApiClient(API_BASE_URL);

// Funciones exportadas para mantener compatibilidad
export const authenticateWorker = (email: string, password: string) => 
  apiClient.login(email, password);

export const logoutWorker = () => apiClient.logout();

export const getWorkerProfile = () => apiClient.getWorkerProfile();

export const updateWorkerProfile = (data: Partial<Worker>) => 
  apiClient.updateWorkerProfile(data);

export const getAssignments = (filters?: AssignmentFilters) => apiClient.getAssignments(filters);

export const getAssignmentDetail = (id: string) => 
  apiClient.getAssignmentDetail(id);

export const updateAssignmentStatus = (id: string, status: string) => 
  apiClient.updateAssignmentStatus(id, status);

export const getRoutes = (filters?: RouteFilters) => apiClient.getRoutes(filters);

export const getCurrentRoute = () => apiClient.getCurrentRoute();

export const getBalances = (filters?: BalanceFilters) => apiClient.getBalances(filters);

export const getNotes = () => apiClient.getNotes();

export const createNote = (data: Partial<Note>) => apiClient.createNote(data);

export const updateNote = (id: string, data: Partial<Note>) => 
  apiClient.updateNote(id, data);

export const deleteNote = (id: string) => apiClient.deleteNote(id);

export default apiClient;

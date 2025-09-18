import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, Worker } from '../types';

// Configuración de la API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.sadlas.com/v1';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

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
  async getAssignments(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/worker/assignments');
  }

  async getAssignmentDetail(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/worker/assignments/${id}`);
  }

  async updateAssignmentStatus(id: string, status: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/worker/assignments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Métodos de ruta
  async getRoute(): Promise<ApiResponse<any>> {
    return this.request<any>('/worker/route');
  }

  // Métodos de balances
  async getBalances(): Promise<ApiResponse<any>> {
    return this.request<any>('/worker/balances');
  }

  // Métodos de notas
  async getNotes(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/worker/notes');
  }

  async createNote(content: string): Promise<ApiResponse<any>> {
    return this.request<any>('/worker/notes', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateNote(id: string, content: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/worker/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteNote(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/worker/notes/${id}`, {
      method: 'DELETE',
    });
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

export const getAssignments = () => apiClient.getAssignments();

export const getAssignmentDetail = (id: string) => 
  apiClient.getAssignmentDetail(id);

export const updateAssignmentStatus = (id: string, status: string) => 
  apiClient.updateAssignmentStatus(id, status);

export const getRoute = () => apiClient.getRoute();

export const getBalances = () => apiClient.getBalances();

export const getNotes = () => apiClient.getNotes();

export const createNote = (content: string) => apiClient.createNote(content);

export const updateNote = (id: string, content: string) => 
  apiClient.updateNote(id, content);

export const deleteNote = (id: string) => apiClient.deleteNote(id);

export default apiClient;

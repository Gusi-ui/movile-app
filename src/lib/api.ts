import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthResponse, Worker } from '../types';
import logger from '../utils/logger';
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
  BalanceFilters,
} from '../types/database';

// Configuración de la API
const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.sadlas.com/v1';

  // En Android, localhost no funciona, necesitamos usar 10.0.2.2
  if (envUrl.includes('localhost') && Platform.OS === 'android') {
    logger.debug('🤖 Detectado Android - Cambiando localhost por 10.0.2.2');
    return envUrl.replace('localhost', '10.0.2.2');
  }

  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();
const MOCK_API = process.env.EXPO_PUBLIC_MOCK_API === 'true';

// Debug: Log para verificar la URL
logger.debug('🔧 API_BASE_URL configurada:', API_BASE_URL);
logger.debug(
  '🔧 EXPO_PUBLIC_API_URL original:',
  process.env.EXPO_PUBLIC_API_URL
);
logger.debug('🔧 MOCK_API habilitado:', MOCK_API);

// Datos mock para pruebas
const MOCK_WORKER: Worker = {
  id: 'worker-001',
  email: 'maria.garcia@sadlas.com',
  name: 'María',
  surname: 'García',
  phone: '+34 666 123 456',
  dni: '12345678A',
  worker_type: 'cuidador',
  role: 'worker',
  is_active: true,
  monthly_contracted_hours: 160,
  weekly_contracted_hours: 40,
  address: 'Calle Mayor 123',
  postal_code: '28001',
  city: 'Madrid',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_AUTH_RESPONSE: AuthResponse = {
  worker: MOCK_WORKER,
  token: 'mock-jwt-token-12345',
  refresh_token: 'mock-refresh-token-67890',
};

// Datos mock para asignaciones de servicios de ayuda a domicilio
const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assignment-001',
    title: 'Cuidado personal - María López',
    description:
      'Asistencia en higiene personal, vestido y medicación matutina',
    status: 'assigned',
    priority: 'high',
    worker_id: 'worker-001',
    assigned_by: 'coordinator-001',
    address: 'Calle de la Rosa 15, 3º B, Madrid',
    latitude: 40.4168,
    longitude: -3.7038,
    assigned_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    estimated_duration: 120,
    notes:
      'Paciente con movilidad reducida. Medicación a las 9:00h. Clave del portal: 1234B',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'assignment-002',
    title: 'Limpieza doméstica - Carmen García',
    description: 'Limpieza general del hogar, cocina y baño',
    status: 'pending',
    priority: 'medium',
    worker_id: 'worker-001',
    assigned_by: 'coordinator-001',
    address: 'Avenida de los Rosales 28, 1º A, Madrid',
    latitude: 40.42,
    longitude: -3.71,
    assigned_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    estimated_duration: 90,
    notes:
      'Especial atención a la cocina. Productos de limpieza en el armario bajo el fregadero',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'assignment-003',
    title: 'Acompañamiento - José Martínez',
    description: 'Compañía y apoyo emocional, paseo por el parque',
    status: 'assigned',
    priority: 'medium',
    worker_id: 'worker-001',
    assigned_by: 'coordinator-001',
    address: 'Plaza del Sol 7, 2º C, Madrid',
    latitude: 40.415,
    longitude: -3.705,
    assigned_at: new Date().toISOString(),
    due_date: new Date().toISOString(),
    estimated_duration: 60,
    notes:
      'Le gusta hablar de sus nietos. Si hace buen tiempo, paseo por el Parque del Retiro',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'assignment-004',
    title: 'Cuidado personal - Ana Rodríguez',
    description: 'Asistencia en ducha, vestido y preparación de comida',
    status: 'in_progress',
    priority: 'high',
    worker_id: 'worker-001',
    assigned_by: 'coordinator-001',
    address: 'Calle Mayor 142, 4º D, Madrid',
    latitude: 40.418,
    longitude: -3.702,
    assigned_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    due_date: new Date().toISOString(),
    estimated_duration: 150,
    notes:
      'Dieta sin sal. Medicación después del almuerzo. Familiar de contacto: 666-123-456',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Datos mock para rutas de servicios de ayuda a domicilio
const MOCK_ROUTES: Route[] = [
  {
    id: 'route-001',
    name: 'Ruta Matutina - Centro',
    description:
      'Servicios de cuidado personal y asistencia matutina en zona centro',
    status: 'active',
    worker_id: 'worker-001',
    created_by: 'coordinator-001',
    start_location: {
      address: 'Centro de Coordinación - Calle Alcalá 50',
      latitude: 40.4168,
      longitude: -3.7038,
    },
    end_location: {
      address: 'Centro de Coordinación - Calle Alcalá 50',
      latitude: 40.4168,
      longitude: -3.7038,
    },
    scheduled_date: new Date().toISOString(),
    started_at: new Date().toISOString(),
    total_assignments: 8,
    completed_assignments: 5,
    estimated_duration: 300,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'route-002',
    name: 'Ruta Vespertina - Chamberí',
    description: 'Servicios de limpieza y acompañamiento en distrito Chamberí',
    status: 'planned',
    worker_id: 'worker-001',
    created_by: 'coordinator-001',
    start_location: {
      address: 'Metro Bilbao - Calle de Fuencarral',
      latitude: 40.43,
      longitude: -3.7,
    },
    end_location: {
      address: 'Metro Bilbao - Calle de Fuencarral',
      latitude: 40.43,
      longitude: -3.7,
    },
    scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    total_assignments: 6,
    completed_assignments: 0,
    estimated_duration: 240,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Datos mock para balances
const MOCK_BALANCES: Balance[] = [
  {
    id: 'balance-001',
    worker_id: 'worker-001',
    period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    base_salary: 1500.0,
    overtime_hours: 10,
    overtime_rate: 15.0,
    bonuses: 200.0,
    deductions: 50.0,
    total_amount: 1800.0,
    status: 'approved',
    approved_by: 'admin-001',
    approved_at: new Date().toISOString(),
    assignments_completed: 45,
    routes_completed: 8,
    notes: 'Buen rendimiento este mes',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'balance-002',
    worker_id: 'worker-001',
    period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    base_salary: 1500.0,
    overtime_hours: 5,
    overtime_rate: 15.0,
    bonuses: 100.0,
    deductions: 25.0,
    total_amount: 1650.0,
    status: 'paid',
    approved_by: 'admin-001',
    approved_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    paid_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    assignments_completed: 38,
    routes_completed: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private createQueryParams(
    filters:
      | Record<string, unknown>
      | AssignmentFilters
      | RouteFilters
      | BalanceFilters
  ): string {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(key, String(item)));
        } else {
          params.append(key, String(value));
        }
      }
    });
    return params.toString();
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      logger.error('Error getting auth token:', error);
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

      // Debug: Log del token
      logger.debug('🔑 Token obtenido:', token ? 'Token presente' : 'No token');
      logger.debug('🌐 URL de petición:', url);

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
      logger.error('API request error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error',
        status: 0,
      };
    }
  }

  // Métodos de autenticación
  async login(
    email: string,
    password: string
  ): Promise<ApiResponse<AuthResponse>> {
    // Modo mock para pruebas sin backend
    if (MOCK_API) {
      logger.debug('🎭 Usando modo MOCK para login');
      logger.debug('📧 Email recibido:', email);
      logger.debug('🔑 Password recibido:', password ? '***' : 'vacío');

      // Simular credenciales válidas - en modo mock, aceptamos cualquier contraseña para estos emails
      const validEmails = [
        'maria.garcia@sadlas.com',
        'test@sadlas.com',
        'worker@sadlas.com',
      ];

      const isValidCredential = validEmails.includes(email.toLowerCase());
      logger.debug('✅ Credencial válida:', isValidCredential);

      if (isValidCredential) {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
          data: MOCK_AUTH_RESPONSE,
          error: null,
          status: 200,
        };
      } else {
        return {
          data: null,
          error: 'Credenciales inválidas',
          status: 401,
        };
      }
    }

    // Modo normal con backend real
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

  async updateWorkerProfile(
    data: Partial<Worker>
  ): Promise<ApiResponse<Worker>> {
    return this.request<Worker>('/worker/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Métodos de asignaciones
  async getAssignments(
    filters?: AssignmentFilters
  ): Promise<ApiResponse<PaginatedResponse<Assignment>>> {
    if (MOCK_API) {
      logger.debug('📋 Modo mock: getAssignments');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay

      let filteredAssignments = [...MOCK_ASSIGNMENTS];

      // Aplicar filtros si existen
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredAssignments = filteredAssignments.filter(a =>
            filters.status?.includes(a.status)
          );
        }
        if (filters.priority && filters.priority.length > 0) {
          filteredAssignments = filteredAssignments.filter(a =>
            filters.priority?.includes(a.priority)
          );
        }
        if (filters.route_id) {
          filteredAssignments = filteredAssignments.filter(
            a => a.route_id === filters.route_id
          );
        }
      }

      return {
        data: {
          data: filteredAssignments,
          pagination: {
            current_page: 1,
            per_page: 20,
            total: filteredAssignments.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
        error: null,
        status: 200,
      };
    }

    const queryParams = filters ? this.createQueryParams(filters) : '';
    const endpoint = queryParams
      ? `/worker/assignments?${queryParams}`
      : '/worker/assignments';
    return this.request<PaginatedResponse<Assignment>>(endpoint);
  }

  async getAssignmentDetail(id: string): Promise<ApiResponse<Assignment>> {
    if (MOCK_API) {
      logger.debug('📋 Modo mock: getAssignmentDetail', id);
      await new Promise(resolve => setTimeout(resolve, 300));

      const assignment = MOCK_ASSIGNMENTS.find(a => a.id === id);
      if (assignment) {
        return {
          data: assignment,
          error: null,
          status: 200,
        };
      } else {
        return {
          data: null,
          error: 'Asignación no encontrada',
          status: 404,
        };
      }
    }

    return this.request<Assignment>(`/worker/assignments/${id}`);
  }

  async updateAssignmentStatus(
    id: string,
    status: string
  ): Promise<ApiResponse<Assignment>> {
    return this.request<Assignment>(`/worker/assignments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Métodos de ruta
  async getRoutes(
    filters?: RouteFilters
  ): Promise<ApiResponse<PaginatedResponse<Route>>> {
    if (MOCK_API) {
      logger.debug('🛣️ Modo mock: getRoutes');
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredRoutes = [...MOCK_ROUTES];

      // Aplicar filtros si existen
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredRoutes = filteredRoutes.filter(r =>
            filters.status?.includes(r.status)
          );
        }
      }

      return {
        data: {
          data: filteredRoutes,
          pagination: {
            current_page: 1,
            per_page: 20,
            total: filteredRoutes.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
        error: null,
        status: 200,
      };
    }

    const queryParams = filters ? this.createQueryParams(filters) : '';
    const endpoint = queryParams
      ? `/worker/routes?${queryParams}`
      : '/worker/routes';
    return this.request<PaginatedResponse<Route>>(endpoint);
  }

  async getCurrentRoute(): Promise<ApiResponse<Route | null>> {
    return this.request<Route | null>('/worker/route/current');
  }

  async getRouteDetail(id: string): Promise<ApiResponse<Route>> {
    if (MOCK_API) {
      logger.debug('🛣️ Modo mock: getRouteDetail', id);
      await new Promise(resolve => setTimeout(resolve, 300));

      const route = MOCK_ROUTES.find(r => r.id === id);
      if (route) {
        return {
          data: route,
          error: null,
          status: 200,
        };
      } else {
        return {
          data: null,
          error: 'Ruta no encontrada',
          status: 404,
        };
      }
    }

    return this.request<Route>(`/worker/routes/${id}`);
  }

  async updateRouteStatus(
    id: string,
    status: string
  ): Promise<ApiResponse<Route>> {
    return this.request<Route>(`/worker/routes/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Métodos de balances
  async getBalances(
    filters?: BalanceFilters
  ): Promise<ApiResponse<PaginatedResponse<Balance>>> {
    if (MOCK_API) {
      logger.debug('💰 Modo mock: getBalances');
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredBalances = [...MOCK_BALANCES];

      // Aplicar filtros si existen
      if (filters) {
        if (filters.status && filters.status.length > 0) {
          filteredBalances = filteredBalances.filter(b =>
            filters.status?.includes(b.status)
          );
        }
        if (filters.period_from) {
          const fromDate = new Date(filters.period_from);
          filteredBalances = filteredBalances.filter(
            b => new Date(b.period_start) >= fromDate
          );
        }
        if (filters.period_to) {
          const toDate = new Date(filters.period_to);
          filteredBalances = filteredBalances.filter(
            b => new Date(b.period_end) <= toDate
          );
        }
      }

      return {
        data: {
          data: filteredBalances,
          pagination: {
            current_page: 1,
            per_page: 20,
            total: filteredBalances.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        },
        error: null,
        status: 200,
      };
    }

    const queryParams = filters ? this.createQueryParams(filters) : '';
    const endpoint = queryParams
      ? `/worker/balances?${queryParams}`
      : '/worker/balances';
    return this.request<PaginatedResponse<Balance>>(endpoint);
  }

  async getBalanceDetail(id: string): Promise<ApiResponse<Balance>> {
    if (MOCK_API) {
      logger.debug('💰 Modo mock: getBalanceDetail', id);
      await new Promise(resolve => setTimeout(resolve, 300));

      const balance = MOCK_BALANCES.find(b => b.id === id);
      if (balance) {
        return {
          data: balance,
          error: null,
          status: 200,
        };
      } else {
        return {
          data: null,
          error: 'Balance no encontrado',
          status: 404,
        };
      }
    }

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

  async updateNote(
    id: string,
    data: Partial<Note>
  ): Promise<ApiResponse<Note>> {
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

  async updateUserSettings(
    settings: Partial<UserSettings>
  ): Promise<ApiResponse<UserSettings>> {
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
export const authenticateWorker = (
  email: string,
  password: string
): Promise<ApiResponse<AuthResponse>> => apiClient.login(email, password);

export const logoutWorker = (): Promise<ApiResponse<{ message: string }>> =>
  apiClient.logout();

export const getWorkerProfile = (): Promise<ApiResponse<Worker>> =>
  apiClient.getWorkerProfile();

export const updateWorkerProfile = (
  data: Partial<Worker>
): Promise<ApiResponse<Worker>> => apiClient.updateWorkerProfile(data);

export const getAssignments = (
  filters?: AssignmentFilters
): Promise<ApiResponse<PaginatedResponse<Assignment>>> =>
  apiClient.getAssignments(filters);

export const getAssignmentDetail = (
  id: string
): Promise<ApiResponse<Assignment>> => apiClient.getAssignmentDetail(id);

export const updateAssignmentStatus = (
  id: string,
  status: string
): Promise<ApiResponse<Assignment>> =>
  apiClient.updateAssignmentStatus(id, status);

export const getRoutes = (
  filters?: RouteFilters
): Promise<ApiResponse<PaginatedResponse<Route>>> =>
  apiClient.getRoutes(filters);

export const getCurrentRoute = (): Promise<ApiResponse<Route | null>> =>
  apiClient.getCurrentRoute();

export const getBalances = (
  filters?: BalanceFilters
): Promise<ApiResponse<PaginatedResponse<Balance>>> =>
  apiClient.getBalances(filters);

export const getNotes = (): Promise<ApiResponse<PaginatedResponse<Note>>> =>
  apiClient.getNotes();

export const createNote = (data: Partial<Note>): Promise<ApiResponse<Note>> =>
  apiClient.createNote(data);

export const updateNote = (
  id: string,
  data: Partial<Note>
): Promise<ApiResponse<Note>> => apiClient.updateNote(id, data);

export const deleteNote = (
  id: string
): Promise<ApiResponse<{ message: string }>> => apiClient.deleteNote(id);

export default apiClient;

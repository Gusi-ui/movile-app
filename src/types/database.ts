/**
 * Tipos TypeScript compartidos con la aplicación web
 * Estos tipos deben coincidir con los modelos de la base de datos
 */

// Tipos base
export type UserRole = 'worker' | 'admin' | 'super_admin';
export type AssignmentStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type RouteStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type NoteType = 'general' | 'assignment' | 'route' | 'issue';

// Modelo de Usuario/Trabajador
export interface Worker {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  
  // Campos específicos del trabajador
  employee_id?: string;
  department?: string;
  supervisor_id?: string;
  hire_date?: string;
}

// Modelo de Asignación
export interface Assignment {
  id: string;
  title: string;
  description: string;
  status: AssignmentStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Relaciones
  worker_id: string;
  assigned_by: string;
  route_id?: string;
  
  // Ubicación
  address?: string;
  latitude?: number;
  longitude?: number;
  
  // Fechas
  assigned_at: string;
  due_date?: string;
  started_at?: string;
  completed_at?: string;
  
  // Metadatos
  estimated_duration?: number; // en minutos
  actual_duration?: number;
  notes?: string;
  attachments?: string[]; // URLs de archivos
  
  created_at: string;
  updated_at: string;
}

// Modelo de Ruta
export interface Route {
  id: string;
  name: string;
  description?: string;
  status: RouteStatus;
  
  // Relaciones
  worker_id: string;
  created_by: string;
  
  // Configuración de ruta
  start_location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  end_location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  
  // Fechas
  scheduled_date: string;
  started_at?: string;
  completed_at?: string;
  
  // Metadatos
  total_assignments: number;
  completed_assignments: number;
  estimated_duration?: number;
  actual_duration?: number;
  
  created_at: string;
  updated_at: string;
}

// Modelo de Balance/Pago
export interface Balance {
  id: string;
  worker_id: string;
  
  // Información del pago
  period_start: string;
  period_end: string;
  base_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  bonuses: number;
  deductions: number;
  total_amount: number;
  
  // Estado
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  approved_by?: string;
  approved_at?: string;
  paid_at?: string;
  
  // Detalles
  assignments_completed: number;
  routes_completed: number;
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

// Modelo de Nota
export interface Note {
  id: string;
  title?: string;
  content: string;
  type: NoteType;
  
  // Relaciones
  worker_id: string;
  assignment_id?: string;
  route_id?: string;
  
  // Metadatos
  is_private: boolean;
  tags?: string[];
  attachments?: string[];
  
  created_at: string;
  updated_at: string;
}

// Modelo de Configuración del Usuario
export interface UserSettings {
  id: string;
  worker_id: string;
  
  // Preferencias de notificaciones
  notifications: {
    push_enabled: boolean;
    email_enabled: boolean;
    assignment_updates: boolean;
    route_updates: boolean;
    payment_updates: boolean;
  };
  
  // Preferencias de la app
  app_preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'es' | 'en';
    map_type: 'standard' | 'satellite' | 'hybrid';
    auto_sync: boolean;
  };
  
  // Configuración de ubicación
  location_settings: {
    tracking_enabled: boolean;
    high_accuracy: boolean;
    background_updates: boolean;
  };
  
  created_at: string;
  updated_at: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Tipos para filtros y consultas
export interface AssignmentFilters {
  status?: AssignmentStatus[];
  priority?: string[];
  date_from?: string;
  date_to?: string;
  route_id?: string;
}

export interface RouteFilters {
  status?: RouteStatus[];
  date_from?: string;
  date_to?: string;
}

export interface BalanceFilters {
  status?: string[];
  period_from?: string;
  period_to?: string;
}

// Tipos para estadísticas
export interface WorkerStats {
  total_assignments: number;
  completed_assignments: number;
  pending_assignments: number;
  completion_rate: number;
  average_completion_time: number;
  total_routes: number;
  completed_routes: number;
  current_month_earnings: number;
  last_month_earnings: number;
}

/**
 * Tipos TypeScript para la aplicación móvil SAD LAS
 */

// Worker Types - Coincide con la tabla workers de Supabase
export interface Worker {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  dni: string;
  worker_type: string;
  role: string;
  is_active: boolean | null;
  monthly_contracted_hours: number;
  weekly_contracted_hours: number;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Authentication Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  worker: Worker;
  token?: string;
  refresh_token?: string;
}

// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Assignments: undefined;
  AssignmentDetail: { assignmentId: string };
  Balances: undefined;
  Notes: undefined;
  Route: undefined;
  Profile: undefined;
  Settings: undefined;
  Calendar: undefined;
};

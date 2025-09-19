/**
 * Tipos TypeScript para la aplicación móvil SAD LAS
 */

// Worker Types
export interface Worker {
  id: string;
  email: string;
  name: string;
  role: 'worker' | 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
};

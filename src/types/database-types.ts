// Tipos de base de datos simplificados para evitar problemas con Supabase
// Estos tipos se basan en el esquema real de la base de datos

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

export interface WorkerInsert {
  id?: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  dni: string;
  worker_type: string;
  role?: string;
  is_active?: boolean | null;
  monthly_contracted_hours?: number;
  weekly_contracted_hours?: number;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkerUpdate {
  id?: string;
  email?: string;
  name?: string;
  surname?: string;
  phone?: string;
  dni?: string;
  worker_type?: string;
  role?: string;
  is_active?: boolean | null;
  monthly_contracted_hours?: number;
  weekly_contracted_hours?: number;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkerNotification {
  id: string;
  worker_id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  sent_at: string;
  expires_at: string | null;
  priority: string;
  created_at: string;
}

export interface WorkerNotificationInsert {
  id?: string;
  worker_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  sent_at?: string;
  expires_at?: string | null;
  priority?: string;
  created_at?: string;
}

export interface WorkerNotificationUpdate {
  id?: string;
  worker_id?: string;
  title?: string;
  body?: string;
  type?: string;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  sent_at?: string;
  expires_at?: string | null;
  priority?: string;
  created_at?: string;
}

export interface WorkerNotificationSettings {
  id: string;
  worker_id: string;
  push_enabled: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;
  new_user_notifications: boolean;
  schedule_change_notifications: boolean;
  assignment_change_notifications: boolean;
  route_update_notifications: boolean;
  reminder_notifications: boolean;
  urgent_notifications: boolean;
  holiday_update_notifications: boolean;
  system_notifications: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkerNotificationSettingsInsert {
  id?: string;
  worker_id: string;
  push_enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  new_user_notifications?: boolean;
  schedule_change_notifications?: boolean;
  assignment_change_notifications?: boolean;
  route_update_notifications?: boolean;
  reminder_notifications?: boolean;
  urgent_notifications?: boolean;
  holiday_update_notifications?: boolean;
  system_notifications?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerNotificationSettingsUpdate {
  id?: string;
  worker_id?: string;
  push_enabled?: boolean;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  new_user_notifications?: boolean;
  schedule_change_notifications?: boolean;
  assignment_change_notifications?: boolean;
  route_update_notifications?: boolean;
  reminder_notifications?: boolean;
  urgent_notifications?: boolean;
  holiday_update_notifications?: boolean;
  system_notifications?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkerDevice {
  id: string;
  worker_id: string;
  device_id: string;
  device_name: string | null;
  platform: string;
  app_version: string | null;
  os_version: string | null;
  push_token: string | null;
  authorized: boolean;
  last_used: string;
  created_at: string;
}

export interface WorkerDeviceInsert {
  id?: string;
  worker_id: string;
  device_id: string;
  device_name?: string | null;
  platform: string;
  app_version?: string | null;
  os_version?: string | null;
  push_token?: string | null;
  authorized?: boolean;
  last_used?: string;
  created_at?: string;
}

export interface WorkerDeviceUpdate {
  id?: string;
  worker_id?: string;
  device_id?: string;
  device_name?: string | null;
  platform?: string;
  app_version?: string | null;
  os_version?: string | null;
  push_token?: string | null;
  authorized?: boolean;
  last_used?: string;
  created_at?: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  worker_id: string;
  assignment_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  weekly_hours: number;
  priority: number;
  schedule: Record<string, unknown>;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssignmentInsert {
  id?: string;
  user_id: string;
  worker_id: string;
  assignment_type: string;
  start_date: string;
  end_date?: string | null;
  status?: string;
  weekly_hours?: number;
  priority?: number;
  schedule?: Record<string, unknown>;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AssignmentUpdate {
  id?: string;
  user_id?: string;
  worker_id?: string;
  assignment_type?: string;
  start_date?: string;
  end_date?: string | null;
  status?: string;
  weekly_hours?: number;
  priority?: number;
  schedule?: Record<string, unknown>;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  client_code: string;
  monthly_assigned_hours: number | null;
  is_active: boolean | null;
  medical_conditions: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserInsert {
  id?: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  client_code: string;
  monthly_assigned_hours?: number | null;
  is_active?: boolean | null;
  medical_conditions?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserUpdate {
  id?: string;
  email?: string;
  name?: string;
  surname?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  client_code?: string;
  monthly_assigned_hours?: number | null;
  is_active?: boolean | null;
  medical_conditions?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HoursBalance {
  id: string;
  worker_id: string;
  month: string;
  year: number;
  contracted_hours: number;
  worked_hours: number;
  balance: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface HoursBalanceInsert {
  id?: string;
  worker_id: string;
  month: string;
  year?: number;
  contracted_hours?: number;
  worked_hours?: number;
  balance?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HoursBalanceUpdate {
  id?: string;
  worker_id?: string;
  month?: string;
  year?: number;
  contracted_hours?: number;
  worked_hours?: number;
  balance?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface HolidayInsert {
  id?: string;
  date: string;
  name: string;
  type?: string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HolidayUpdate {
  id?: string;
  date?: string;
  name?: string;
  type?: string;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

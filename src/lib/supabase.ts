import {
  createClient,
  PostgrestError,
  User,
  Session,
} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/supabase';
import { AssignmentStatus } from '../types/database';
import logger from '../utils/logger';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log para verificar las variables de entorno de Supabase
logger.debug('🔧 SUPABASE_URL:', supabaseUrl);
logger.debug(
  '🔧 SUPABASE_ANON_KEY:',
  supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined'
);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'sad-las-mobile',
    },
  },
});

// Helper para obtener el usuario autenticado
export const getCurrentUser = async (): Promise<User | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logger.error('Error getting current user: No user found');
    return null;
  }
  return user;
};

// Helper para obtener el worker actual basado en el email del usuario autenticado
export const getCurrentWorker = async (): Promise<
  Database['public']['Tables']['workers']['Row'] | null
> => {
  const user = await getCurrentUser();
  if (!user?.email) {
    logger.debug('No user email available for worker lookup');
    return null;
  }

  logger.debug('Looking up worker for user email:', user.email);

  const { data: worker, error } = await supabase
    .from('workers')
    .select('*')
    .eq('email', user.email)
    .eq('is_active', true)
    .single();

  if (error) {
    logger.error('Error getting current worker:', error);
    logger.debug('Worker lookup details:', {
      userEmail: user.email,
      error: error,
    });

    // Intentar buscar sin filtros para diagnóstico
    const { data: allWorkers } = await supabase
      .from('workers')
      .select('id, email, is_active')
      .eq('email', user.email);

    logger.debug(
      'All workers with this email (including inactive):',
      allWorkers
    );
    return null;
  }

  logger.debug('Worker found:', worker);
  return worker;
};

// Helper para cerrar sesión
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('Error signing out:', error);
    throw error;
  }
};

// Helper para iniciar sesión
export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User; session: Session | null; weakPassword?: unknown }> => {
  logger.debug('🔐 Intentando login con:', {
    email,
    passwordLength: password.length,
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.error('❌ Error signing in:', error);
    logger.error('❌ Error details:', {
      message: error.message,
      status: error.status,
    });
    throw error;
  }

  logger.debug('✅ Login exitoso:', data);
  return data;
};

// Función de diagnóstico para verificar el estado del login
export const diagnoseLoginIssue = async (email: string): Promise<void> => {
  logger.debug('🔍 DIAGNÓSTICO DE LOGIN PARA:', email);

  // 1. Verificar si existe el usuario en Auth
  try {
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();
    const userExists = authUsers?.users?.some(user => user.email === email);
    logger.debug('👤 Usuario existe en Auth:', userExists);

    if (authError) {
      logger.debug('❌ Error verificando Auth users:', authError);
    }
  } catch {
    logger.debug(
      '❌ No se puede verificar usuarios de Auth (requiere permisos admin)'
    );
  }

  // 2. Verificar si existe en tabla workers
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select('id, email, name, is_active')
    .eq('email', email);

  logger.debug('👷 Workers encontrados:', workers);
  logger.debug('👷 Error en workers:', workersError);

  // 3. Verificar todos los workers activos
  const { data: allActiveWorkers } = await supabase
    .from('workers')
    .select('id, email, name, is_active')
    .eq('is_active', true);

  logger.debug('👷 Todos los workers activos:', allActiveWorkers);

  // Solo loggeamos la información para diagnóstico
};

// ===== FUNCIONES PARA DATOS DE LA APLICACIÓN =====

// Función para obtener asignaciones de un trabajador
export const getWorkerAssignments = async (filters?: {
  status?: string[];
  date_from?: string;
  date_to?: string;
}): Promise<{
  data: Database['public']['Tables']['assignments']['Row'][];
  error: PostgrestError | null;
}> => {
  try {
    const worker = await getCurrentWorker();
    if (!worker) {
      throw new Error('No worker found');
    }

    let query = supabase
      .from('assignments')
      .select('*')
      .eq('worker_id', worker.id);

    if (filters?.status) {
      query = query.in('status', filters.status);
    }

    if (filters?.date_from) {
      query = query.gte('start_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('end_date', filters.date_to);
    }

    const { data, error } = await query.order('start_date', {
      ascending: true,
    });

    if (error) {
      logger.error('Error getting assignments:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Error getting assignments:', error);
    return { data: [], error: error as PostgrestError };
  }
};

// Obtener detalle de una asignación
export const getAssignmentDetail = async (
  assignmentId: string
): Promise<Database['public']['Tables']['assignments']['Row']> => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error) {
    logger.error('Error getting assignment detail:', error);
    throw error;
  }

  return data;
};

// Cliente auxiliar sin tipos estrictos para operaciones problemáticas
const supabaseUntyped = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'sad-las-mobile',
    },
  },
});

// Actualizar estado de una asignación
export const updateAssignmentStatus = async (
  assignmentId: string,
  status: AssignmentStatus
): Promise<Database['public']['Tables']['assignments']['Row'] | null> => {
  const { data, error } = await supabaseUntyped
    .from('assignments')
    .update({
      status: status as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating assignment status:', error);
    throw error;
  }

  return data as Database['public']['Tables']['assignments']['Row'];
};

// Función para obtener balances de horas
export const getWorkerBalances = async (filters?: {
  year?: number;
  month?: string;
}): Promise<{
  data: Database['public']['Tables']['hours_balances']['Row'][];
  error: PostgrestError | null;
}> => {
  try {
    const worker = await getCurrentWorker();
    if (!worker) {
      throw new Error('No worker found');
    }

    let query = supabase
      .from('hours_balances')
      .select('*')
      .eq('worker_id', worker.id);

    if (filters?.year) {
      query = query.eq('year', filters.year);
    }

    if (filters?.month) {
      query = query.eq('month', filters.month);
    }

    const { data, error } = await query
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) {
      logger.error('Error getting balances:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    logger.error('Error getting balances:', error);
    return { data: [], error: error as PostgrestError };
  }
};

// Obtener detalle de un balance
export const getBalanceDetail = async (
  balanceId: string
): Promise<Database['public']['Tables']['hours_balances']['Row']> => {
  const { data, error } = await supabase
    .from('hours_balances')
    .select('*')
    .eq('id', balanceId)
    .single();

  if (error) {
    logger.error('Error getting balance detail:', error);
    throw error;
  }

  return data;
};

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Debug: Log para verificar las variables de entorno de Supabase
console.log('🔧 SUPABASE_URL:', supabaseUrl);
console.log('🔧 SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined');

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
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

// Helper para obtener el worker actual basado en el email del usuario autenticado
export const getCurrentWorker = async (): Promise<Database['public']['Tables']['workers']['Row'] | null> => {
  const user = await getCurrentUser();
  if (!user?.email) {
    console.log('No user email available for worker lookup');
    return null;
  }

  console.log('Looking up worker for user email:', user.email);

  const { data: worker, error } = await supabase
    .from('workers')
    .select('*')
    .eq('email', user.email)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('Error getting current worker:', error);
    console.log('Worker lookup details:', {
      userEmail: user.email,
      error: error
    });
    
    // Intentar buscar sin filtros para diagnóstico
    const { data: allWorkers, error: searchError } = await supabase
      .from('workers')
      .select('id, email, is_active')
      .eq('email', user.email);
      
    console.log('All workers with this email (including inactive):', allWorkers);
    return null;
  }

  console.log('Worker found:', worker);
  return worker;
};

// Helper para cerrar sesión
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Helper para iniciar sesión
export const signIn = async (email: string, password: string) => {
  console.log('🔐 Intentando login con:', { email, passwordLength: password.length });
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Error signing in:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status
    });
    throw error;
  }

  console.log('✅ Login exitoso:', data);
  return data;
};

// Función de diagnóstico para verificar el estado del login
export const diagnoseLoginIssue = async (email: string) => {
  console.log('🔍 DIAGNÓSTICO DE LOGIN PARA:', email);
  
  // 1. Verificar si existe el usuario en Auth
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    const userExists = authUsers?.users?.some(user => user.email === email);
    console.log('👤 Usuario existe en Auth:', userExists);
    
    if (authError) {
      console.log('❌ Error verificando Auth users:', authError);
    }
  } catch (error) {
    console.log('❌ No se puede verificar usuarios de Auth (requiere permisos admin)');
  }
  
  // 2. Verificar si existe en tabla workers
  const { data: workers, error: workersError } = await supabase
    .from('workers')
    .select('id, email, name, is_active')
    .eq('email', email);
    
  console.log('👷 Workers encontrados:', workers);
  console.log('👷 Error en workers:', workersError);
  
  // 3. Verificar todos los workers activos
  const { data: allActiveWorkers, error: allWorkersError } = await supabase
    .from('workers')
    .select('id, email, name, is_active')
    .eq('is_active', true);
    
  console.log('👷 Todos los workers activos:', allActiveWorkers);
  
  return {
    workersFound: workers,
    allActiveWorkers,
    workersError,
    allWorkersError
  };
};

// ===== FUNCIONES PARA DATOS DE LA APLICACIÓN =====

// Función para obtener asignaciones de un trabajador
export const getWorkerAssignments = async (filters?: {
  status?: string[];
  date_from?: string;
  date_to?: string;
}): Promise<{ data: Database['public']['Tables']['assignments']['Row'][], error: any }> => {
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

    const { data, error } = await query.order('start_date', { ascending: true });

    if (error) {
      console.error('Error getting assignments:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting assignments:', error);
    return { data: [], error };
  }
};

// Obtener detalle de una asignación
export const getAssignmentDetail = async (assignmentId: string) => {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (error) {
    console.error('Error getting assignment detail:', error);
    throw error;
  }

  return data;
};

// Actualizar estado de una asignación
export const updateAssignmentStatus = async (assignmentId: string, status: string) => {
  const { data, error } = await (supabase as any)
    .from('assignments')
    .update({ 
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment status:', error);
    throw error;
  }

  return data;
};



// Función para obtener balances de horas
export const getWorkerBalances = async (filters?: {
  year?: number;
  month?: string;
}): Promise<{ data: Database['public']['Tables']['hours_balances']['Row'][], error: any }> => {
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

    const { data, error } = await query.order('year', { ascending: false }).order('month', { ascending: false });

    if (error) {
      console.error('Error getting balances:', error);
      return { data: [], error };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting balances:', error);
    return { data: [], error };
  }
};

// Obtener detalle de un balance
export const getBalanceDetail = async (balanceId: string) => {
  const { data, error } = await supabase
    .from('hours_balances')
    .select('*')
    .eq('id', balanceId)
    .single();

  if (error) {
    console.error('Error getting balance detail:', error);
    throw error;
  }

  return data;
};
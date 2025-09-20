import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';
import { shadowStyles } from '../utils/shadows';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface DashboardStats {
  todayServices: number;
  completedServices: number;
  totalHours: number;
  pendingServices: number;
}

interface TodayService {
  id: string;
  client_name: string;
  start_time: string;
  end_time: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface AssignmentData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  clients?: {
    name?: string;
    address?: string;
  };
}

interface Worker {
  id: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { state, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    todayServices: 0,
    completedServices: 0,
    totalHours: 0,
    pendingServices: 0,
  });
  const [todayServices, setTodayServices] = useState<TodayService[]>([]);

  const loadDashboardData = async () => {
    try {
      if (!state.currentWorker?.email) {
        console.log('No current worker email available');
        return;
      }

      console.log('Searching for worker with email:', state.currentWorker.email);

      // Buscar el trabajador por email
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('id, email, is_active')
        .eq('email', state.currentWorker.email)
        .single();

      if (workerError) {
        console.error('Error fetching worker:', workerError);
        console.log('Worker search details:', {
          email: state.currentWorker.email,
          error: workerError
        });
        
        // Intentar buscar sin el filtro single() para ver si hay múltiples o ningún resultado
        const { data: allWorkers, error: searchError } = await supabase
          .from('workers')
          .select('id, email, is_active')
          .eq('email', state.currentWorker.email);
          
        console.log('All workers with this email:', allWorkers);
        console.log('Search error:', searchError);
        return;
      }

      if (!worker) {
        console.log('No worker found with email:', state.currentWorker.email);
        return;
      }

      const typedWorker = worker as Worker;

      const today = new Date().toISOString().split('T')[0];

      // Obtener asignaciones de hoy
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          clients (
            name,
            address
          )
        `)
        .eq('worker_id', typedWorker.id)
        .gte('start_time', `${today}T00:00:00`)
        .lt('start_time', `${today}T23:59:59`)
        .order('start_time');

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      if (assignments && assignments.length > 0) {
        // Castear los datos para TypeScript
        const assignmentsData: AssignmentData[] = assignments as AssignmentData[];
        
        // Calcular estadísticas
        const completed = assignmentsData.filter(a => a.status === 'completed').length;
        const pending = assignmentsData.filter(a => a.status === 'pending').length;
        
        // Calcular horas totales
        const totalMinutes = assignmentsData.reduce((total, assignment) => {
          const start = new Date(assignment.start_time);
          const end = new Date(assignment.end_time);
          return total + (end.getTime() - start.getTime()) / (1000 * 60);
        }, 0);

        setDashboardStats({
          todayServices: assignmentsData.length,
          completedServices: completed,
          totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          pendingServices: pending,
        });

        // Formatear servicios de hoy
        const formattedServices: TodayService[] = assignmentsData.map(assignment => ({
          id: assignment.id,
          client_name: assignment.clients?.name || 'Cliente',
          start_time: assignment.start_time,
          end_time: assignment.end_time,
          address: assignment.clients?.address || 'Dirección no disponible',
          status: assignment.status as 'pending' | 'in_progress' | 'completed',
        }));

        setTodayServices(formattedServices);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  useEffect(() => {
    loadDashboardData();
  }, [state.currentWorker?.email]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'in_progress': return 'En progreso';
      case 'pending': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar Sesión', onPress: logout, style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>
              ¡Hola, {state.currentWorker?.name || 'Trabajadora'}! 👋
            </Text>
            <Text style={styles.subtitleText}>
              Servicios de Ayuda a Domicilio
            </Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>● En servicio</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickStatsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{dashboardStats.todayServices}</Text>
            <Text style={styles.statLabel}>Servicios hoy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{dashboardStats.completedServices}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{dashboardStats.totalHours}h</Text>
            <Text style={styles.statLabel}>Tiempo total</Text>
          </View>
        </View>

        {/* Today's Services */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Servicios de Hoy</Text>
          {loading ? (
            <Text style={styles.loadingText}>Cargando servicios...</Text>
          ) : todayServices.length > 0 ? (
            todayServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: service.id })}
              >
                <View style={styles.serviceHeader}>
                  <Text style={styles.clientName}>{service.client_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(service.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(service.status)}</Text>
                  </View>
                </View>
                <Text style={styles.serviceTime}>
                  {formatTime(service.start_time)} - {formatTime(service.end_time)}
                </Text>
                <Text style={styles.serviceAddress}>{service.address}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No tienes servicios programados para hoy</Text>
            </View>
          )}
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Acciones Principales</Text>

          <View style={styles.menuGrid}>
            <TouchableOpacity 
               style={[styles.menuItem, styles.primaryAction]}
               onPress={() => navigation.navigate('Assignments')}
             >
               <Text style={styles.menuIcon}>🏠</Text>
               <Text style={[styles.menuItemText, styles.primaryText]}>Mis Servicios</Text>
               <Text style={[styles.menuItemSubtext, styles.primarySubtext]}>Ver asignaciones</Text>
             </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.secondaryAction]}
              onPress={() => navigation.navigate('Route')}
            >
              <Text style={styles.menuIcon}>🗺️</Text>
              <Text style={styles.menuItemText}>Mi Ruta</Text>
              <Text style={styles.menuItemSubtext}>Planificar día</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.secondaryAction]}
              onPress={() => navigation.navigate('Balances')}
            >
              <Text style={styles.menuIcon}>💰</Text>
              <Text style={styles.menuItemText}>Horas & Pagos</Text>
              <Text style={styles.menuItemSubtext}>Ver balance</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.secondaryAction]}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Text style={styles.menuIcon}>📅</Text>
              <Text style={styles.menuItemText}>Calendario</Text>
              <Text style={styles.menuItemSubtext}>Horarios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.secondaryAction]}>
              <Text style={styles.menuIcon}>📝</Text>
              <Text style={styles.menuItemText}>Reportes</Text>
              <Text style={styles.menuItemSubtext}>Incidencias</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{state.currentWorker?.name || 'Trabajadora'}</Text>
              <Text style={styles.profileEmail}>{state.currentWorker?.email}</Text>
              <Text style={styles.profileRole}>Auxiliar de Ayuda a Domicilio</Text>
            </View>
            <Text style={styles.profileArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#bfdbfe',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#bfdbfe',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: -15,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    ...shadowStyles.card,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  menuContainer: {
    padding: 20,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    width: '48%',
    alignItems: 'center',
    ...shadowStyles.card,
  },
  primaryAction: {
    backgroundColor: '#2563eb',
  },
  secondaryAction: {
    backgroundColor: 'white',
  },
  menuIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    color: '#1e293b',
  },
  menuItemSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  primaryText: {
    color: 'white',
  },
  primarySubtext: {
    color: '#bfdbfe',
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadowStyles.card,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  profileArrow: {
    fontSize: 20,
    color: '#94a3b8',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...shadowStyles.card,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  serviceTime: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 4,
  },
  serviceAddress: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    padding: 20,
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    ...shadowStyles.card,
  },
  emptyStateText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';
import { shadowStyles } from '../utils/shadows';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Calendar'>;

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  client_name: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
}

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

interface AssignmentData {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  clients?: {
    name?: string;
    address?: string;
  };
}

interface Worker {
  id: string;
}

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { state } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<WeekDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadWeekData = async (weekStart: Date) => {
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

      // Calcular el rango de la semana
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Obtener asignaciones de la semana
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          notes,
          clients (
            name,
            address
          )
        `)
        .eq('worker_id', typedWorker.id)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time');

      if (error) {
        console.error('Error fetching assignments:', error);
        return;
      }

      // Castear los datos para TypeScript
      const assignmentsData: AssignmentData[] = (assignments as AssignmentData[]) || [];

      // Crear estructura de la semana
      const week: WeekDay[] = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        const dayEvents: CalendarEvent[] = assignmentsData
          ? assignmentsData
              .filter(assignment => {
                const assignmentDate = new Date(assignment.start_time);
                return assignmentDate.toDateString() === date.toDateString();
              })
              .map(assignment => ({
                id: assignment.id,
                title: `Servicio - ${assignment.clients?.name || 'Cliente'}`,
                start_time: assignment.start_time,
                end_time: assignment.end_time,
                client_name: assignment.clients?.name || 'Cliente',
                address: assignment.clients?.address || 'Dirección no disponible',
                status: assignment.status as 'pending' | 'in_progress' | 'completed',
                notes: assignment.notes,
              }))
          : [];

        week.push({
          date,
          dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: date.toDateString() === today.toDateString(),
          events: dayEvents,
        });
      }

      setCurrentWeek(week);
    } catch (error) {
      console.error('Error loading week data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del calendario');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentStart = getWeekStart(selectedDate);
    const newDate = new Date(currentStart);
    newDate.setDate(currentStart.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
    loadWeekData(newDate);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWeekData(getWeekStart(selectedDate));
  };

  useEffect(() => {
    const weekStart = getWeekStart(selectedDate);
    loadWeekData(weekStart);
  }, [state.currentWorker?.email]);

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const getWeekRange = () => {
    if (currentWeek.length === 0) return '';
    const start = currentWeek[0].date;
    const end = currentWeek[6].date;
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`;
    } else {
      return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendario</Text>
        <Text style={styles.headerSubtitle}>Gestión de horarios y servicios</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <Text style={styles.weekRange}>{getWeekRange()}</Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek('next')}
          >
            <Text style={styles.navButtonText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Week View */}
        {loading ? (
          <Text style={styles.loadingText}>Cargando calendario...</Text>
        ) : (
          <View style={styles.weekContainer}>
            {currentWeek.map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                <View style={[styles.dayHeader, day.isToday && styles.todayHeader]}>
                  <Text style={[styles.dayName, day.isToday && styles.todayText]}>
                    {day.dayName}
                  </Text>
                  <Text style={[styles.dayNumber, day.isToday && styles.todayText]}>
                    {day.dayNumber}
                  </Text>
                </View>
                
                <View style={styles.eventsContainer}>
                  {day.events.length > 0 ? (
                    day.events.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={styles.eventCard}
                        onPress={() => navigation.navigate('AssignmentDetail', { assignmentId: event.id })}
                      >
                        <View style={styles.eventHeader}>
                          <Text style={styles.eventTime}>
                            {formatTime(event.start_time)} - {formatTime(event.end_time)}
                          </Text>
                          <View style={[styles.eventStatus, { backgroundColor: getStatusColor(event.status) }]}>
                            <Text style={styles.eventStatusText}>●</Text>
                          </View>
                        </View>
                        <Text style={styles.eventTitle} numberOfLines={1}>
                          {event.client_name}
                        </Text>
                        <Text style={styles.eventAddress} numberOfLines={1}>
                          {event.address}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.noEventsText}>Sin servicios</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen de la Semana</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {currentWeek.reduce((total, day) => total + day.events.length, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Servicios</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {currentWeek.reduce((total, day) => 
                  total + day.events.filter(e => e.status === 'completed').length, 0
                )}
              </Text>
              <Text style={styles.summaryLabel}>Completados</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>
                {Math.round(
                  currentWeek.reduce((total, day) => 
                    total + day.events.reduce((dayTotal, event) => {
                      const start = new Date(event.start_time);
                      const end = new Date(event.end_time);
                      return dayTotal + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    }, 0), 0
                  ) * 10
                ) / 10}h
              </Text>
              <Text style={styles.summaryLabel}>Horas Totales</Text>
            </View>
          </View>
        </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#bfdbfe',
  },
  content: {
    flex: 1,
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekRange: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  weekContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  dayContainer: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  dayHeader: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  todayHeader: {
    backgroundColor: '#2563eb',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 2,
  },
  todayText: {
    color: 'white',
  },
  eventsContainer: {
    padding: 8,
    minHeight: 200,
  },
  eventCard: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
  },
  eventStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventStatusText: {
    fontSize: 8,
    color: 'white',
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  eventAddress: {
    fontSize: 10,
    color: '#64748b',
  },
  noEventsText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
    padding: 40,
  },
  summaryContainer: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    ...shadowStyles.card,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
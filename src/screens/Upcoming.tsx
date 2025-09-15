import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface UpcomingService {
  id: string;
  userName: string;
  date: string;
  timeSlot: string;
  assignmentType: string;
  dayOfWeek: string;
}

type ViewMode = 'tomorrow' | 'thisWeek' | 'thisMonth';

export default function UpcomingScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [upcomingServices, setUpcomingServices] = useState<UpcomingService[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('tomorrow');
  const [stats, setStats] = useState({
    tomorrow: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    loadUpcomingServices();
  }, [user, viewMode]);

  const loadUpcomingServices = async (): Promise<void> => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar trabajadora por email
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .ilike('email', user.email)
        .maybeSingle();

      if (!workerData) {
        setLoading(false);
        return;
      }

      // Obtener asignaciones activas
      const { data: assignments } = await supabase
        .from('assignments')
        .select(
          `
          id,
          assignment_type,
          schedule,
          start_date,
          end_date,
          users!inner(name, surname)
        `
        )
        .eq('worker_id', workerData.id)
        .eq('status', 'active');

      if (assignments) {
        // Transformar datos para que coincidan con la interfaz
        const transformedAssignments = assignments.map((row: any) => ({
          ...row,
          users: Array.isArray(row.users) ? row.users[0] : row.users,
        }));

        const services = generateUpcomingServices(
          transformedAssignments,
          viewMode
        );
        setUpcomingServices(services);

        // Calcular estadísticas para todos los períodos
        const tomorrowServices = generateUpcomingServices(
          transformedAssignments,
          'tomorrow'
        );
        const weekServices = generateUpcomingServices(
          transformedAssignments,
          'thisWeek'
        );
        const monthServices = generateUpcomingServices(
          transformedAssignments,
          'thisMonth'
        );

        setStats({
          tomorrow: tomorrowServices.length,
          thisWeek: weekServices.length,
          thisMonth: monthServices.length,
        });
      }
    } catch (error) {
      console.error('Error loading upcoming services:', error);
      Alert.alert('Error', 'No se pudieron cargar los próximos servicios');
    } finally {
      setLoading(false);
    }
  };

  const generateUpcomingServices = (
    assignments: any[],
    mode: ViewMode
  ): UpcomingService[] => {
    const services: UpcomingService[] = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let startDate: Date;
    let endDate: Date;

    switch (mode) {
      case 'tomorrow':
        startDate = new Date(tomorrow);
        endDate = new Date(tomorrow);
        break;
      case 'thisWeek':
        startDate = new Date(tomorrow);
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 7);
        break;
      case 'thisMonth':
        startDate = new Date(tomorrow);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        return services;
    }

    assignments.forEach((assignment) => {
      try {
        const schedule =
          typeof assignment.schedule === 'string'
            ? JSON.parse(assignment.schedule)
            : assignment.schedule;

        const userName =
          `${assignment.users.name || ''} ${assignment.users.surname || ''}`.trim() ||
          'Servicio';

        // Generar servicios para el rango de fechas
        const current = new Date(startDate);
        while (current <= endDate) {
          const dayOfWeek = current.getDay();
          const dayNames = [
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
          ];
          const dayKey = dayNames[dayOfWeek];

          const dayConfig = schedule?.[dayKey as keyof typeof schedule];
          const timeSlots = dayConfig?.timeSlots || [];
          const enabled = dayConfig?.enabled !== false;

          if (enabled && timeSlots.length > 0) {
            // Verificar si este día aplica según el tipo de asignación
            const assignmentType = assignment.assignment_type?.toLowerCase();
            let shouldInclude = false;

            if (assignmentType === 'flexible') {
              shouldInclude = true;
            } else if (
              assignmentType === 'laborables' ||
              assignmentType === 'working_days'
            ) {
              shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5; // Lunes a viernes
            } else if (
              assignmentType === 'festivos' ||
              assignmentType === 'holidays'
            ) {
              shouldInclude = dayOfWeek === 0 || dayOfWeek === 6; // Sábado y domingo
            }

            if (shouldInclude) {
              timeSlots.forEach((slot: any) => {
                if (slot.start && slot.end) {
                  services.push({
                    id: `${assignment.id}-${current.toISOString().split('T')[0]}-${slot.start}`,
                    userName,
                    date: current.toISOString().split('T')[0] || '',
                    timeSlot: `${slot.start} - ${slot.end}`,
                    assignmentType: assignment.assignment_type,
                    dayOfWeek: current.toLocaleDateString('es-ES', {
                      weekday: 'long',
                    }),
                  });
                }
              });
            }
          }

          current.setDate(current.getDate() + 1);
        }
      } catch (error) {
        console.error('Error processing assignment:', error);
      }
    });

    // Ordenar por fecha y hora
    services.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

    return services;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getAssignmentTypeColor = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'laborables':
      case 'working_days':
        return '#3b82f6';
      case 'festivos':
      case 'holidays':
        return '#ef4444';
      case 'flexible':
        return '#22c55e';
      default:
        return '#6b7280';
    }
  };

  const getAssignmentTypeLabel = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'laborables':
      case 'working_days':
        return 'Laborable';
      case 'festivos':
      case 'holidays':
        return 'Festivo';
      case 'flexible':
        return 'Flexible';
      default:
        return 'Otro';
    }
  };

  const getModeTitle = (mode: ViewMode): string => {
    switch (mode) {
      case 'tomorrow':
        return 'Mañana';
      case 'thisWeek':
        return 'Esta Semana';
      case 'thisMonth':
        return 'Este Mes';
      default:
        return '';
    }
  };

  const getModeDescription = (mode: ViewMode): string => {
    switch (mode) {
      case 'tomorrow':
        return 'Servicios programados para mañana';
      case 'thisWeek':
        return 'Próximos 7 días';
      case 'thisMonth':
        return 'Resto del mes actual';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando próximos servicios...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📅 Próximos Servicios</Text>
        <Text style={styles.subtitle}>Planificación de servicios futuros</Text>
      </View>

      {/* Selector de vista */}
      <View style={styles.viewSelector}>
        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'tomorrow' && styles.activeViewButton,
          ]}
          onPress={() => setViewMode('tomorrow')}
        >
          <Text
            style={[
              styles.viewButtonText,
              viewMode === 'tomorrow' && styles.activeViewButtonText,
            ]}
          >
            Mañana ({stats.tomorrow})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'thisWeek' && styles.activeViewButton,
          ]}
          onPress={() => setViewMode('thisWeek')}
        >
          <Text
            style={[
              styles.viewButtonText,
              viewMode === 'thisWeek' && styles.activeViewButtonText,
            ]}
          >
            Semana ({stats.thisWeek})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.viewButton,
            viewMode === 'thisMonth' && styles.activeViewButton,
          ]}
          onPress={() => setViewMode('thisMonth')}
        >
          <Text
            style={[
              styles.viewButtonText,
              viewMode === 'thisMonth' && styles.activeViewButtonText,
            ]}
          >
            Mes ({stats.thisMonth})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resumen de la vista actual */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{getModeTitle(viewMode)}</Text>
        <Text style={styles.summaryDescription}>
          {getModeDescription(viewMode)}
        </Text>
        <Text style={styles.summaryCount}>
          {upcomingServices.length}{' '}
          {upcomingServices.length === 1 ? 'servicio' : 'servicios'} programados
        </Text>
      </View>

      {/* Lista de servicios */}
      {upcomingServices.length === 0 ? (
        <View style={styles.noServicesCard}>
          <Text style={styles.noServicesText}>
            No hay servicios programados para{' '}
            {getModeTitle(viewMode).toLowerCase()}
          </Text>
        </View>
      ) : (
        <View style={styles.servicesContainer}>
          {upcomingServices.map((service, index) => {
            // Agrupar por fecha
            const showDateHeader =
              index === 0 || service.date !== upcomingServices[index - 1]?.date;

            return (
              <View key={service.id}>
                {showDateHeader && (
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                      {service.dayOfWeek}, {formatDate(service.date)}
                    </Text>
                  </View>
                )}

                <View style={styles.serviceCard}>
                  <View style={styles.serviceMainInfo}>
                    <View style={styles.serviceTime}>
                      <Text style={styles.timeText}>{service.timeSlot}</Text>
                      <View
                        style={[
                          styles.typeLabel,
                          {
                            backgroundColor:
                              getAssignmentTypeColor(service.assignmentType) +
                              '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeLabelText,
                            {
                              color: getAssignmentTypeColor(
                                service.assignmentType
                              ),
                            },
                          ]}
                        >
                          {getAssignmentTypeLabel(service.assignmentType)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.userName}>{service.userName}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.detailsButton}
                    onPress={() => {
                      Alert.alert(
                        'Próximamente',
                        'Vista de detalles del servicio'
                      );
                    }}
                  >
                    <Text style={styles.detailsButtonText}>Ver</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Acciones rápidas */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Acciones Rápidas</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => Alert.alert('Próximamente', 'Exportar horario')}
          >
            <Text style={styles.quickActionIcon}>📄</Text>
            <Text style={styles.quickActionLabel}>Exportar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => Alert.alert('Próximamente', 'Solicitar cambio')}
          >
            <Text style={styles.quickActionIcon}>🔄</Text>
            <Text style={styles.quickActionLabel}>Cambio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => Alert.alert('Próximamente', 'Recordatorios')}
          >
            <Text style={styles.quickActionIcon}>🔔</Text>
            <Text style={styles.quickActionLabel}>Avisos</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Espaciado inferior */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  viewButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  activeViewButton: {
    backgroundColor: '#3b82f6',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activeViewButtonText: {
    color: 'white',
  },
  summaryCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  noServicesCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  noServicesText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  servicesContainer: {
    paddingHorizontal: 16,
  },
  dateHeader: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  serviceCard: {
    backgroundColor: 'white',
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceMainInfo: {
    flex: 1,
  },
  serviceTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 12,
  },
  typeLabel: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userName: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailsButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  quickActionsCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  bottomSpacing: {
    height: 100,
  },
});

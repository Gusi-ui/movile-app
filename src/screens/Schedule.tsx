import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';
import { Colors } from '../constants/colors';

interface Assignment {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users: {
    name: string | null;
    surname: string | null;
  };
  weekly_hours: number | null;
}

interface AssignmentWithUser {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users:
    | {
        name: string | null;
        surname: string | null;
      }
    | {
        name: string | null;
        surname: string | null;
      }[];
  weekly_hours: number | null;
}

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  dayName: string;
  date: string;
  slots: {
    start: string;
    end: string;
    userName: string;
    assignmentType: string;
  }[];
}

export default function ScheduleScreen(): React.JSX.Element {
  const { state } = useAuth();
  const { currentWorker } = state;
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [totalWeeklyHours, setTotalWeeklyHours] = useState<number>(0);

  const getWeekDates = (startDate: Date): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const generateWeekSchedule = useCallback(
    (assignmentsData: Assignment[]): void => {
      const weekDates = getWeekDates(currentWeekStart);
      const dayNames = [
        'lunes',
        'martes',
        'miércoles',
        'jueves',
        'viernes',
        'sábado',
        'domingo',
      ];

      const schedule: DaySchedule[] = weekDates
        .filter(
          (date): date is Date => date instanceof Date && !isNaN(date.getTime())
        )
        .map((date, index) => {
          const daySlots: {
            start: string;
            end: string;
            userName: string;
            assignmentType: string;
          }[] = [];

          assignmentsData.forEach(assignment => {
            if (
              assignment.schedule &&
              typeof assignment.schedule === 'object'
            ) {
              const scheduleData = assignment.schedule as Record<
                string,
                TimeSlot[]
              >;
              const dayKey = dayNames[index];
              const daySchedule = dayKey ? scheduleData[dayKey] : undefined;

              if (daySchedule && Array.isArray(daySchedule)) {
                daySchedule.forEach(slot => {
                  daySlots.push({
                    start: slot.start,
                    end: slot.end,
                    userName:
                      `${assignment.users?.name || ''} ${assignment.users?.surname || ''}`.trim(),
                    assignmentType: assignment.assignment_type,
                  });
                });
              }
            }
          });

          // Ordenar slots por hora de inicio
          daySlots.sort((a, b) => {
            const timeA = a.start.split(':').map(Number);
            const timeB = b.start.split(':').map(Number);
            return (
              (timeA[0] || 0) * 60 +
              (timeA[1] || 0) -
              ((timeB[0] || 0) * 60 + (timeB[1] || 0))
            );
          });

          return {
            day: date.getDate().toString().padStart(2, '0'),
            dayName: dayNames[index] || 'día',
            date: date.toISOString().split('T')[0] as string,
            slots: daySlots,
          };
        });

      setWeekSchedule(schedule);
    },
    [currentWeekStart]
  );

  const loadSchedule = useCallback(async (): Promise<void> => {
    if (!currentWorker?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar trabajadora por email
      const { data: workerData } = await supabase
        .from('workers')
        .select('id')
        .ilike('email', currentWorker.email)
        .maybeSingle();

      if (!workerData) {
        setLoading(false);
        return;
      }

      // Obtener asignaciones de la trabajadora
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(
          `
          id,
          assignment_type,
          schedule,
          start_date,
          end_date,
          weekly_hours,
          users!inner(name, surname)
        `
        )
        .eq('worker_id', (workerData as { id: string }).id)
        .eq('status', 'active');

      if (assignmentsData) {
        // Transformar datos para que coincidan con la interfaz
        const transformedData = assignmentsData.map(
          (row: AssignmentWithUser) => ({
            ...row,
            users: Array.isArray(row.users) ? row.users[0] : row.users,
          })
        ) as Assignment[];

        setAssignments(transformedData);

        // Calcular horas semanales totales
        const totalHours = transformedData.reduce((sum, assignment) => {
          return sum + (assignment.weekly_hours || 0);
        }, 0);
        setTotalWeeklyHours(totalHours);

        // Generar horario de la semana
        generateWeekSchedule(transformedData);
      }
    } catch (error) {
      logger.error('Error loading schedule:', error);
      Alert.alert('Error', 'No se pudo cargar el horario');
    } finally {
      setLoading(false);
    }
  }, [currentWorker?.email, generateWeekSchedule]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const navigateWeek = (direction: 'prev' | 'next'): void => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = (): void => {
    setCurrentWeekStart(new Date());
  };

  const getDayHours = (slots: DaySchedule['slots']): number => {
    return slots.reduce((total, slot) => {
      const start = new Date(`2000-01-01T${slot.start}:00`);
      const end = new Date(`2000-01-01T${slot.end}:00`);
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return total + hours;
    }, 0);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando horario...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📋 Mi Horario</Text>
        <Text style={styles.subtitle}>Planificación semanal completa</Text>
      </View>

      {/* Navegación de semana */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('prev')}
        >
          <Text style={styles.navButtonText}>← Anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.currentWeekButton}
          onPress={goToCurrentWeek}
        >
          <Text style={styles.currentWeekText}>
            {getWeekDates(currentWeekStart)[0]?.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
            })}{' '}
            -{' '}
            {getWeekDates(currentWeekStart)[6]?.toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek('next')}
        >
          <Text style={styles.navButtonText}>Siguiente →</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen semanal */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Horas Totales</Text>
            <Text style={styles.summaryValue}>
              {totalWeeklyHours.toFixed(1)}h
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Asignaciones</Text>
            <Text style={styles.summaryValue}>{assignments.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Días Activos</Text>
            <Text style={styles.summaryValue}>
              {weekSchedule.filter(day => day.slots.length > 0).length}
            </Text>
          </View>
        </View>
      </View>

      {/* Horario semanal */}
      <View style={styles.scheduleContainer}>
        {weekSchedule.map((day, index) => {
          const dayHours = getDayHours(day.slots);
          const isToday =
            new Date().toDateString() ===
            getWeekDates(currentWeekStart)[index]?.toDateString();

          return (
            <View
              key={day.day}
              style={[styles.dayCard, isToday && styles.todayCard]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, isToday && styles.todayText]}>
                  {day.dayName.charAt(0).toUpperCase() + day.dayName.slice(1)}
                </Text>
                <Text style={[styles.dayDate, isToday && styles.todayText]}>
                  {day.date}
                </Text>
                {dayHours > 0 && (
                  <Text style={[styles.dayHours, isToday && styles.todayText]}>
                    {dayHours.toFixed(1)}h
                  </Text>
                )}
              </View>

              {day.slots.length === 0 ? (
                <View style={styles.noSlotsContainer}>
                  <Text style={styles.noSlotsText}>Sin servicios</Text>
                </View>
              ) : (
                <View style={styles.slotsContainer}>
                  {day.slots.map((slot, slotIndex) => (
                    <View
                      key={slotIndex}
                      style={[
                        styles.slotCard,
                        {
                          borderLeftColor: getAssignmentTypeColor(
                            slot.assignmentType
                          ),
                        },
                      ]}
                    >
                      <View style={styles.slotHeader}>
                        <Text style={styles.slotTime}>
                          {slot.start} - {slot.end}
                        </Text>
                        <View
                          style={[
                            styles.typeLabel,
                            {
                              backgroundColor:
                                getAssignmentTypeColor(slot.assignmentType) +
                                '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.typeLabelText,
                              {
                                color: getAssignmentTypeColor(
                                  slot.assignmentType
                                ),
                              },
                            ]}
                          >
                            {getAssignmentTypeLabel(slot.assignmentType)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.slotUser}>{slot.userName}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Leyenda de tipos de asignación */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Tipos de Asignación</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: Colors.primary }]}
            />
            <Text style={styles.legendText}>Laborables</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: Colors.error }]}
            />
            <Text style={styles.legendText}>Festivos</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: Colors.success }]}
            />
            <Text style={styles.legendText}>Flexible</Text>
          </View>
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: Colors.backgroundCard,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.backgroundLight,
  },
  navButtonText: {
    color: Colors.textGray,
    fontWeight: '500',
  },
  currentWeekButton: {
    padding: 8,
  },
  currentWeekText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  summaryCard: {
    backgroundColor: Colors.backgroundCard,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  scheduleContainer: {
    paddingHorizontal: 16,
  },
  dayCard: {
    backgroundColor: Colors.backgroundCard,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  todayCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: Colors.backgroundLight,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
  },
  dayDate: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  dayHours: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  todayText: {
    color: Colors.primary,
  },
  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  slotsContainer: {
    padding: 16,
    gap: 8,
  },
  slotCard: {
    backgroundColor: Colors.backgroundLight,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
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
  slotUser: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  legendCard: {
    backgroundColor: Colors.backgroundCard,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bottomSpacing: {
    height: 100,
  },
});

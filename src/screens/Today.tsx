import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';

type Row = {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  user_name?: string;
  user_address?: string;
};

type QuickAction = {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
};

type InfoCard = {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
};

export default function TodayScreen(): React.JSX.Element {
  const { user, session } = useAuth();
  const { scheduleServiceReminders, notifyAssignmentUpdate } =
    useNotifications();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    totalServices: 0,
    completedServices: 0,
    pendingServices: 0,
    totalHours: 0,
  });

  const todayKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    const load = async (): Promise<void> => {
      setLoading(true);
      try {
        const email = user?.email ?? '';
        if (email.trim() === '') {
          setRows([]);
          return;
        }
        const { data: w, error: werr } = await supabase
          .from('workers')
          .select('id')
          .eq('email', email)
          .single();
        const workerId =
          werr === null ? (w?.id as string | undefined) : undefined;
        if (workerId === undefined) {
          setRows([]);
          return;
        }

        // Cargar asignaciones con información del usuario
        const { data, error } = await supabase
          .from('assignments')
          .select(
            `
            id,
            assignment_type,
            schedule,
            start_date,
            end_date,
            users!inner(name, address)
          `
          )
          .lte('start_date', todayKey)
          .or(`end_date.is.null,end_date.gte.${todayKey}`)
          .eq('worker_id', workerId);

        if (error === null) {
          const processedData =
            (data as any[])?.map((item) => ({
              ...item,
              user_name: item.users?.name,
              user_address: item.users?.address,
            })) ?? [];
          setRows(processedData);

          // Calcular estadísticas
          const totalServices = processedData.length;
          const completedServices = completedIds.size;
          const pendingServices = totalServices - completedServices;
          const totalHours = processedData.reduce((acc, item) => {
            const slots = getTodaySlots(item.schedule, item.assignment_type);
            return (
              acc +
              slots.reduce((slotAcc, slot) => {
                const [startH, startM] = slot.start.split(':').map(Number);
                const [endH, endM] = slot.end.split(':').map(Number);
                return (
                  slotAcc +
                  ((endH || 0) * 60 +
                    (endM || 0) -
                    ((startH || 0) * 60 + (startM || 0))) /
                    60
                );
              }, 0)
            );
          }, 0);

          setStats({
            totalServices,
            completedServices,
            pendingServices,
            totalHours: Math.round(totalHours * 10) / 10,
          });

          // Programar recordatorios para los servicios de hoy
          const todayServices = processedData
            .filter((item) => item.start_date === todayKey)
            .map((item) => {
              const slots = getTodaySlots(item.schedule, item.assignment_type);
              const firstSlot = slots[0];

              if (firstSlot) {
                const [hours, minutes] = firstSlot.start.split(':').map(Number);
                const serviceDate = new Date();
                serviceDate.setHours(hours || 0, minutes || 0, 0, 0);

                return {
                  id: item.id,
                  title: `Servicio - ${item.user_name || 'Usuario'}`,
                  startTime: serviceDate,
                  userAddress: item.user_address,
                };
              }
              return null;
            })
            .filter(
              (service): service is NonNullable<typeof service> =>
                service !== null
            );

          if (todayServices.length > 0) {
            scheduleServiceReminders(todayServices).catch((error: any) => {
              console.error('Error scheduling service reminders:', error);
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => setLoading(false));
  }, [todayKey, user?.email, completedIds]);

  const dayKey = useMemo(() => {
    const d = new Date();
    const dow = d.getDay();
    return (
      [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][dow] ?? 'monday'
    );
  }, []);

  type TimeSlotRange = { start: string; end: string };

  const getTodaySlots = (
    schedule: unknown,
    assignmentType: string
  ): TimeSlotRange[] => {
    try {
      const sc =
        typeof schedule === 'string'
          ? (JSON.parse(schedule) as Record<string, unknown>)
          : (schedule as Record<string, unknown>);

      const isSunday: boolean = new Date().getDay() === 0;
      const type = (assignmentType ?? '').toLowerCase();
      const shouldUseHoliday: boolean = isSunday || type === 'festivos';

      const dayConfig = (sc?.[dayKey] as Record<string, unknown>) ?? undefined;
      const daySlotsRaw = Array.isArray(dayConfig?.['timeSlots'])
        ? (dayConfig?.['timeSlots'] as unknown[])
        : [];
      const daySlots: TimeSlotRange[] = daySlotsRaw
        .map((slot: unknown) => {
          const s = slot as Record<string, unknown>;
          const start = (s?.['start'] as string | undefined) ?? '';
          const end = (s?.['end'] as string | undefined) ?? '';
          if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
            return { start, end };
          }
          return null;
        })
        .filter((v): v is TimeSlotRange => v !== null);

      if (shouldUseHoliday || daySlots.length === 0) {
        const holidayConfig =
          (sc?.['holiday_config'] as Record<string, unknown> | undefined) ??
          undefined;
        const holidayFromConfig = Array.isArray(
          holidayConfig?.['holiday_timeSlots']
        )
          ? (holidayConfig?.['holiday_timeSlots'] as unknown[])
          : [];

        const holidayDay = (sc?.['holiday'] as Record<string, unknown>) ?? {};
        const holidayFromDay = Array.isArray(holidayDay?.['timeSlots'])
          ? (holidayDay?.['timeSlots'] as unknown[])
          : [];

        const rawHoliday =
          holidayFromConfig.length > 0 ? holidayFromConfig : holidayFromDay;

        const holidaySlots: TimeSlotRange[] = rawHoliday
          .map((slot: unknown) => {
            const s = slot as Record<string, unknown>;
            const start = (s?.['start'] as string | undefined) ?? '';
            const end = (s?.['end'] as string | undefined) ?? '';
            if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
              return { start, end };
            }
            return null;
          })
          .filter((v): v is TimeSlotRange => v !== null);

        if (holidaySlots.length > 0) return holidaySlots;
      }

      return daySlots;
    } catch {
      return [];
    }
  };

  const getStartMinutes = (
    schedule: unknown,
    assignmentType: string
  ): number => {
    const slots = getTodaySlots(schedule, assignmentType);
    if (slots.length > 0) {
      const [hh, mm] = slots[0]?.start.split(':') || [];
      return Number(hh) * 60 + Number(mm);
    }
    return 24 * 60 + 1;
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aCompleted = completedIds.has(a.id) ? 1 : 0;
      const bCompleted = completedIds.has(b.id) ? 1 : 0;
      if (aCompleted !== bCompleted) return aCompleted - bCompleted;
      const ta = getStartMinutes(a.schedule, a.assignment_type);
      const tb = getStartMinutes(b.schedule, b.assignment_type);
      return ta - tb;
    });
  }, [rows, completedIds]);

  // Separar servicios de hoy y próximos
  const todayServices = useMemo(() => {
    return sortedRows.filter((row) => row.start_date === todayKey);
  }, [sortedRows, todayKey]);

  const upcomingServices = useMemo(() => {
    return sortedRows.filter((row) => row.start_date > todayKey).slice(0, 3);
  }, [sortedRows, todayKey]);

  const handleComplete = async (assignmentId: string): Promise<void> => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(assignmentId);
      return next;
    });
    const { error } = await supabase.from('system_activities').insert({
      user_id: session?.user?.id ?? null,
      activity_type: 'service_completed',
      entity_type: 'assignment',
      entity_id: assignmentId,
      description: 'Servicio completado desde app móvil',
    });
    if (error !== null) {
      Alert.alert('Aviso', 'No se pudo registrar la actividad (permisos).');
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Marcar Inicio',
      icon: '▶️',
      onPress: () => {
        Alert.alert('Acción', 'Marcar inicio de jornada');
        notifyAssignmentUpdate(
          'Jornada Iniciada',
          'Has iniciado tu jornada laboral'
        ).catch(() => {
          // Error handled silently
        });
      },
    },
    {
      id: '2',
      title: 'Marcar Fin',
      icon: '⏹️',
      onPress: () => {
        Alert.alert('Acción', 'Marcar fin de jornada');
        notifyAssignmentUpdate(
          'Jornada Finalizada',
          'Has terminado tu jornada laboral'
        ).catch(() => {
          // Error handled silently
        });
      },
    },
    {
      id: '3',
      title: 'Pausa',
      icon: '⏸️',
      onPress: () => Alert.alert('Acción', 'Marcar pausa'),
    },
    {
      id: '4',
      title: 'Emergencia',
      icon: '🚨',
      onPress: () => {
        Alert.alert('Acción', 'Reportar emergencia');
        notifyAssignmentUpdate(
          '🚨 Emergencia',
          'Se ha reportado una situación de emergencia'
        ).catch(() => {
          // Error handled silently
        });
      },
    },
  ];

  const infoCards: InfoCard[] = [
    {
      id: '1',
      title: 'Servicios Hoy',
      value: stats.totalServices.toString(),
      subtitle: 'Total programados',
      color: '#3b82f6',
    },
    {
      id: '2',
      title: 'Completados',
      value: stats.completedServices.toString(),
      subtitle: 'Servicios finalizados',
      color: '#22c55e',
    },
    {
      id: '3',
      title: 'Horas',
      value: `${stats.totalHours}h`,
      subtitle: 'Tiempo total',
      color: '#f97316',
    },
    {
      id: '4',
      title: 'Pendientes',
      value: stats.pendingServices.toString(),
      subtitle: 'Por completar',
      color: '#f59e0b',
    },
  ];

  const renderServiceCard = (item: Row, isToday: boolean = true) => {
    const slots = getTodaySlots(item.schedule, item.assignment_type);
    const isCompleted = completedIds.has(item.id);

    return (
      <View style={[styles.card, isCompleted && styles.completedCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.assignment_type}</Text>
          {isCompleted && (
            <Text style={styles.completedBadge}>✓ Completado</Text>
          )}
        </View>

        {item.user_name && (
          <Text style={styles.userName}>{item.user_name}</Text>
        )}

        <Text style={styles.cardMeta}>
          {item.start_date} → {item.end_date ?? '—'}
        </Text>

        <View style={styles.slotsContainer}>
          {slots.length > 0 ? (
            slots.map((s, idx) => (
              <Text key={`${item.id}-slot-${idx}`} style={styles.slot}>
                🕐 {s.start} - {s.end}
              </Text>
            ))
          ) : (
            <Text style={styles.slot}>—</Text>
          )}
        </View>

        {!isCompleted && isToday && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => void handleComplete(item.id)}
          >
            <Text style={styles.completeButtonText}>Marcar completado</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando servicios...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Horarios de Hoy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕐 Horarios de Hoy</Text>
        {todayServices.length > 0 ? (
          todayServices.map((item) => renderServiceCard(item, true))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay servicios programados para hoy
            </Text>
          </View>
        )}
      </View>

      {/* Próximos Servicios */}
      {upcomingServices.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Próximos Servicios</Text>
          {upcomingServices.map((item) => renderServiceCard(item, false))}
        </View>
      )}

      {/* Acciones Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickActionButton}
              onPress={action.onPress}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tarjetas Informativas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Resumen del Día</Text>
        <View style={styles.infoCardsContainer}>
          {infoCards.map((card) => (
            <View
              key={card.id}
              style={[styles.infoCard, { borderLeftColor: card.color }]}
            >
              <Text style={styles.infoCardValue}>{card.value}</Text>
              <Text style={styles.infoCardTitle}>{card.title}</Text>
              {card.subtitle && (
                <Text style={styles.infoCardSubtitle}>{card.subtitle}</Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: '#64748b',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1e293b',
  },
  infoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  infoCardSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  completedBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  slotsContainer: {
    marginBottom: 12,
  },
  slot: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  completeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});

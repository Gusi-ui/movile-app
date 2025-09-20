import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import logger from '../utils/logger';
import { Colors } from '../constants/colors';

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users: { name: string | null; surname: string | null };
}

interface DatabaseAssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users:
    | { name: string | null; surname: string | null }
    | { name: string | null; surname: string | null }[];
}

interface ServiceRow {
  assignmentId: string;
  userLabel: string;
  start: string;
  end: string;
  startMinutes: number;
  state: 'pending' | 'inprogress' | 'done';
}

export default function HomeScreen(): React.JSX.Element {
  const { state } = useAuth();
  const { currentWorker } = state;
  const { scheduleServiceReminders, notifyAssignmentUpdate } =
    useNotifications();

  const [todayAssignments, setTodayAssignments] = useState<AssignmentRow[]>([]);
  const [weeklyHours] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeUsers] = useState<number>(0);
  const [isHolidayToday, setIsHolidayToday] = useState<boolean>(false);
  const [upcomingServices] = useState({
    tomorrow: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  const toMinutes = useCallback((hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  }, []);

  const getTodaySlots = useCallback(
    (
      schedule: unknown,
      assignmentType: string,
      useHoliday: boolean
    ): { start: string; end: string }[] => {
      try {
        const sc =
          typeof schedule === 'string'
            ? (JSON.parse(schedule) as Record<string, unknown>)
            : (schedule as Record<string, unknown>);

        const today = new Date().getDay();
        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[today] ?? 'monday';

        const parseSlots = (raw: unknown[]): { start: string; end: string }[] =>
          raw
            .map((s: unknown) => {
              const slot = s as Record<string, unknown>;
              const start = (slot?.['start'] as string | undefined) ?? '';
              const end = (slot?.['end'] as string | undefined) ?? '';
              const ok = (t: string): boolean => /^\d{1,2}:\d{2}$/.test(t);
              if (ok(start) && ok(end)) {
                const pad = (t: string): string =>
                  t
                    .split(':')
                    .map((p, i) => (i === 0 ? p.padStart(2, '0') : p))
                    .join(':');
                return { start: pad(start), end: pad(end) };
              }
              return null;
            })
            .filter((v): v is { start: string; end: string } => v !== null);

        const dayConfig = (sc?.[dayName] as Record<string, unknown>) ?? {};
        const enabled = (dayConfig?.['enabled'] as boolean) ?? true;
        const daySlotsRaw = Array.isArray(dayConfig?.['timeSlots'])
          ? (dayConfig['timeSlots'] as unknown[])
          : [];
        const daySlots = enabled ? parseSlots(daySlotsRaw) : [];

        const holidayDay = (sc?.['holiday'] as Record<string, unknown>) ?? {};
        const holidayDayRaw = Array.isArray(holidayDay?.['timeSlots'])
          ? (holidayDay['timeSlots'] as unknown[])
          : [];
        const holidayCfg =
          (sc?.['holiday_config'] as Record<string, unknown> | undefined) ??
          undefined;
        const holidayCfgRaw = Array.isArray(holidayCfg?.['holiday_timeSlots'])
          ? (holidayCfg?.['holiday_timeSlots'] as unknown[])
          : [];
        const holidaySlots = parseSlots(
          holidayCfgRaw.length > 0 ? holidayCfgRaw : holidayDayRaw
        );

        const type = (assignmentType ?? '').toLowerCase();
        const mustUseHoliday = useHoliday || type === 'festivos';
        if (mustUseHoliday && holidaySlots.length > 0) return holidaySlots;
        if (daySlots.length > 0) return daySlots;
        return holidaySlots;
      } catch {
        return [];
      }
    },
    []
  );

  const formatLongDate = (d: Date): string =>
    d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const displayName = useMemo(() => {
    const meta = currentWorker?.name;
    if (typeof meta === 'string' && meta.trim() !== '') return meta;
    const email = currentWorker?.email ?? '';
    if (email.includes('@')) return email.split('@')[0] ?? 'Trabajadora';
    return 'Trabajadora';
  }, [currentWorker?.email, currentWorker?.name]);

  const renderTodayServices = (): React.JSX.Element => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const rows: ServiceRow[] = todayAssignments.flatMap(a => {
      const slots = getTodaySlots(
        a.schedule,
        a.assignment_type,
        isHolidayToday
      );
      const label =
        `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';
      return slots.map(s => {
        const sm = toMinutes(s.start);
        const em = toMinutes(s.end);
        let state: ServiceRow['state'] = 'pending';
        if (nowMinutes >= sm && nowMinutes < em) state = 'inprogress';
        else if (nowMinutes >= em) state = 'done';
        return {
          assignmentId: a.id,
          userLabel: label,
          start: s.start,
          end: s.end,
          startMinutes: sm,
          state,
        };
      });
    });

    const stateRank: Record<ServiceRow['state'], number> = {
      inprogress: 0,
      pending: 1,
      done: 2,
    };

    rows.sort((a, b) => {
      const sr = stateRank[a.state] - stateRank[b.state];
      if (sr !== 0) return sr;
      return a.startMinutes - b.startMinutes;
    });

    if (rows.length === 0) {
      return (
        <Text style={styles.noServicesText}>No tienes servicios para hoy.</Text>
      );
    }

    return (
      <View style={styles.servicesContainer}>
        {rows.map((r, idx) => (
          <View
            key={`${r.assignmentId}-${r.start}-${r.end}-${idx}`}
            style={[
              styles.serviceCard,
              r.state === 'pending' && styles.pendingCard,
              r.state === 'inprogress' && styles.inProgressCard,
              r.state === 'done' && styles.doneCard,
            ]}
          >
            <View style={styles.serviceHeader}>
              <View style={styles.serviceNumber}>
                <Text style={styles.serviceNumberText}>{idx + 1}</Text>
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{r.userLabel}</Text>
                <Text style={styles.serviceTime}>
                  {r.start} - {r.end}
                </Text>
                <View
                  style={[
                    styles.badge,
                    r.state === 'pending' && styles.pendingBadge,
                    r.state === 'inprogress' && styles.inProgressBadge,
                    r.state === 'done' && styles.doneBadge,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {r.state === 'pending' && 'Pendiente'}
                    {r.state === 'inprogress' && 'En curso'}
                    {r.state === 'done' && 'Completado'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={() => {
                // TODO: Navigate to assignment details
                Alert.alert('Próximamente', 'Vista de detalles del servicio');
              }}
            >
              <Text style={styles.detailsButtonText}>Ver Detalles</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const handleQuickAction = (action: string): void => {
    switch (action) {
      case 'schedule':
        Alert.alert('Próximamente', 'Ver horario completo');
        break;
      case 'contact':
        Linking.openURL('tel:+34600000000');
        break;
      case 'route':
        Alert.alert('Próximamente', 'Ruta de hoy');
        break;
      case 'notes':
        Alert.alert('Próximamente', 'Notas rápidas');
        break;
      case 'start':
        notifyAssignmentUpdate(
          'Servicio iniciado',
          'Has marcado el inicio del servicio'
        );
        break;
      case 'end':
        notifyAssignmentUpdate(
          'Servicio completado',
          'Has marcado el fin del servicio'
        );
        break;
      case 'emergency':
        notifyAssignmentUpdate(
          'Emergencia reportada',
          'Se ha notificado la situación de emergencia'
        );
        Alert.alert('Emergencia', 'Se ha notificado la situación');
        break;
    }
  };

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (currentWorker?.email === undefined) {
        setTodayAssignments([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Buscar trabajadora por email
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .ilike('email', currentWorker.email)
          .maybeSingle();

        if (workerError !== null || !workerData) {
          setTodayAssignments([]);
          setLoading(false);
          return;
        }

        const workerId = (workerData as { id: string }).id;
        const todayKey = new Date().toISOString().split('T')[0];

        // Verificar si hoy es festivo
        const { data: holidayData } = await supabase
          .from('holidays')
          .select('id')
          .eq('day', new Date().getDate())
          .eq('month', new Date().getMonth() + 1)
          .eq('year', new Date().getFullYear())
          .maybeSingle();

        const dow = new Date().getDay();
        const useHoliday = holidayData !== null || dow === 0 || dow === 6;
        setIsHolidayToday(useHoliday);

        // Obtener asignaciones de hoy
        const { data: rows, error: err } = await supabase
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
          .eq('worker_id', workerId)
          .eq('status', 'active')
          .lte('start_date', todayKey)
          .or(`end_date.is.null,end_date.gte.${todayKey}`);

        if (err === null && rows !== null) {
          // Transformar datos para que coincidan con la interfaz
          const transformedRows = rows.map((row: DatabaseAssignmentRow) => ({
            ...row,
            users: Array.isArray(row.users) ? row.users[0] : row.users,
          })) as AssignmentRow[];

          const filtered = transformedRows.filter(a => {
            const slots = getTodaySlots(
              a.schedule,
              a.assignment_type,
              useHoliday
            );
            if (slots.length === 0) return false;
            const t = (a.assignment_type ?? '').toLowerCase();
            if (useHoliday) return t === 'festivos' || t === 'flexible';
            return t === 'laborables' || t === 'flexible';
          });
          setTodayAssignments(filtered);

          // Programar recordatorios de servicios - convertir formato
          const reminders = filtered.map(assignment => ({
            id: assignment.id,
            title:
              `${assignment.users.name || ''} ${assignment.users.surname || ''}`.trim() ||
              'Servicio',
            startTime: new Date(), // TODO: calcular tiempo real del primer slot
          }));
          scheduleServiceReminders(reminders);
        } else {
          setTodayAssignments([]);
        }

        // Cargar estadísticas adicionales (similar al web)
        // ... resto de la lógica de carga
      } catch (error) {
        logger.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentWorker?.email, getTodaySlots, scheduleServiceReminders]);

  return (
    <ScrollView style={styles.container}>
      {/* Header con saludo */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting}, {displayName} 👋
        </Text>
        <Text style={styles.subtitle}>
          Aquí tienes el resumen de tu gestión
        </Text>
      </View>

      {/* Horarios de Hoy */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🕐 Horarios de Hoy</Text>
        <Text style={styles.sectionSubtitle}>{formatLongDate(new Date())}</Text>
        {loading ? (
          <Text style={styles.loadingText}>Cargando…</Text>
        ) : (
          renderTodayServices()
        )}
      </View>

      {/* Próximos Servicios */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Próximos Servicios</Text>
        <Text style={styles.sectionSubtitle}>
          Planificación de servicios futuros
        </Text>

        <TouchableOpacity style={styles.upcomingCard}>
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingLabel}>Mañana</Text>
            <Text style={styles.upcomingDescription}>
              Servicios programados
            </Text>
          </View>
          <Text style={styles.upcomingCount}>{upcomingServices.tomorrow}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.upcomingCard}>
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingLabel}>Esta Semana</Text>
            <Text style={styles.upcomingDescription}>Próximos días</Text>
          </View>
          <Text style={styles.upcomingCount}>{upcomingServices.thisWeek}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.upcomingCard}>
          <View style={styles.upcomingInfo}>
            <Text style={styles.upcomingLabel}>Este Mes</Text>
            <Text style={styles.upcomingDescription}>Vista general</Text>
          </View>
          <Text style={styles.upcomingCount}>{upcomingServices.thisMonth}</Text>
        </TouchableOpacity>
      </View>

      {/* Acciones Rápidas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Acciones Rápidas</Text>
        <Text style={styles.sectionSubtitle}>
          Acceso directo a funciones principales
        </Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleQuickAction('schedule')}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>Ver Mi Horario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleQuickAction('contact')}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>Contactar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleQuickAction('route')}
          >
            <Text style={styles.actionIcon}>🗺️</Text>
            <Text style={styles.actionLabel}>Ruta de Hoy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleQuickAction('notes')}
          >
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionLabel}>Notas Rápidas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tarjetas Informativas */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Servicios Hoy</Text>
          <Text style={styles.statValue}>
            {loading ? '-' : todayAssignments.length}
          </Text>
          <Text style={styles.statDescription}>asignaciones activas</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Horas Esta Semana</Text>
          <Text style={styles.statValue}>
            {loading ? '-' : weeklyHours.toFixed(1)}
          </Text>
          <Text style={styles.statDescription}>programadas</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Usuarios Activos</Text>
          <Text style={styles.statValue}>{loading ? '-' : activeUsers}</Text>
          <Text style={styles.statDescription}>registrados</Text>
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
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: Colors.backgroundCard,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  section: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  noServicesText: {
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  servicesContainer: {
    gap: 12,
  },
  serviceCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingCard: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warning,
  },
  inProgressCard: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.success,
  },
  doneCard: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceNumber: {
    width: 40,
    height: 40,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.info,
    marginRight: 12,
  },
  serviceNumberText: {
    fontWeight: 'bold',
    color: Colors.info,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 4,
  },
  serviceTime: {
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: Colors.statusPending,
  },
  inProgressBadge: {
    backgroundColor: Colors.success,
  },
  doneBadge: {
    backgroundColor: Colors.error,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  detailsButton: {
    backgroundColor: Colors.backgroundLight,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailsButtonText: {
    textAlign: 'center',
    color: Colors.textGray,
    fontWeight: '500',
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
    marginBottom: 8,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textDark,
  },
  upcomingDescription: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  upcomingCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.info,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.backgroundLight,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textGray,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 2,
  },
  statDescription: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  bottomSpacing: {
    height: 100,
  },
});

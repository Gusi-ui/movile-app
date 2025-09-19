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

interface AssignmentRow {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  users: { name: string | null; surname: string | null };
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
  const { user } = useAuth();
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

  const toMinutes = (hhmm: string): number => {
    const [h, m] = hhmm.split(':');
    return Number(h) * 60 + Number(m);
  };

  const getTodaySlots = useCallback(
    (
      schedule: unknown,
      assignmentType: string,
      useHoliday: boolean
    ): Array<{ start: string; end: string }> => {
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

        const parseSlots = (
          raw: unknown[]
        ): Array<{ start: string; end: string }> =>
          raw
            .map((s: unknown) => {
              const slot = s as Record<string, unknown>;
              const start = (slot?.['start'] as string | undefined) ?? '';
              const end = (slot?.['end'] as string | undefined) ?? '';
              const ok = (t: string): boolean => /^\d{1,2}:\d{2}$/.test(t);
              if (ok(start) && ok(end)) {
                const pad = (t: string) =>
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
    const meta = user?.name;
    if (typeof meta === 'string' && meta.trim() !== '') return meta;
    const email = user?.email ?? '';
    if (email.includes('@')) return email.split('@')[0] ?? 'Trabajadora';
    return 'Trabajadora';
  }, [user?.email, user?.name]);

  const renderTodayServices = (): React.JSX.Element => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const rows: ServiceRow[] = todayAssignments.flatMap((a) => {
      const slots = getTodaySlots(
        a.schedule,
        a.assignment_type,
        isHolidayToday
      );
      const label =
        `${a.users?.name ?? ''} ${a.users?.surname ?? ''}`.trim() || 'Servicio';
      return slots.map((s) => {
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
      if (user?.email === undefined) {
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
          .ilike('email', user.email)
          .maybeSingle();

        if (workerError !== null || workerData === null) {
          setTodayAssignments([]);
          setLoading(false);
          return;
        }

        const workerId = workerData.id;
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
          const transformedRows = rows.map((row: any) => ({
            ...row,
            users: Array.isArray(row.users) ? row.users[0] : row.users,
          })) as AssignmentRow[];

          const filtered = transformedRows.filter((a) => {
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
          const reminders = filtered.map((assignment) => ({
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
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.email, getTodaySlots, scheduleServiceReminders]);

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
            {loading ? '...' : todayAssignments.length}
          </Text>
          <Text style={styles.statDescription}>asignaciones activas</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Horas Esta Semana</Text>
          <Text style={styles.statValue}>
            {loading ? '...' : weeklyHours.toFixed(1)}
          </Text>
          <Text style={styles.statDescription}>programadas</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Usuarios Activos</Text>
          <Text style={styles.statValue}>{loading ? '...' : activeUsers}</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  loadingText: {
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
  },
  noServicesText: {
    color: '#6b7280',
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
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
  },
  inProgressCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#34d399',
  },
  doneCard: {
    backgroundColor: '#fee2e2',
    borderColor: '#f87171',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceNumber: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginRight: 12,
  },
  serviceNumberText: {
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  serviceTime: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.8)',
  },
  inProgressBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  doneBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  detailsButton: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  detailsButtonText: {
    textAlign: 'center',
    color: '#374151',
    fontWeight: '500',
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  upcomingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  upcomingCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  statDescription: {
    fontSize: 10,
    color: '#9ca3af',
  },
  bottomSpacing: {
    height: 100,
  },
});

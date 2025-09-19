import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Assignment {
  id: string;
  assignment_type: string;
  schedule: unknown;
  start_date: string;
  end_date: string | null;
  user_name: string;
  user_address: string;
}

interface Holiday {
  id: string;
  day: number;
  month: number;
  year: number;
  name: string;
}

interface DayInfo {
  date: Date;
  dateString: string;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  assignments: Assignment[];
  totalHours: number;
}

export default function PlanningScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const email = user?.email ?? '';
      if (email.trim() === '') {
        setAssignments([]);
        setHolidays([]);
        return;
      }

      // Buscar trabajadora por email
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('email', email)
        .single();

      if (workerError !== null || workerData === null) {
        setAssignments([]);
        setHolidays([]);
        return;
      }

      const workerId = workerData.id;

      // Fechas del mes seleccionado
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      // Cargar asignaciones del mes
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(
          `
          id,
          assignment_type,
          schedule,
          start_date,
          end_date,
          users!inner(name, surname, address)
        `
        )
        .eq('worker_id', workerId)
        .eq('status', 'active')
        .lte('start_date', endDateString)
        .or(`end_date.is.null,end_date.gte.${startDateString}`);

      if (assignmentError === null && assignmentData !== null) {
        const processedAssignments = assignmentData.map((item: any) => ({
          ...item,
          user_name:
            `${item.users?.name ?? ''} ${item.users?.surname ?? ''}`.trim(),
          user_address: item.users?.address ?? '',
        }));
        setAssignments(processedAssignments);
      }

      // Cargar festivos del año
      const { data: holidayData, error: holidayError } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', selectedYear);

      if (holidayError === null && holidayData !== null) {
        setHolidays(holidayData);
      }
    } catch (error) {
      console.error('Error loading planning data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email, selectedMonth, selectedYear]);

  useEffect(() => {
    loadData().catch(() => setLoading(false));
  }, [loadData]);

  const getDaySlots = useCallback(
    (
      schedule: unknown,
      assignmentType: string,
      dayOfWeek: number,
      isHoliday: boolean
    ): Array<{ start: string; end: string }> => {
      try {
        const sc =
          typeof schedule === 'string'
            ? (JSON.parse(schedule) as Record<string, unknown>)
            : (schedule as Record<string, unknown>);

        const dayNames = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ];
        const dayName = dayNames[dayOfWeek];

        const type = (assignmentType ?? '').toLowerCase();
        const shouldUseHoliday = isHoliday || type === 'festivos';

        if (shouldUseHoliday) {
          if (type === 'laborables') return []; // Laborables no trabajan en festivos
          const holidayConfig =
            (sc?.['holiday'] as Record<string, unknown>) ?? {};
          const timeSlots = Array.isArray(holidayConfig?.['timeSlots'])
            ? (holidayConfig['timeSlots'] as unknown[])
            : [];

          return timeSlots
            .map((slot: unknown) => {
              const s = slot as Record<string, unknown>;
              const start = (s?.['start'] as string | undefined) ?? '';
              const end = (s?.['end'] as string | undefined) ?? '';
              if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
                return { start, end };
              }
              return null;
            })
            .filter((v): v is { start: string; end: string } => v !== null);
        } else {
          if (type === 'festivos') return []; // Festivos no trabajan en días laborables
          const dayConfig =
            (sc?.[dayName as keyof typeof sc] as Record<string, unknown>) ?? {};
          const enabled = (dayConfig?.['enabled'] as boolean) ?? false;
          if (!enabled) return [];

          const timeSlots = Array.isArray(dayConfig?.['timeSlots'])
            ? (dayConfig['timeSlots'] as unknown[])
            : [];

          return timeSlots
            .map((slot: unknown) => {
              const s = slot as Record<string, unknown>;
              const start = (s?.['start'] as string | undefined) ?? '';
              const end = (s?.['end'] as string | undefined) ?? '';
              if (/^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end)) {
                return { start, end };
              }
              return null;
            })
            .filter((v): v is { start: string; end: string } => v !== null);
        }
      } catch {
        return [];
      }
    },
    []
  );

  const calculateDayHours = useCallback(
    (slots: Array<{ start: string; end: string }>): number => {
      return slots.reduce((total, slot) => {
        const [startH, startM] = slot.start.split(':').map(Number);
        const [endH, endM] = slot.end.split(':').map(Number);
        const minutes =
          (endH || 0) * 60 + (endM || 0) - ((startH || 0) * 60 + (startM || 0));
        return total + minutes / 60;
      }, 0);
    },
    []
  );

  const monthDays = useMemo((): DayInfo[] => {
    const today = new Date();
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const days: DayInfo[] = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const holiday = holidays.find(
        (h) =>
          h.day === day &&
          h.month === selectedMonth + 1 &&
          h.year === selectedYear
      );
      const isHoliday = !!holiday || isWeekend;

      // Filtrar asignaciones que aplican para este día
      const dayAssignments = assignments.filter((assignment) => {
        const startDate = new Date(assignment.start_date);
        const endDate = assignment.end_date
          ? new Date(assignment.end_date)
          : null;

        if (date < startDate) return false;
        if (endDate && date > endDate) return false;

        const slots = getDaySlots(
          assignment.schedule,
          assignment.assignment_type,
          dayOfWeek,
          isHoliday
        );
        return slots.length > 0;
      });

      // Calcular horas totales del día
      const totalHours = dayAssignments.reduce((total, assignment) => {
        const slots = getDaySlots(
          assignment.schedule,
          assignment.assignment_type,
          dayOfWeek,
          isHoliday
        );
        return total + calculateDayHours(slots);
      }, 0);

      days.push({
        date,
        dateString: dateString || '',
        isToday,
        isWeekend,
        isHoliday,
        holidayName: holiday?.name || '',
        assignments: dayAssignments,
        totalHours,
      });
    }

    return days;
  }, [
    selectedMonth,
    selectedYear,
    assignments,
    holidays,
    getDaySlots,
    calculateDayHours,
  ]);

  const renderMonthSelector = () => (
    <View style={styles.selectorContainer}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(selectedYear - 1);
          } else {
            setSelectedMonth(selectedMonth - 1);
          }
        }}
      >
        <Text style={styles.selectorButtonText}>‹ Anterior</Text>
      </TouchableOpacity>

      <View style={styles.currentMonthContainer}>
        <Text style={styles.currentMonthText}>
          {monthNames[selectedMonth]} {selectedYear}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(selectedYear + 1);
          } else {
            setSelectedMonth(selectedMonth + 1);
          }
        }}
      >
        <Text style={styles.selectorButtonText}>Siguiente ›</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalendarHeader = () => (
    <View style={styles.calendarHeader}>
      {dayNames.map((day, index) => (
        <View key={day} style={styles.dayHeaderCell}>
          <Text
            style={[
              styles.dayHeaderText,
              (index === 0 || index === 6) && styles.weekendHeaderText,
            ]}
          >
            {day}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderDayCell = (dayInfo: DayInfo) => {
    const {
      date,
      isToday,
      isWeekend,
      isHoliday,
      holidayName,
      assignments,
      totalHours,
    } = dayInfo;

    const cellStyles = [styles.dayCell] as any[];
    const textStyles = [styles.dayNumber] as any[];

    if (isToday) {
      cellStyles.push(styles.todayCell);
      textStyles.push(styles.todayText);
    } else if (isHoliday) {
      cellStyles.push(styles.holidayCell);
      textStyles.push(styles.holidayText);
    } else if (isWeekend) {
      textStyles.push(styles.weekendText);
    }

    if (assignments.length > 0) {
      cellStyles.push(styles.workDayCell);
    }

    return (
      <TouchableOpacity
        key={date.getDate()}
        style={cellStyles}
        onPress={() => {
          // Aquí se podría abrir un modal con detalles del día
        }}
      >
        <Text style={textStyles}>{date.getDate()}</Text>

        {totalHours > 0 && (
          <View style={styles.hoursIndicator}>
            <Text style={styles.hoursText}>{totalHours.toFixed(1)}h</Text>
          </View>
        )}

        {assignments.length > 0 && (
          <View style={styles.assignmentsIndicator}>
            <Text style={styles.assignmentsCount}>{assignments.length}</Text>
          </View>
        )}

        {holidayName && (
          <View style={styles.holidayIndicator}>
            <Text style={styles.holidayIndicatorText}>🎉</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCalendar = () => {
    const weeks: DayInfo[][] = [];
    let currentWeek: DayInfo[] = [];

    // Añadir días vacíos al inicio del mes
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const startDay = firstDay.getDay();

    for (let i = 0; i < startDay; i++) {
      currentWeek.push({} as DayInfo);
    }

    // Añadir días del mes
    monthDays.forEach((day) => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });

    // Completar la última semana
    while (currentWeek.length < 7) {
      currentWeek.push({} as DayInfo);
    }
    weeks.push(currentWeek);

    return (
      <View style={styles.calendar}>
        {renderCalendarHeader()}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.calendarWeek}>
            {week.map((day, dayIndex) =>
              day.date ? (
                renderDayCell(day)
              ) : (
                <View key={dayIndex} style={styles.emptyDayCell} />
              )
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderMonthSummary = () => {
    const totalHours = monthDays.reduce((sum, day) => sum + day.totalHours, 0);
    const workDays = monthDays.filter(
      (day) => day.assignments.length > 0
    ).length;
    const totalAssignments = monthDays.reduce(
      (sum, day) => sum + day.assignments.length,
      0
    );

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📊 Resumen del Mes</Text>

        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardValue}>
              {totalHours.toFixed(1)}h
            </Text>
            <Text style={styles.summaryCardLabel}>Total Horas</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardValue}>{workDays}</Text>
            <Text style={styles.summaryCardLabel}>Días de Trabajo</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardValue}>{totalAssignments}</Text>
            <Text style={styles.summaryCardLabel}>Servicios</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando planning...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderMonthSelector()}
      {renderCalendar()}
      {renderMonthSummary()}
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
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectorButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  currentMonthContainer: {
    flex: 1,
    alignItems: 'center',
  },
  currentMonthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  calendar: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  calendarHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
  },
  dayHeaderCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  weekendHeaderText: {
    color: '#ef4444',
  },
  calendarWeek: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    padding: 4,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  emptyDayCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  todayCell: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  holidayCell: {
    backgroundColor: '#fef3c7',
  },
  workDayCell: {
    backgroundColor: '#f0fdf4',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  todayText: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  holidayText: {
    color: '#d97706',
  },
  weekendText: {
    color: '#ef4444',
  },
  hoursIndicator: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginBottom: 1,
  },
  hoursText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '600',
  },
  assignmentsIndicator: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 2,
    right: 2,
  },
  assignmentsCount: {
    fontSize: 8,
    color: 'white',
    fontWeight: '700',
  },
  holidayIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  holidayIndicatorText: {
    fontSize: 8,
  },
  summaryContainer: {
    margin: 16,
    marginTop: 0,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});

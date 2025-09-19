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

interface MonthlyBalance {
  id: string;
  year: number;
  month: number;
  total_hours: number;
  worked_hours: number;
  holiday_hours: number;
  balance: number;
}

interface Assignment {
  id: string;
  assignment_type: string;
  weekly_hours: number;
  start_date: string;
  end_date: string | null;
  user_name: string;
}

export default function BalancesScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
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

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const email = user?.email ?? '';
      if (email.trim() === '') {
        setBalances([]);
        setAssignments([]);
        return;
      }

      // Buscar trabajadora por email
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('email', email)
        .single();

      if (workerError !== null || workerData === null) {
        setBalances([]);
        setAssignments([]);
        return;
      }

      const workerId = workerData.id;

      // Cargar balances de horas
      const { data: balanceData, error: balanceError } = await supabase
        .from('hours_balances')
        .select('*')
        .eq('worker_id', workerId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (balanceError === null && balanceData !== null) {
        setBalances(balanceData);
      }

      // Cargar asignaciones activas para el mes seleccionado
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(
          `
          id,
          assignment_type,
          weekly_hours,
          start_date,
          end_date,
          users!inner(name, surname)
        `
        )
        .eq('worker_id', workerId)
        .lte('start_date', endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`);

      if (assignmentError === null && assignmentData !== null) {
        const processedAssignments = assignmentData.map((item: any) => ({
          ...item,
          user_name:
            `${item.users?.name ?? ''} ${item.users?.surname ?? ''}`.trim(),
        }));
        setAssignments(processedAssignments);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email, selectedYear, selectedMonth]);

  useEffect(() => {
    loadData().catch(() => setLoading(false));
  }, [loadData]);

  const currentMonthBalance = useMemo(() => {
    return balances.find(
      (b) => b.year === selectedYear && b.month === selectedMonth
    );
  }, [balances, selectedYear, selectedMonth]);

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return '#22c55e'; // Verde para balance positivo
    if (balance < 0) return '#ef4444'; // Rojo para balance negativo
    return '#64748b'; // Gris para balance neutral
  };

  const getBalanceIcon = (balance: number): string => {
    if (balance > 0) return '📈';
    if (balance < 0) return '📉';
    return '📊';
  };

  const renderMonthSelector = () => (
    <View style={styles.selectorContainer}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          if (selectedMonth === 1) {
            setSelectedMonth(12);
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
          {monthNames[selectedMonth - 1]} {selectedYear}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => {
          if (selectedMonth === 12) {
            setSelectedMonth(1);
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

  const renderBalanceCard = () => {
    if (!currentMonthBalance) {
      return (
        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardTitle}>
            {getBalanceIcon(0)} Balance de {monthNames[selectedMonth - 1]}
          </Text>
          <Text style={styles.noDataText}>
            No hay datos de balance para este mes
          </Text>
        </View>
      );
    }

    const balance = currentMonthBalance.balance;
    const balanceColor = getBalanceColor(balance);
    const balanceIcon = getBalanceIcon(balance);

    return (
      <View style={styles.balanceCard}>
        <Text style={styles.balanceCardTitle}>
          {balanceIcon} Balance de {monthNames[selectedMonth - 1]}
        </Text>

        <View style={styles.balanceStatsContainer}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.total_hours.toFixed(1)}h
            </Text>
            <Text style={styles.balanceStatLabel}>Horas Asignadas</Text>
          </View>

          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.worked_hours.toFixed(1)}h
            </Text>
            <Text style={styles.balanceStatLabel}>Horas Trabajadas</Text>
          </View>

          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.holiday_hours.toFixed(1)}h
            </Text>
            <Text style={styles.balanceStatLabel}>Horas Festivos</Text>
          </View>
        </View>

        <View
          style={[styles.finalBalanceContainer, { borderColor: balanceColor }]}
        >
          <Text style={[styles.finalBalanceLabel, { color: balanceColor }]}>
            Balance Final
          </Text>
          <Text style={[styles.finalBalanceValue, { color: balanceColor }]}>
            {balance > 0 ? '+' : ''}
            {balance.toFixed(1)}h
          </Text>
          <Text style={styles.finalBalanceDescription}>
            {balance > 0
              ? 'Horas extras trabajadas'
              : balance < 0
                ? 'Horas pendientes de completar'
                : 'Balance equilibrado'}
          </Text>
        </View>
      </View>
    );
  };

  const renderAssignmentsList = () => (
    <View style={styles.assignmentsContainer}>
      <Text style={styles.assignmentsTitle}>
        📋 Asignaciones de {monthNames[selectedMonth - 1]}
      </Text>

      {assignments.length > 0 ? (
        assignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentType}>
                {assignment.assignment_type.toUpperCase()}
              </Text>
              <Text style={styles.assignmentHours}>
                {assignment.weekly_hours}h/semana
              </Text>
            </View>

            <Text style={styles.assignmentUser}>👤 {assignment.user_name}</Text>

            <Text style={styles.assignmentPeriod}>
              📅 {assignment.start_date} → {assignment.end_date ?? 'Indefinido'}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No hay asignaciones para este mes
          </Text>
        </View>
      )}
    </View>
  );

  const renderHistoryList = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.historyTitle}>📊 Historial de Balances</Text>

      {balances.length > 0 ? (
        balances.slice(0, 6).map((balance) => {
          const balanceColor = getBalanceColor(balance.balance);
          const isCurrentMonth =
            balance.year === selectedYear && balance.month === selectedMonth;

          return (
            <TouchableOpacity
              key={`${balance.year}-${balance.month}`}
              style={[
                styles.historyCard,
                isCurrentMonth && styles.historyCardActive,
              ]}
              onPress={() => {
                setSelectedYear(balance.year);
                setSelectedMonth(balance.month);
              }}
            >
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyCardMonth}>
                  {monthNames[balance.month - 1]} {balance.year}
                </Text>
                <Text
                  style={[styles.historyCardBalance, { color: balanceColor }]}
                >
                  {balance.balance > 0 ? '+' : ''}
                  {balance.balance.toFixed(1)}h
                </Text>
              </View>

              <View style={styles.historyCardStats}>
                <Text style={styles.historyCardStat}>
                  Trabajadas: {balance.worked_hours.toFixed(1)}h
                </Text>
                <Text style={styles.historyCardStat}>
                  Asignadas: {balance.total_hours.toFixed(1)}h
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No hay historial de balances disponible
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando balances...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderMonthSelector()}
      {renderBalanceCard()}
      {renderAssignmentsList()}
      {renderHistoryList()}
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
  balanceCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  balanceStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  balanceStat: {
    alignItems: 'center',
  },
  balanceStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  balanceStatLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  finalBalanceContainer: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  finalBalanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  finalBalanceValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  finalBalanceDescription: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  assignmentsContainer: {
    margin: 16,
    marginTop: 0,
  },
  assignmentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assignmentType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  assignmentHours: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
  },
  assignmentUser: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  assignmentPeriod: {
    fontSize: 12,
    color: '#64748b',
  },
  historyContainer: {
    margin: 16,
    marginTop: 0,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyCardActive: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyCardMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyCardBalance: {
    fontSize: 16,
    fontWeight: '700',
  },
  historyCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyCardStat: {
    fontSize: 12,
    color: '#64748b',
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
    fontStyle: 'italic',
  },
});

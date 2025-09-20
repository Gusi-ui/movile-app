import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from 'react-native';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface MonthlyBalance {
  id: string;
  worker_id: string;
  year: number;
  month: number;
  total_hours: number;
  worked_hours: number;
  holiday_hours: number;
  balance: number;
  services_completed: number;
  clients_served: number;
  earnings: number;
  created_at?: string;
  updated_at?: string;
}

interface ServiceAssignment {
  id: string;
  worker_id?: string;
  client_name: string;
  service_type: string;
  weekly_hours: number;
  start_date: string;
  end_date: string | null;
  hourly_rate: number;
  status?: string;
}



export default function BalancesScreen(): React.JSX.Element {
  const { state } = useAuth();
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
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
      const email = state.currentWorker?.email ?? '';
      if (email.trim() === '') {
        setBalances([]);
        setAssignments([]);
        return;
      }

      // Buscar el trabajador por email
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .select('id')
        .eq('email', email)
        .single();

      if (workerError || !worker) {
        console.error('Error finding worker:', workerError);
        setBalances([]);
        setAssignments([]);
        return;
      }

      const workerId = (worker as any).id;

      // Cargar balances mensuales para el año seleccionado
      const { data: monthlyBalances, error: balancesError } = await supabase
        .from('monthly_balances')
        .select('*')
        .eq('worker_id', workerId)
        .eq('year', selectedYear)
        .order('month', { ascending: false });

      if (balancesError) {
        console.error('Error loading balances:', balancesError);
        setBalances([]);
      } else {
        setBalances((monthlyBalances as MonthlyBalance[]) || []);
      }

      // Cargar asignaciones activas para el mes seleccionado
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const { data: activeAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          client_name,
          service_type,
          weekly_hours,
          start_date,
          end_date,
          hourly_rate
        `)
        .eq('worker_id', workerId)
        .eq('status', 'active')
        .lte('start_date', endDate.toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${startDate.toISOString().split('T')[0]}`);

      if (assignmentsError) {
        console.error('Error loading assignments:', assignmentsError);
        setAssignments([]);
      } else {
        setAssignments((activeAssignments as ServiceAssignment[]) || []);
      }
    } catch (error) {
      console.error('Error loading balances:', error);
    } finally {
      setLoading(false);
    }
  }, [state.currentWorker?.email, selectedYear, selectedMonth]);

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

  const getServiceIcon = (serviceType: string): string => {
    switch (serviceType) {
      case 'Cuidado Personal':
        return '👩‍⚕️';
      case 'Limpieza Doméstica':
        return '🧹';
      case 'Acompañamiento':
        return '🤝';
      default:
        return '🏠';
    }
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
            📊 Resumen de {monthNames[selectedMonth - 1]}
          </Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay datos disponibles para este mes
            </Text>
          </View>
        </View>
      );
    }

    const balanceColor = getBalanceColor(currentMonthBalance.balance);
    const balanceIcon = getBalanceIcon(currentMonthBalance.balance);

    return (
      <View style={styles.balanceCard}>
        <Text style={styles.balanceCardTitle}>
          {balanceIcon} Resumen de {monthNames[selectedMonth - 1]}
        </Text>
        
        <View style={styles.balanceStatsContainer}>
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.worked_hours}h
            </Text>
            <Text style={styles.balanceStatLabel}>Horas Trabajadas</Text>
          </View>
          
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.services_completed}
            </Text>
            <Text style={styles.balanceStatLabel}>Servicios Completados</Text>
          </View>
          
          <View style={styles.balanceStat}>
            <Text style={styles.balanceStatValue}>
              {currentMonthBalance.clients_served}
            </Text>
            <Text style={styles.balanceStatLabel}>Clientes Atendidos</Text>
          </View>
        </View>

        <View style={[styles.finalBalanceContainer, { borderColor: balanceColor }]}>
          <Text style={[styles.finalBalanceLabel, { color: balanceColor }]}>
            Ingresos del Mes
          </Text>
          <Text style={[styles.finalBalanceValue, { color: balanceColor }]}>
            €{currentMonthBalance.earnings.toFixed(2)}
          </Text>
          <Text style={styles.finalBalanceDescription}>
            Balance de horas: {currentMonthBalance.balance > 0 ? '+' : ''}{currentMonthBalance.balance}h
          </Text>
        </View>
      </View>
    );
  };

  const renderAssignments = () => {
    if (assignments.length === 0) {
      return (
        <View style={styles.assignmentsContainer}>
          <Text style={styles.assignmentsTitle}>
            👥 Asignaciones Activas
          </Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No hay asignaciones activas para este mes
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.assignmentsContainer}>
        <Text style={styles.assignmentsTitle}>
          👥 Asignaciones Activas ({assignments.length})
        </Text>
        {assignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentCard}>
            <View style={styles.assignmentHeader}>
              <Text style={styles.assignmentType}>
                {getServiceIcon(assignment.service_type)} {assignment.service_type}
              </Text>
              <Text style={styles.assignmentHours}>
                {assignment.weekly_hours}h/semana
              </Text>
            </View>
            <Text style={styles.assignmentUser}>
              Cliente: {assignment.client_name}
            </Text>
            <Text style={styles.assignmentPeriod}>
              Tarifa: €{assignment.hourly_rate}/hora
            </Text>
            <Text style={styles.assignmentPeriod}>
              Desde: {new Date(assignment.start_date).toLocaleDateString('es-ES')}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderHistory = () => {
    const historyBalances = balances.filter(
      (b) => !(b.year === selectedYear && b.month === selectedMonth)
    );

    if (historyBalances.length === 0) {
      return null;
    }

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>📈 Historial de Meses</Text>
        {historyBalances.map((balance) => (
          <TouchableOpacity
            key={balance.id}
            style={styles.historyCard}
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
                style={[
                  styles.historyCardBalance,
                  { color: getBalanceColor(balance.balance) },
                ]}
              >
                €{balance.earnings.toFixed(2)}
              </Text>
            </View>
            <View style={styles.historyCardStats}>
              <Text style={styles.historyCardStat}>
                {balance.worked_hours}h trabajadas
              </Text>
              <Text style={styles.historyCardStat}>
                {balance.services_completed} servicios
              </Text>
              <Text style={styles.historyCardStat}>
                {balance.clients_served} clientes
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.loadingText}>Cargando información...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView>
        {renderMonthSelector()}
        {renderBalanceCard()}
        {renderAssignments()}
        {renderHistory()}
      </ScrollView>
    </View>
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

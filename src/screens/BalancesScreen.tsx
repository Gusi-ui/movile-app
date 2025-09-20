import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Balance, BalanceFilters } from '../types/database';
import { getWorkerBalances } from '../lib/supabase';
import { Database } from '../types/supabase';
import { Colors } from '../constants/colors';

type SupabaseBalance = Database['public']['Tables']['hours_balances']['Row'];

// Adaptador para convertir datos de Supabase al formato esperado
const adaptSupabaseBalance = (supabaseBalance: SupabaseBalance): Balance => {
  // Crear fechas del período basadas en mes y año
  const year = supabaseBalance.year;
  const monthIndex = parseInt(supabaseBalance.month) - 1; // JavaScript months are 0-indexed
  const periodStart = new Date(year, monthIndex, 1);
  const periodEnd = new Date(year, monthIndex + 1, 0); // Last day of the month

  return {
    id: supabaseBalance.id,
    worker_id: supabaseBalance.worker_id,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    base_salary: supabaseBalance.contracted_hours * 15, // Estimación: €15/hora
    overtime_hours: Math.max(
      0,
      supabaseBalance.worked_hours - supabaseBalance.contracted_hours
    ),
    overtime_rate: 20, // €20/hora extra
    bonuses: 0,
    deductions: 0,
    total_amount: supabaseBalance.balance * 15, // Convertir horas a euros
    status: supabaseBalance.balance >= 0 ? 'approved' : 'pending',
    assignments_completed: 0, // No disponible en Supabase
    routes_completed: 0, // No disponible en Supabase
    created_at: supabaseBalance.created_at || new Date().toISOString(),
    updated_at: supabaseBalance.updated_at || new Date().toISOString(),
  };
};

export default function BalancesScreen(): React.ReactElement {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<BalanceFilters>({});

  const loadBalances = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await getWorkerBalances({
        ...(filters.period_from && {
          year: new Date(filters.period_from).getFullYear(),
          month: (new Date(filters.period_from).getMonth() + 1)
            .toString()
            .padStart(2, '0'),
        }),
      });

      if (response.error) {
        setError('Error al cargar balances');
        Alert.alert('Error', 'No se pudieron cargar los balances');
        return;
      }

      const adaptedBalances = response.data.map(adaptSupabaseBalance);
      setBalances(adaptedBalances);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      Alert.alert('Error', 'No se pudieron cargar los balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadBalances();
  }, [loadBalances]);

  const getStatusColor = (status: Balance['status']): string => {
    switch (status) {
      case 'pending':
        return Colors.statusPending;
      case 'approved':
        return Colors.statusApproved;
      case 'paid':
        return Colors.statusPaid;
      case 'disputed':
        return Colors.statusDisputed;
      default:
        return Colors.statusDefault;
    }
  };

  const getStatusText = (status: Balance['status']): string => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobado';
      case 'paid':
        return 'Pagado';
      case 'disputed':
        return 'En Disputa';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPeriod = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    const endMonth = end.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });

    if (startMonth === endMonth) {
      return startMonth;
    }

    return `${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  };

  const renderBalanceItem = ({
    item,
  }: {
    item: Balance;
  }): React.ReactElement => (
    <TouchableOpacity style={styles.balanceCard}>
      <View style={styles.cardHeader}>
        <View style={styles.periodContainer}>
          <Text style={styles.periodText}>
            {formatPeriod(item.period_start, item.period_end)}
          </Text>
          <Text style={styles.periodDates}>
            {formatDate(item.period_start)} - {formatDate(item.period_end)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.totalAmountLabel}>Total</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(item.total_amount)}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Salario Base:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(item.base_salary)}
          </Text>
        </View>

        {item.overtime_hours > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Horas Extra ({item.overtime_hours}h):
            </Text>
            <Text style={styles.detailValue}>
              {formatCurrency(item.overtime_hours * item.overtime_rate)}
            </Text>
          </View>
        )}

        {item.bonuses > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bonificaciones:</Text>
            <Text style={[styles.detailValue, styles.positiveAmount]}>
              +{formatCurrency(item.bonuses)}
            </Text>
          </View>
        )}

        {item.deductions > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deducciones:</Text>
            <Text style={[styles.detailValue, styles.negativeAmount]}>
              -{formatCurrency(item.deductions)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.assignments_completed}</Text>
          <Text style={styles.statLabel}>Asignaciones</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{item.routes_completed}</Text>
          <Text style={styles.statLabel}>Rutas</Text>
        </View>
        {item.paid_at && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDate(item.paid_at)}</Text>
            <Text style={styles.statLabel}>Fecha de Pago</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No hay balances</Text>
      <Text style={styles.emptyStateText}>
        No tienes balances registrados en este momento.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadBalances}>
        <Text style={styles.refreshButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = (): React.ReactElement => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Error al cargar</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadBalances}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  const calculateTotalEarnings = (): number => {
    return balances
      .filter(balance => balance.status === 'paid')
      .reduce((total, balance) => total + balance.total_amount, 0);
  };

  const calculatePendingAmount = (): number => {
    return balances
      .filter(
        balance => balance.status === 'pending' || balance.status === 'approved'
      )
      .reduce((total, balance) => total + balance.total_amount, 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando balances...</Text>
      </View>
    );
  }

  if (error && balances.length === 0) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryAmount}>
            {formatCurrency(calculateTotalEarnings())}
          </Text>
          <Text style={styles.summaryLabel}>Total Cobrado</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryAmount, styles.pendingAmount]}>
            {formatCurrency(calculatePendingAmount())}
          </Text>
          <Text style={styles.summaryLabel}>Pendiente</Text>
        </View>
      </View>

      <FlatList
        data={balances}
        renderItem={renderBalanceItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
    marginBottom: 4,
  },
  pendingAmount: {
    color: Colors.warning,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  periodContainer: {
    flex: 1,
  },
  periodText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  periodDates: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  totalAmountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  positiveAmount: {
    color: Colors.success,
  },
  negativeAmount: {
    color: Colors.error,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: Colors.neutral600,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

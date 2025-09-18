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
import { getBalances } from '../lib/api';

export default function BalancesScreen() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<BalanceFilters>({});

  const loadBalances = useCallback(async () => {
    try {
      setError(null);
      const response = await getBalances(filters);
      
      if (response.error) {
        setError(response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data) {
        setBalances(response.data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBalances();
  }, [loadBalances]);

  const getStatusColor = (status: Balance['status']) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#3b82f6';
      case 'paid':
        return '#10b981';
      case 'disputed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: Balance['status']) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const endMonth = end.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    if (startMonth === endMonth) {
      return startMonth;
    }
    
    return `${start.toLocaleDateString('es-ES', { month: 'short' })} - ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  };

  const renderBalanceItem = ({ item }: { item: Balance }) => (
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
          <Text style={styles.statusText}>
            {getStatusText(item.status)}
          </Text>
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

  const renderEmptyState = () => (
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

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Error al cargar</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadBalances}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  const calculateTotalEarnings = () => {
    return balances
      .filter(balance => balance.status === 'paid')
      .reduce((total, balance) => total + balance.total_amount, 0);
  };

  const calculatePendingAmount = () => {
    return balances
      .filter(balance => balance.status === 'pending' || balance.status === 'approved')
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
        keyExtractor={(item) => item.id}
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
    backgroundColor: '#f8fafc',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  pendingAmount: {
    color: '#f59e0b',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
    color: '#1e293b',
    marginBottom: 4,
  },
  periodDates: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  amountContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  totalAmountLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
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
    color: '#64748b',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  positiveAmount: {
    color: '#10b981',
  },
  negativeAmount: {
    color: '#ef4444',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
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
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
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
    color: '#dc2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

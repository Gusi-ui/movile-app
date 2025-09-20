import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import {
  Assignment,
  AssignmentFilters,
  AssignmentStatus,
} from '../types/database';
import { RootStackParamList } from '../types';
import { getWorkerAssignments } from '../lib/supabase';
import { Database } from '../types/supabase';
import { Colors } from '../constants/colors';

type SupabaseAssignment = Database['public']['Tables']['assignments']['Row'];

// Adaptador para convertir datos de Supabase al formato esperado
const adaptSupabaseAssignment = (
  supabaseAssignment: SupabaseAssignment
): Assignment => {
  // Mapear status de string a AssignmentStatus
  const mapStatus = (status: string): AssignmentStatus => {
    switch (status) {
      case 'pending':
        return 'pending';
      case 'assigned':
        return 'assigned';
      case 'in_progress':
        return 'in_progress';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'pending';
    }
  };

  // Mapear priority de number a string
  const mapPriority = (
    priority: number
  ): 'low' | 'medium' | 'high' | 'urgent' => {
    if (priority <= 1) return 'low';
    if (priority <= 2) return 'medium';
    if (priority <= 3) return 'high';
    return 'urgent';
  };

  return {
    id: supabaseAssignment.id,
    title: supabaseAssignment.assignment_type || 'Sin título',
    description: supabaseAssignment.notes || 'Sin descripción',
    status: mapStatus(supabaseAssignment.status),
    priority: mapPriority(supabaseAssignment.priority),
    worker_id: supabaseAssignment.worker_id,
    assigned_by: supabaseAssignment.user_id,
    address: '', // No disponible en Supabase
    assigned_at: supabaseAssignment.start_date,
    ...(supabaseAssignment.end_date && {
      due_date: supabaseAssignment.end_date,
    }),
    estimated_duration: supabaseAssignment.weekly_hours * 60, // convertir horas a minutos
    created_at: supabaseAssignment.created_at || new Date().toISOString(),
    updated_at: supabaseAssignment.updated_at || new Date().toISOString(),
  };
};

type AssignmentsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Assignments'
>;

export default function AssignmentsScreen(): React.ReactElement {
  const navigation = useNavigation<AssignmentsScreenNavigationProp>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<AssignmentFilters>({});

  const loadAssignments = useCallback(async () => {
    try {
      setError(null);
      const response = await getWorkerAssignments({
        ...(filters.status && { status: filters.status as string[] }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
      });

      if (response.error) {
        setError('Error al cargar asignaciones');
        Alert.alert('Error', 'No se pudieron cargar las asignaciones');
        return;
      }

      const adaptedAssignments = response.data.map(adaptSupabaseAssignment);
      setAssignments(adaptedAssignments);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      Alert.alert('Error', 'No se pudieron cargar las asignaciones');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadAssignments();
  }, [loadAssignments]);

  const handleAssignmentPress = (assignment: Assignment): void => {
    navigation.navigate('AssignmentDetail', { assignmentId: assignment.id });
  };

  const getStatusColor = (status: Assignment['status']): string => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'assigned':
        return '#3b82f6';
      case 'in_progress':
        return '#10b981';
      case 'completed':
        return '#059669';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: Assignment['status']): string => {
    switch (status) {
      case 'pending':
        return 'Programado';
      case 'assigned':
        return 'Asignado';
      case 'in_progress':
        return 'En Servicio';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getServiceIcon = (title: string): string => {
    if (
      title.toLowerCase().includes('cuidado personal') ||
      title.toLowerCase().includes('higiene')
    ) {
      return '🛁';
    } else if (title.toLowerCase().includes('limpieza')) {
      return '🧹';
    } else if (
      title.toLowerCase().includes('acompañamiento') ||
      title.toLowerCase().includes('compañía')
    ) {
      return '👥';
    } else if (
      title.toLowerCase().includes('medicación') ||
      title.toLowerCase().includes('medicina')
    ) {
      return '💊';
    } else if (
      title.toLowerCase().includes('comida') ||
      title.toLowerCase().includes('cocina')
    ) {
      return '🍽️';
    }
    return '🏠';
  };

  const getPriorityColor = (priority: Assignment['priority']): string => {
    switch (priority) {
      case 'urgent':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#65a30d';
      default:
        return '#6b7280';
    }
  };

  const getPriorityText = (priority: Assignment['priority']): string => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Normal';
      case 'low':
        return 'Flexible';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAssignmentItem = ({
    item,
  }: {
    item: Assignment;
  }): React.ReactElement => (
    <TouchableOpacity
      style={styles.assignmentCard}
      onPress={() => handleAssignmentPress(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.serviceIcon}>{getServiceIcon(item.title)}</Text>
          <Text style={styles.assignmentTitle} numberOfLines={2}>
            {item.title}
          </Text>
        </View>
        <View style={styles.priorityBadge}>
          <Text
            style={[
              styles.priorityText,
              { color: getPriorityColor(item.priority) },
            ]}
          >
            {getPriorityText(item.priority)}
          </Text>
        </View>
      </View>

      <Text style={styles.assignmentDescription} numberOfLines={3}>
        {item.description}
      </Text>

      {item.address && (
        <Text style={styles.assignmentAddress} numberOfLines={1}>
          📍 {item.address}
        </Text>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.dateContainer}>
          {item.due_date && (
            <Text style={styles.dueDateText}>
              Vence: {formatDate(item.due_date)}
            </Text>
          )}
          <Text style={styles.assignedDateText}>
            Asignada: {formatDate(item.assigned_at)}
          </Text>
        </View>
      </View>

      {item.estimated_duration && (
        <View style={styles.durationContainer}>
          <Text style={styles.durationText}>
            ⏱️ Duración estimada: {item.estimated_duration} min
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No hay asignaciones</Text>
      <Text style={styles.emptyStateText}>
        No tienes asignaciones en este momento.
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={loadAssignments}>
        <Text style={styles.refreshButtonText}>Actualizar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = (): React.ReactElement => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Error al cargar</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadAssignments}>
        <Text style={styles.retryButtonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando asignaciones...</Text>
      </View>
    );
  }

  if (error && assignments.length === 0) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={assignments}
        renderItem={renderAssignmentItem}
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  assignmentCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  serviceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.backgroundLight,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  assignmentAddress: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statusContainer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: Colors.backgroundCard,
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dueDateText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  assignedDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  durationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  durationText: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: Colors.backgroundCard,
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
    color: Colors.backgroundCard,
    fontSize: 16,
    fontWeight: '600',
  },
});

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
import { Assignment, AssignmentFilters } from '../types/database';
import { RootStackParamList } from '../types';
import { getAssignments } from '../lib/api';

type AssignmentsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Assignments'
>;

export default function AssignmentsScreen() {
  const navigation = useNavigation<AssignmentsScreenNavigationProp>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters] = useState<AssignmentFilters>({});

  const loadAssignments = useCallback(async () => {
    try {
      setError(null);
      const response = await getAssignments(filters);
      
      if (response.error) {
        setError(response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data) {
        setAssignments(response.data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAssignments();
  }, [loadAssignments]);

  const handleAssignmentPress = (assignment: Assignment) => {
    navigation.navigate('AssignmentDetail', { assignmentId: assignment.id });
  };

  const getStatusColor = (status: Assignment['status']) => {
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

  const getStatusText = (status: Assignment['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'assigned':
        return 'Asignada';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: Assignment['priority']) => {
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

  const getPriorityText = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderAssignmentItem = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      style={styles.assignmentCard}
      onPress={() => handleAssignmentPress(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.assignmentTitle} numberOfLines={2}>
          {item.title}
        </Text>
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
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
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

  const renderEmptyState = () => (
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

  const renderError = () => (
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
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
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
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  assignmentAddress: {
    fontSize: 14,
    color: '#475569',
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
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  dateContainer: {
    alignItems: 'flex-end',
  },
  dueDateText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  assignedDateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  durationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  durationText: {
    fontSize: 12,
    color: '#64748b',
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

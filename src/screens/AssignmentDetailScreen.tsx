import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { Assignment } from '../types/database';
import { RootStackParamList } from '../types';
// Reemplazar API mock por Supabase real
import {
  getAssignmentDetail as getAssignmentDetailDb,
  updateAssignmentStatus as updateAssignmentStatusDb,
} from '../lib/supabase';
import { Colors } from '../constants/colors';
import { Database } from '../types/supabase';

type AssignmentDetailRouteProp = RouteProp<
  RootStackParamList,
  'AssignmentDetail'
>;

// Tipo de fila de Supabase y adaptador al tipo de la app
type SupabaseAssignment = Database['public']['Tables']['assignments']['Row'];

const adaptSupabaseAssignment = (
  supabaseAssignment: SupabaseAssignment
): Assignment => {
  const mapStatus = (status: string): Assignment['status'] => {
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

  const mapPriority = (priority: number): Assignment['priority'] => {
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
    address: '',
    assigned_at: supabaseAssignment.start_date,
    ...(supabaseAssignment.end_date && {
      due_date: supabaseAssignment.end_date,
    }),
    estimated_duration: supabaseAssignment.weekly_hours * 60,
    created_at: supabaseAssignment.created_at || new Date().toISOString(),
    updated_at: supabaseAssignment.updated_at || new Date().toISOString(),
  };
};

export default function AssignmentDetailScreen(): React.ReactElement {
  const route = useRoute<AssignmentDetailRouteProp>();
  const { assignmentId } = route.params;

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignmentDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const raw = await getAssignmentDetailDb(assignmentId);
      const adapted = adaptSupabaseAssignment(raw);
      setAssignment(adapted);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      Alert.alert('Error', 'No se pudo cargar el detalle de la asignación');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadAssignmentDetail();
  }, [loadAssignmentDetail]);

  const handleStatusUpdate = async (
    newStatus: Assignment['status']
  ): Promise<void> => {
    if (!assignment) return;

    Alert.alert(
      'Confirmar cambio',
      `¿Estás seguro de que quieres cambiar el estado a "${getStatusText(newStatus)}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async (): Promise<void> => {
            try {
              setUpdating(true);

              const updatedRow = await updateAssignmentStatusDb(
                assignment.id,
                newStatus
              );

              if (updatedRow) {
                const adapted = adaptSupabaseAssignment(
                  updatedRow as SupabaseAssignment
                );
                setAssignment(adapted);
                Alert.alert('Éxito', 'Estado actualizado correctamente');
              } else {
                Alert.alert('Error', 'No se pudo actualizar el estado');
              }
            } catch {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenLocation = (): void => {
    if (!assignment?.latitude || !assignment?.longitude) {
      Alert.alert(
        'Error',
        'No hay coordenadas disponibles para esta asignación'
      );
      return;
    }

    const url = `https://maps.google.com/?q=${assignment.latitude},${assignment.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el mapa');
    });
  };

  const getStatusColor = (status: Assignment['status']): string => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'in_progress':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: Assignment['status']): string => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconocido';
    }
  };

  const getPriorityColor = (priority: Assignment['priority']): string => {
    switch (priority) {
      case 'low':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      case 'urgent':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getPriorityText = (priority: Assignment['priority']): string => {
    switch (priority) {
      case 'low':
        return 'Baja';
      case 'medium':
        return 'Media';
      case 'high':
        return 'Alta';
      case 'urgent':
        return 'Urgente';
      default:
        return 'Normal';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableActions = (): {
    status: Assignment['status'];
    label: string;
    color: string;
  }[] => {
    if (!assignment) return [];

    const actions = [];

    switch (assignment.status) {
      case 'assigned':
        actions.push({
          label: 'Iniciar Trabajo',
          status: 'in_progress' as const,
          color: '#10b981',
        });
        break;
      case 'in_progress':
        actions.push({
          label: 'Marcar como Completada',
          status: 'completed' as const,
          color: '#059669',
        });
        break;
    }

    if (
      assignment.status !== 'cancelled' &&
      assignment.status !== 'completed'
    ) {
      actions.push({
        label: 'Cancelar',
        status: 'cancelled' as const,
        color: '#ef4444',
      });
    }

    return actions;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (error || !assignment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>
          {error || 'No se pudo cargar la asignación'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadAssignmentDetail}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const availableActions = getAvailableActions();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{assignment.title}</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(assignment.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(assignment.status)}
            </Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(assignment.priority) },
              ]}
            >
              {getPriorityText(assignment.priority)}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descripción</Text>
        <Text style={styles.description}>{assignment.description}</Text>
      </View>

      {/* Location */}
      {assignment.address && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <TouchableOpacity
            style={styles.locationContainer}
            onPress={handleOpenLocation}
          >
            <Text style={styles.locationText}>📍 {assignment.address}</Text>
            {assignment.latitude && assignment.longitude && (
              <Text style={styles.locationAction}>Abrir en Mapas</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Dates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fechas</Text>
        <View style={styles.dateItem}>
          <Text style={styles.dateLabel}>Asignada:</Text>
          <Text style={styles.dateValue}>
            {formatDate(assignment.assigned_at)}
          </Text>
        </View>
        {assignment.due_date && (
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Fecha límite:</Text>
            <Text style={[styles.dateValue, styles.dueDateValue]}>
              {formatDate(assignment.due_date)}
            </Text>
          </View>
        )}
        {assignment.started_at && (
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Iniciada:</Text>
            <Text style={styles.dateValue}>
              {formatDate(assignment.started_at)}
            </Text>
          </View>
        )}
        {assignment.completed_at && (
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Completada:</Text>
            <Text style={styles.dateValue}>
              {formatDate(assignment.completed_at)}
            </Text>
          </View>
        )}
      </View>

      {/* Duration */}
      {(assignment.estimated_duration || assignment.actual_duration) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duración</Text>
          {assignment.estimated_duration && (
            <View style={styles.durationItem}>
              <Text style={styles.durationLabel}>Estimada:</Text>
              <Text style={styles.durationValue}>
                {assignment.estimated_duration} minutos
              </Text>
            </View>
          )}
          {assignment.actual_duration && (
            <View style={styles.durationItem}>
              <Text style={styles.durationLabel}>Real:</Text>
              <Text style={styles.durationValue}>
                {assignment.actual_duration} minutos
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {assignment.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas</Text>
          <Text style={styles.notes}>{assignment.notes}</Text>
        </View>
      )}

      {/* Actions */}
      {availableActions.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          {availableActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => handleStatusUpdate(action.status)}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>{action.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: Colors.background,
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
  header: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: Colors.textGray,
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: Colors.textGray,
    flex: 1,
  },
  locationAction: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dueDateValue: {
    color: Colors.error,
    fontWeight: '600',
  },
  durationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  notes: {
    fontSize: 16,
    color: Colors.textGray,
    lineHeight: 24,
  },
  actionsSection: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

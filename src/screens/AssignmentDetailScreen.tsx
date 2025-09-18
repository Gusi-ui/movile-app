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
import { getAssignmentDetail, updateAssignmentStatus } from '../lib/api';

type AssignmentDetailRouteProp = RouteProp<RootStackParamList, 'AssignmentDetail'>;

export default function AssignmentDetailScreen() {
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
      
      const response = await getAssignmentDetail(assignmentId);
      
      if (response.error) {
        setError(response.error);
        Alert.alert('Error', response.error);
        return;
      }

      if (response.data) {
        setAssignment(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      Alert.alert('Error', 'No se pudo cargar el detalle de la asignación');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadAssignmentDetail();
  }, [loadAssignmentDetail]);

  const handleStatusUpdate = async (newStatus: Assignment['status']) => {
    if (!assignment) return;

    Alert.alert(
      'Confirmar cambio',
      `¿Estás seguro de que quieres cambiar el estado a "${getStatusText(newStatus)}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setUpdating(true);
              
              const response = await updateAssignmentStatus(assignment.id, newStatus);
              
              if (response.error) {
                Alert.alert('Error', response.error);
                return;
              }

              if (response.data) {
                setAssignment(response.data);
                Alert.alert('Éxito', 'Estado actualizado correctamente');
              }
            } catch (err) {
              Alert.alert('Error', 'No se pudo actualizar el estado');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenLocation = () => {
    if (!assignment?.latitude || !assignment?.longitude) {
      Alert.alert('Error', 'No hay coordenadas disponibles para esta asignación');
      return;
    }

    const url = `https://maps.google.com/?q=${assignment.latitude},${assignment.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el mapa');
    });
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
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableActions = () => {
    if (!assignment) return [];

    const actions = [];

    switch (assignment.status) {
      case 'assigned':
        actions.push({
          title: 'Iniciar Trabajo',
          status: 'in_progress' as const,
          color: '#10b981',
        });
        break;
      case 'in_progress':
        actions.push({
          title: 'Marcar como Completada',
          status: 'completed' as const,
          color: '#059669',
        });
        break;
    }

    if (assignment.status !== 'cancelled' && assignment.status !== 'completed') {
      actions.push({
        title: 'Cancelar',
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
        <TouchableOpacity style={styles.retryButton} onPress={loadAssignmentDetail}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const availableActions = getAvailableActions();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
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
          <Text style={styles.dateValue}>{formatDate(assignment.assigned_at)}</Text>
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
            <Text style={styles.dateValue}>{formatDate(assignment.started_at)}</Text>
          </View>
        )}
        {assignment.completed_at && (
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Completada:</Text>
            <Text style={styles.dateValue}>{formatDate(assignment.completed_at)}</Text>
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
                <Text style={styles.actionButtonText}>{action.title}</Text>
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
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f8fafc',
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
  header: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
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
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#475569',
    flex: 1,
  },
  locationAction: {
    fontSize: 14,
    color: '#3b82f6',
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
    color: '#64748b',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: '#1e293b',
  },
  dueDateValue: {
    color: '#dc2626',
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
    color: '#64748b',
    fontWeight: '500',
  },
  durationValue: {
    fontSize: 16,
    color: '#1e293b',
  },
  notes: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
  },
  actionsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

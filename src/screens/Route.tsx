import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getRoutes } from '../lib/api';
import { Route } from '../types/database';

interface RouteStop {
  id: string;
  userName: string;
  address: string;
  timeSlot: string;
  status: 'pending' | 'inprogress' | 'completed';
  order: number;
}

export default function RouteScreen(): React.JSX.Element {
  const { state } = useAuth();
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalDistance, setTotalDistance] = useState<string>('0 km');
  const [estimatedTime, setEstimatedTime] = useState<string>('0 min');

  useEffect(() => {
    loadTodayRoute();
  }, [state.isAuthenticated]);

  const loadTodayRoute = async (): Promise<void> => {
    if (!state.isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Usar la API mock para obtener rutas
      const response = await getRoutes({
        status: ['active']
      });

      if (response.data && response.data.data && response.data.data.length > 0) {
        // Convertir rutas a paradas de ruta
        const stops: RouteStop[] = response.data.data.map((route: Route, index: number) => ({
          id: route.id,
          userName: `Usuario ${index + 1}`,
          address: route.description || 'Dirección no disponible',
          timeSlot: `${8 + index}:00 - ${9 + index}:00`,
          status: 'pending' as const,
          order: index + 1,
        }));

        setRouteStops(stops);

        // Simular cálculo de distancia y tiempo
        setTotalDistance(`${(stops.length * 2.5).toFixed(1)} km`);
        setEstimatedTime(`${stops.length * 15} min`);
      }
    } catch (error) {
      console.error('Error loading route:', error);
      Alert.alert('Error', 'No se pudo cargar la ruta del día');
    } finally {
      setLoading(false);
    }
  };

  const updateStopStatus = (
    stopId: string,
    newStatus: RouteStop['status']
  ): void => {
    setRouteStops((prev) =>
      prev.map((stop) =>
        stop.id === stopId ? { ...stop, status: newStatus } : stop
      )
    );
  };

  const handleStartService = (stopId: string): void => {
    updateStopStatus(stopId, 'inprogress');
    Alert.alert('Servicio iniciado', 'Se ha marcado el inicio del servicio');
  };

  const handleCompleteService = (stopId: string): void => {
    updateStopStatus(stopId, 'completed');
    Alert.alert(
      'Servicio completado',
      'Se ha marcado la finalización del servicio'
    );
  };

  const openMaps = (address: string): void => {
    // En una implementación real, esto abriría Google Maps o Apple Maps
    Alert.alert('Navegación', `Abriendo ruta a: ${address}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando ruta del día...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Ruta de Hoy</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Resumen de ruta */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Paradas</Text>
            <Text style={styles.summaryValue}>{routeStops.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distancia</Text>
            <Text style={styles.summaryValue}>{totalDistance}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tiempo Est.</Text>
            <Text style={styles.summaryValue}>{estimatedTime}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.optimizeButton}
          onPress={() => Alert.alert('Próximamente', 'Optimización de ruta')}
        >
          <Text style={styles.optimizeButtonText}>🔄 Optimizar Ruta</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de paradas */}
      {routeStops.length === 0 ? (
        <View style={styles.noRoutesCard}>
          <Text style={styles.noRoutesText}>
            No hay servicios programados para hoy
          </Text>
        </View>
      ) : (
        <View style={styles.stopsContainer}>
          {routeStops.map((stop, index) => (
            <View key={stop.id} style={styles.stopCard}>
              {/* Línea conectora */}
              {index < routeStops.length - 1 && (
                <View style={styles.connectorLine} />
              )}

              {/* Número de parada */}
              <View
                style={[
                  styles.stopNumber,
                  stop.status === 'completed' && styles.completedNumber,
                  stop.status === 'inprogress' && styles.inProgressNumber,
                ]}
              >
                <Text style={styles.stopNumberText}>{index + 1}</Text>
              </View>

              {/* Información de la parada */}
              <View style={styles.stopInfo}>
                <Text style={styles.stopUserName}>{stop.userName}</Text>
                <Text style={styles.stopTime}>{stop.timeSlot}</Text>
                <TouchableOpacity
                  style={styles.addressContainer}
                  onPress={() => openMaps(stop.address)}
                >
                  <Text style={styles.stopAddress}>{stop.address}</Text>
                  <Text style={styles.navigateText}>📍 Navegar</Text>
                </TouchableOpacity>

                {/* Estado del servicio */}
                <View
                  style={[
                    styles.statusBadge,
                    stop.status === 'pending' && styles.pendingBadge,
                    stop.status === 'inprogress' && styles.inProgressBadge,
                    stop.status === 'completed' && styles.completedBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {stop.status === 'pending' && '⏳ Pendiente'}
                    {stop.status === 'inprogress' && '🟢 En curso'}
                    {stop.status === 'completed' && '✅ Completado'}
                  </Text>
                </View>

                {/* Botones de acción */}
                <View style={styles.actionButtons}>
                  {stop.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.startButton}
                      onPress={() => handleStartService(stop.id)}
                    >
                      <Text style={styles.startButtonText}>
                        Iniciar Servicio
                      </Text>
                    </TouchableOpacity>
                  )}

                  {stop.status === 'inprogress' && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => handleCompleteService(stop.id)}
                    >
                      <Text style={styles.completeButtonText}>Completar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  optimizeButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  optimizeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  noRoutesCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  noRoutesText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  stopsContainer: {
    paddingHorizontal: 16,
  },
  stopCard: {
    backgroundColor: 'white',
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  connectorLine: {
    position: 'absolute',
    left: 31,
    top: 56,
    width: 2,
    height: 40,
    backgroundColor: '#d1d5db',
    zIndex: 1,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    zIndex: 2,
  },
  completedNumber: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  inProgressNumber: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  stopNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  stopInfo: {
    flex: 1,
  },
  stopUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stopTime: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 8,
  },
  addressContainer: {
    marginBottom: 12,
  },
  stopAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  navigateText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  inProgressBadge: {
    backgroundColor: '#dbeafe',
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  startButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomSpacing: {
    height: 100,
  },
});

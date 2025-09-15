import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { supabase } from '../lib/supabase';

interface WorkerInfo {
  id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  dni: string;
  worker_type: string;
  is_active: boolean;
  created_at: string;
}

interface UserSettings {
  notifications_enabled: boolean;
  location_tracking: boolean;
  auto_checkin: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: 'es' | 'ca' | 'en';
}

export default function ProfileScreen(): React.JSX.Element {
  const { user, signOut } = useAuth();
  const {
    permissionStatus,
    requestPermissions,
    openSettings,
    showNotification,
  } = useNotifications();
  const { isOnline, pendingActionsCount, syncInProgress, syncNow } =
    useOfflineSync();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    notifications_enabled: true,
    location_tracking: false,
    auto_checkin: false,
    theme: 'light',
    language: 'es',
  });
  const [loading, setLoading] = useState<boolean>(false);

  const loadWorkerInfo = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const email = user?.email ?? '';
      if (email.trim() === '') {
        setWorkerInfo(null);
        return;
      }

      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('email', email)
        .single();

      if (error === null && data !== null) {
        setWorkerInfo(data);
      }
    } catch (error) {
      console.error('Error loading worker info:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadWorkerInfo().catch(() => setLoading(false));
  }, [loadWorkerInfo]);

  const handleSignOut = async (): Promise<void> => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás segura de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          },
        },
      ]
    );
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    // Aquí se podría guardar en AsyncStorage o en Supabase

    // Si se activan las notificaciones, solicitar permisos
    if (key === 'notifications_enabled' && value === true) {
      handleNotificationPermission().catch(() => {
        // Error manejado en la función
      });
    }
  };

  const handleNotificationPermission = async (): Promise<void> => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permisos de Notificaciones',
          'Para recibir recordatorios de servicios, necesitas activar las notificaciones en configuración.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Abrir Configuración', onPress: openSettings },
          ]
        );
        // Revertir el setting si no se concedió el permiso
        setSettings((prev) => ({ ...prev, notifications_enabled: false }));
      } else {
        // Mostrar notificación de prueba
        await showNotification({
          title: '✅ Notificaciones Activadas',
          body: 'Recibirás recordatorios de tus servicios programados',
        });
      }
    }
  };

  const getWorkerTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      cuidadora: 'Cuidadora',
      auxiliar: 'Auxiliar de Hogar',
      enfermera: 'Enfermera',
    };
    return types[type] || type;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {workerInfo ? `${workerInfo.name[0]}${workerInfo.surname[0]}` : 'U'}
          </Text>
        </View>
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>
          {workerInfo ? `${workerInfo.name} ${workerInfo.surname}` : 'Usuario'}
        </Text>
        <Text style={styles.profileEmail}>
          {workerInfo?.email || user?.email || ''}
        </Text>
        <Text style={styles.profileType}>
          {workerInfo ? getWorkerTypeLabel(workerInfo.worker_type) : ''}
        </Text>
        {workerInfo && (
          <Text style={styles.profileSince}>
            Desde {formatDate(workerInfo.created_at)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>👤 Información Personal</Text>

      {workerInfo && (
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{workerInfo.phone}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>DNI</Text>
            <Text style={styles.infoValue}>{workerInfo.dni}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Estado</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: workerInfo.is_active ? '#dcfce7' : '#fecaca',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: workerInfo.is_active ? '#22c55e' : '#ef4444' },
                ]}
              >
                {workerInfo.is_active ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>⚙️ Configuración</Text>

      <View style={styles.settingsList}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Notificaciones</Text>
            <Text style={styles.settingDescription}>
              Recibir notificaciones de servicios y cambios
              {permissionStatus === 'denied' && ' (Permiso denegado)'}
              {permissionStatus === 'loading' && ' (Verificando...)'}
            </Text>
          </View>
          <Switch
            value={
              settings.notifications_enabled && permissionStatus === 'granted'
            }
            onValueChange={(value) =>
              updateSetting('notifications_enabled', value)
            }
            trackColor={{ false: '#f1f5f9', true: '#3b82f6' }}
            thumbColor={settings.notifications_enabled ? '#ffffff' : '#f4f4f5'}
            disabled={permissionStatus === 'loading'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Seguimiento de Ubicación</Text>
            <Text style={styles.settingDescription}>
              Compartir ubicación durante los servicios
            </Text>
          </View>
          <Switch
            value={settings.location_tracking}
            onValueChange={(value) => updateSetting('location_tracking', value)}
            trackColor={{ false: '#f1f5f9', true: '#3b82f6' }}
            thumbColor={settings.location_tracking ? '#ffffff' : '#f4f4f5'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Check-in Automático</Text>
            <Text style={styles.settingDescription}>
              Marcar inicio automáticamente al llegar
            </Text>
          </View>
          <Switch
            value={settings.auto_checkin}
            onValueChange={(value) => updateSetting('auto_checkin', value)}
            trackColor={{ false: '#f1f5f9', true: '#3b82f6' }}
            thumbColor={settings.auto_checkin ? '#ffffff' : '#f4f4f5'}
          />
        </View>
      </View>
    </View>
  );

  const renderAppSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📱 Configuración de la App</Text>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>🌓 Tema</Text>
        <View style={styles.menuItemRight}>
          <Text style={styles.menuItemValue}>
            {settings.theme === 'light'
              ? 'Claro'
              : settings.theme === 'dark'
                ? 'Oscuro'
                : 'Automático'}
          </Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>🌍 Idioma</Text>
        <View style={styles.menuItemRight}>
          <Text style={styles.menuItemValue}>
            {settings.language === 'es'
              ? 'Español'
              : settings.language === 'ca'
                ? 'Català'
                : 'English'}
          </Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderHelpAndSupport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📞 Ayuda y Soporte</Text>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>❓ Preguntas Frecuentes</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>📧 Contactar Soporte</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>📄 Términos y Condiciones</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <Text style={styles.menuItemLabel}>🔒 Política de Privacidad</Text>
        <Text style={styles.menuItemArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSync = async (): Promise<void> => {
    try {
      if (!isOnline) {
        Alert.alert(
          'Sin Conexión',
          'No hay conexión a internet para sincronizar'
        );
        return;
      }

      if (pendingActionsCount === 0) {
        Alert.alert('Información', 'No hay datos pendientes para sincronizar');
        return;
      }

      const success = await syncNow();
      if (success) {
        Alert.alert('Éxito', 'Datos sincronizados correctamente');
        await showNotification({
          title: '✅ Sincronización Completa',
          body: 'Todos los datos han sido sincronizados',
        });
      } else {
        Alert.alert('Advertencia', 'Algunos datos no pudieron sincronizarse');
      }
    } catch (error) {
      Alert.alert('Error', 'Error durante la sincronización');
    }
  };

  const renderActions = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          (!isOnline || syncInProgress) && styles.disabledButton,
        ]}
        onPress={handleSync}
        disabled={!isOnline || syncInProgress}
      >
        <Text
          style={[
            styles.actionButtonText,
            (!isOnline || syncInProgress) && styles.disabledButtonText,
          ]}
        >
          {syncInProgress ? '⏳ Sincronizando...' : '🔄 Sincronizar Datos'}
          {pendingActionsCount > 0 && ` (${pendingActionsCount})`}
        </Text>
      </TouchableOpacity>

      <View style={styles.syncStatus}>
        <Text style={styles.syncStatusText}>
          Estado: {isOnline ? '🟢 Conectado' : '🔴 Sin conexión'}
        </Text>
        {pendingActionsCount > 0 && (
          <Text style={styles.pendingText}>
            {pendingActionsCount} acciones pendientes de sincronizar
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.actionButton, styles.dangerButton]}
        onPress={handleSignOut}
      >
        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
          🚪 Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderAppInfo = () => (
    <View style={styles.appInfo}>
      <Text style={styles.appInfoText}>SAD LAS Worker App</Text>
      <Text style={styles.appInfoText}>Versión 1.0.0</Text>
      <Text style={styles.appInfoText}>© 2024 SAD LAS</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderProfileHeader()}
      {renderPersonalInfo()}
      {renderSettings()}
      {renderAppSettings()}
      {renderHelpAndSupport()}
      {renderActions()}
      {renderAppInfo()}
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
  profileHeader: {
    backgroundColor: 'white',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  profileType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  profileSince: {
    fontSize: 12,
    color: '#94a3b8',
  },
  section: {
    marginTop: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoList: {
    paddingVertical: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsList: {
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  menuItemArrow: {
    fontSize: 16,
    color: '#94a3b8',
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    marginVertical: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
  },
  dangerButtonText: {
    color: '#dc2626',
  },
  disabledButton: {
    backgroundColor: '#e2e8f0',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#94a3b8',
  },
  syncStatus: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  appInfo: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
});

import { useCallback, useEffect, useState } from 'react';

import NotificationService, {
  NotificationData,
  ScheduledNotificationData,
} from '../services/NotificationService';

interface UseNotificationsReturn {
  isInitialized: boolean;
  permissionStatus: 'granted' | 'denied' | 'undetermined' | 'loading';
  expoPushToken: string | null;
  showNotification: (data: NotificationData) => Promise<void>;
  scheduleNotification: (
    data: ScheduledNotificationData
  ) => Promise<string | null>;
  cancelNotification: (identifier: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  openSettings: () => Promise<void>;
  scheduleServiceReminders: (
    services: Array<{
      id: string;
      title: string;
      startTime: Date;
      userAddress?: string;
    }>
  ) => Promise<void>;
  notifyAssignmentUpdate: (title: string, description: string) => Promise<void>;
  notifyNewMessage: (from: string, message: string) => Promise<void>;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'granted' | 'denied' | 'undetermined' | 'loading'
  >('loading');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // Inicializar el servicio de notificaciones al montar el hook
  useEffect(() => {
    const initializeNotifications = async (): Promise<void> => {
      try {
        const initialized = await NotificationService.initialize();
        setIsInitialized(initialized);

        const status = await NotificationService.checkPermissionStatus();
        setPermissionStatus(status);

        if (initialized) {
          const token = NotificationService.getExpoPushTokenValue();
          setExpoPushToken(token);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setPermissionStatus('denied');
      }
    };

    initializeNotifications().catch((error) => {
      console.error('Failed to initialize notifications:', error);
      setPermissionStatus('denied');
    });
  }, []);

  // Función para mostrar notificación inmediata
  const showNotification = useCallback(
    async (data: NotificationData): Promise<void> => {
      await NotificationService.showLocalNotification(data);
    },
    []
  );

  // Función para programar notificación
  const scheduleNotification = useCallback(
    async (data: ScheduledNotificationData): Promise<string | null> => {
      return await NotificationService.scheduleNotification(data);
    },
    []
  );

  // Función para cancelar notificación específica
  const cancelNotification = useCallback(
    async (identifier: string): Promise<void> => {
      await NotificationService.cancelScheduledNotification(identifier);
    },
    []
  );

  // Función para cancelar todas las notificaciones
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await NotificationService.cancelAllScheduledNotifications();
  }, []);

  // Función para solicitar permisos manualmente
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const initialized = await NotificationService.initialize();
      setIsInitialized(initialized);

      const status = await NotificationService.checkPermissionStatus();
      setPermissionStatus(status);

      if (initialized) {
        const token = NotificationService.getExpoPushTokenValue();
        setExpoPushToken(token);
      }

      return initialized && status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, []);

  // Función para abrir configuración del sistema
  const openSettings = useCallback(async (): Promise<void> => {
    await NotificationService.openNotificationSettings();
  }, []);

  // Función para programar recordatorios de servicios
  const scheduleServiceReminders = useCallback(
    async (
      services: Array<{
        id: string;
        title: string;
        startTime: Date;
        userAddress?: string;
      }>
    ): Promise<void> => {
      await NotificationService.scheduleServiceReminders(services);
    },
    []
  );

  // Función para notificar cambios en asignaciones
  const notifyAssignmentUpdate = useCallback(
    async (title: string, description: string): Promise<void> => {
      await NotificationService.notifyAssignmentUpdate(title, description);
    },
    []
  );

  // Función para notificar nuevos mensajes
  const notifyNewMessage = useCallback(
    async (from: string, message: string): Promise<void> => {
      await NotificationService.notifyNewMessage(from, message);
    },
    []
  );

  return {
    isInitialized,
    permissionStatus,
    expoPushToken,
    showNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    requestPermissions,
    openSettings,
    scheduleServiceReminders,
    notifyAssignmentUpdate,
    notifyNewMessage,
  };
};

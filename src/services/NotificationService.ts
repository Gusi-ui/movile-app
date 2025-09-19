import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar el comportamiento de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface ScheduledNotificationData extends NotificationData {
  trigger: Date | number; // Date for specific time, number for seconds from now
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Inicializar el servicio de notificaciones
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Verificar si el dispositivo soporta notificaciones
      if (!Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return false;
      }

      // Solicitar permisos
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions denied');
        return false;
      }

      // Obtener token de Expo Push
      this.expoPushToken = await this.getExpoPushToken();

      // Configurar listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  /**
   * Solicitar permisos de notificación
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // Para Android, configurar canal de notificación
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });

        // Canal para notificaciones de servicios
        await Notifications.setNotificationChannelAsync('services', {
          name: 'Servicios',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
          sound: 'default',
        });

        // Canal para notificaciones urgentes
        await Notifications.setNotificationChannelAsync('urgent', {
          name: 'Urgente',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 100, 100, 100, 100, 100],
          lightColor: '#ef4444',
          sound: 'default',
        });
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Obtener token de Expo Push
   */
  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId =
        Constants.expoConfig?.extra?.['eas']?.projectId ??
        Constants.easConfig?.projectId;

      if (!projectId) {
        console.warn('No project ID found for push notifications');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return token.data;
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }

  /**
   * Configurar listeners de notificaciones
   */
  private setupNotificationListeners(): void {
    // Listener para notificaciones recibidas cuando la app está en primer plano
    Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
    });

    // Listener para respuestas a notificaciones (tap, acción)
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  /**
   * Manejar respuesta a notificación
   */
  private handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): void {
    const { notification } = response;
    const { data } = notification.request.content;

    // Aquí se puede implementar navegación basada en el tipo de notificación
    if (data?.['type'] === 'service_reminder') {
      // Navegar a la pantalla de servicios
      console.log('Navigate to services screen');
    } else if (data?.['type'] === 'assignment_update') {
      // Navegar a la pantalla de asignaciones
      console.log('Navigate to assignments screen');
    }
  }

  /**
   * Mostrar notificación local inmediata
   */
  public async showLocalNotification(
    notificationData: NotificationData
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        console.warn('Notification service not initialized');
        return;
      }

      await Notifications.presentNotificationAsync({
        title: notificationData.title,
        body: notificationData.body,
        data: notificationData.data || {},
        sound: notificationData.sound !== false,
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  /**
   * Programar notificación para más tarde
   */
  public async scheduleNotification(
    notificationData: ScheduledNotificationData
  ): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        console.warn('Notification service not initialized');
        return null;
      }

      // Simplificar para evitar errores de tipos - solo usar segundos
      let seconds: number;

      if (notificationData.trigger instanceof Date) {
        const now = new Date();
        const diffMs = notificationData.trigger.getTime() - now.getTime();
        seconds = Math.max(1, Math.floor(diffMs / 1000));
      } else {
        seconds = notificationData.trigger;
      }

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.sound !== false,
        },
        trigger: { seconds } as any,
      });

      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Cancelar notificación programada
   */
  public async cancelScheduledNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling scheduled notification:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  public async cancelAllScheduledNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all scheduled notifications:', error);
    }
  }

  /**
   * Obtener todas las notificaciones programadas
   */
  public async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Obtener token de push (para envío desde servidor)
   */
  public getExpoPushTokenValue(): string | null {
    return this.expoPushToken;
  }

  /**
   * Programar recordatorios de servicios
   */
  public async scheduleServiceReminders(
    services: Array<{
      id: string;
      title: string;
      startTime: Date;
      userAddress?: string;
    }>
  ): Promise<void> {
    try {
      // Cancelar recordatorios existentes
      await this.cancelAllScheduledNotifications();

      for (const service of services) {
        // Recordatorio 30 minutos antes
        const reminderTime = new Date(
          service.startTime.getTime() - 30 * 60 * 1000
        );

        if (reminderTime > new Date()) {
          await this.scheduleNotification({
            title: '🕐 Recordatorio de Servicio',
            body: `${service.title} en 30 minutos${service.userAddress ? ` - ${service.userAddress}` : ''}`,
            data: {
              type: 'service_reminder',
              serviceId: service.id,
              reminderType: '30_minutes',
            },
            trigger: reminderTime,
            priority: 'high',
          });
        }

        // Recordatorio 5 minutos antes
        const urgentReminderTime = new Date(
          service.startTime.getTime() - 5 * 60 * 1000
        );

        if (urgentReminderTime > new Date()) {
          await this.scheduleNotification({
            title: '🚨 ¡Servicio Próximo!',
            body: `${service.title} en 5 minutos${service.userAddress ? ` - ${service.userAddress}` : ''}`,
            data: {
              type: 'service_reminder',
              serviceId: service.id,
              reminderType: '5_minutes',
            },
            trigger: urgentReminderTime,
            priority: 'high',
          });
        }
      }
    } catch (error) {
      console.error('Error scheduling service reminders:', error);
    }
  }

  /**
   * Notificar cambio en asignación
   */
  public async notifyAssignmentUpdate(
    assignmentTitle: string,
    changeDescription: string
  ): Promise<void> {
    await this.showLocalNotification({
      title: '📋 Cambio en Asignación',
      body: `${assignmentTitle}: ${changeDescription}`,
      data: {
        type: 'assignment_update',
      },
      priority: 'normal',
    });
  }

  /**
   * Notificar nuevo mensaje o comunicación
   */
  public async notifyNewMessage(from: string, message: string): Promise<void> {
    await this.showLocalNotification({
      title: `💬 Mensaje de ${from}`,
      body: message,
      data: {
        type: 'new_message',
        from,
      },
      priority: 'high',
    });
  }

  /**
   * Verificar estado de permisos
   */
  public async checkPermissionStatus(): Promise<
    'granted' | 'denied' | 'undetermined'
  > {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Error checking permission status:', error);
      return 'denied';
    }
  }

  /**
   * Abrir configuración de notificaciones del sistema
   */
  public async openNotificationSettings(): Promise<void> {
    try {
      // Esta función podría no estar disponible en todas las versiones
      console.log('Opening notification settings...');
      // await Notifications.openNotificationSettingsAsync();
    } catch (error) {
      console.error('Error opening notification settings:', error);
    }
  }
}

export default NotificationService.getInstance();

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineData {
  assignments: any[];
  balances: any[];
  workerInfo: any;
  lastSync: string;
}

export interface PendingAction {
  id: string;
  type: 'service_completed' | 'note_added' | 'check_in' | 'check_out';
  data: any;
  timestamp: string;
}

class OfflineService {
  private static instance: OfflineService;
  private isOnline: boolean = true;
  private pendingActions: PendingAction[] = [];
  private syncInProgress: boolean = false;

  private constructor() {
    this.initializeNetworkListener();
    this.loadPendingActions();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Inicializar listener de conectividad
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state: any) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // Si acabamos de conectarnos, sincronizar
      if (wasOffline && this.isOnline) {
        this.syncPendingActions();
      }
    });
  }

  /**
   * Cargar acciones pendientes del almacenamiento local
   */
  private async loadPendingActions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('pending_actions');
      if (stored) {
        this.pendingActions = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  }

  /**
   * Guardar acciones pendientes en almacenamiento local
   */
  private async savePendingActions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'pending_actions',
        JSON.stringify(this.pendingActions)
      );
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  }

  /**
   * Obtener estado de conectividad
   */
  public isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Obtener número de acciones pendientes
   */
  public getPendingActionsCount(): number {
    return this.pendingActions.length;
  }

  /**
   * Guardar datos para uso offline
   */
  public async saveOfflineData(data: Partial<OfflineData>): Promise<void> {
    try {
      const currentData = await this.getOfflineData();
      const updatedData = {
        ...currentData,
        ...data,
        lastSync: new Date().toISOString(),
      };

      await AsyncStorage.setItem('offline_data', JSON.stringify(updatedData));
    } catch (error) {
      console.error('Error saving offline data:', error);
    }
  }

  /**
   * Obtener datos guardados para offline
   */
  public async getOfflineData(): Promise<OfflineData> {
    try {
      const stored = await AsyncStorage.getItem('offline_data');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error getting offline data:', error);
    }

    return {
      assignments: [],
      balances: [],
      workerInfo: null,
      lastSync: '',
    };
  }

  /**
   * Agregar acción pendiente para sincronizar más tarde
   */
  public async addPendingAction(
    action: Omit<PendingAction, 'id' | 'timestamp'>
  ): Promise<void> {
    const pendingAction: PendingAction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...action,
    };

    this.pendingActions.push(pendingAction);
    await this.savePendingActions();

    // Si estamos online, intentar sincronizar inmediatamente
    if (this.isOnline) {
      this.syncPendingActions();
    }
  }

  /**
   * Sincronizar acciones pendientes con el servidor
   */
  public async syncPendingActions(): Promise<void> {
    if (
      this.syncInProgress ||
      !this.isOnline ||
      this.pendingActions.length === 0
    ) {
      return;
    }

    this.syncInProgress = true;

    try {
      const actionsToSync = [...this.pendingActions];
      const syncedActions: string[] = [];

      for (const action of actionsToSync) {
        try {
          const success = await this.syncSingleAction(action);
          if (success) {
            syncedActions.push(action.id);
          }
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error);
        }
      }

      // Remover acciones sincronizadas exitosamente
      this.pendingActions = this.pendingActions.filter(
        (action) => !syncedActions.includes(action.id)
      );

      await this.savePendingActions();

      console.log(
        `Synced ${syncedActions.length} of ${actionsToSync.length} pending actions`
      );
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincronizar una acción individual
   */
  private async syncSingleAction(action: PendingAction): Promise<boolean> {
    try {
      // Aquí implementarías la lógica específica para cada tipo de acción
      switch (action.type) {
        case 'service_completed':
          return await this.syncServiceCompleted(action.data);
        case 'note_added':
          return await this.syncNoteAdded(action.data);
        case 'check_in':
          return await this.syncCheckIn(action.data);
        case 'check_out':
          return await this.syncCheckOut(action.data);
        default:
          console.warn(`Unknown action type: ${action.type}`);
          return true; // Marcar como sincronizado para removerlo
      }
    } catch (error) {
      console.error(`Error syncing action ${action.type}:`, error);
      return false;
    }
  }

  /**
   * Sincronizar servicio completado
   */
  private async syncServiceCompleted(data: any): Promise<boolean> {
    try {
      // Implementar llamada a la API/Supabase para marcar servicio como completado
      console.log('Syncing service completed:', data);
      // Aquí iría la lógica real de sincronización
      return true;
    } catch (error) {
      console.error('Error syncing service completed:', error);
      return false;
    }
  }

  /**
   * Sincronizar nota agregada
   */
  private async syncNoteAdded(data: any): Promise<boolean> {
    try {
      // Implementar llamada a la API/Supabase para agregar nota
      console.log('Syncing note added:', data);
      // Aquí iría la lógica real de sincronización
      return true;
    } catch (error) {
      console.error('Error syncing note added:', error);
      return false;
    }
  }

  /**
   * Sincronizar check-in
   */
  private async syncCheckIn(data: any): Promise<boolean> {
    try {
      // Implementar llamada a la API/Supabase para registrar check-in
      console.log('Syncing check-in:', data);
      // Aquí iría la lógica real de sincronización
      return true;
    } catch (error) {
      console.error('Error syncing check-in:', error);
      return false;
    }
  }

  /**
   * Sincronizar check-out
   */
  private async syncCheckOut(data: any): Promise<boolean> {
    try {
      // Implementar llamada a la API/Supabase para registrar check-out
      console.log('Syncing check-out:', data);
      // Aquí iría la lógica real de sincronización
      return true;
    } catch (error) {
      console.error('Error syncing check-out:', error);
      return false;
    }
  }

  /**
   * Limpiar datos offline (útil al cerrar sesión)
   */
  public async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['offline_data', 'pending_actions']);
      this.pendingActions = [];
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Obtener estadísticas de sincronización
   */
  public getSyncStats(): {
    isOnline: boolean;
    pendingActions: number;
    syncInProgress: boolean;
    lastSync: string | null;
  } {
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.length,
      syncInProgress: this.syncInProgress,
      lastSync: null, // Se podría obtener de los datos offline
    };
  }

  /**
   * Forzar sincronización manual
   */
  public async forcSync(): Promise<boolean> {
    if (!this.isOnline) {
      throw new Error('No hay conexión a internet');
    }

    await this.syncPendingActions();
    return this.pendingActions.length === 0;
  }
}

export default OfflineService.getInstance();

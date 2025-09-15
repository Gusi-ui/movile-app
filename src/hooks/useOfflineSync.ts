import { useCallback, useEffect, useState } from 'react';

import OfflineService, {
  OfflineData,
  PendingAction,
} from '../services/OfflineService';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  pendingActionsCount: number;
  syncInProgress: boolean;
  saveOfflineData: (data: Partial<OfflineData>) => Promise<void>;
  getOfflineData: () => Promise<OfflineData>;
  addPendingAction: (
    action: Omit<PendingAction, 'id' | 'timestamp'>
  ) => Promise<void>;
  syncNow: () => Promise<boolean>;
  clearData: () => Promise<void>;
  getSyncStats: () => {
    isOnline: boolean;
    pendingActions: number;
    syncInProgress: boolean;
    lastSync: string | null;
  };
}

export const useOfflineSync = (): UseOfflineSyncReturn => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingActionsCount, setPendingActionsCount] = useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);

  // Actualizar estadísticas cada 5 segundos
  useEffect(() => {
    const updateStats = (): void => {
      const stats = OfflineService.getSyncStats();
      setIsOnline(stats.isOnline);
      setPendingActionsCount(stats.pendingActions);
      setSyncInProgress(stats.syncInProgress);
    };

    // Actualizar inmediatamente
    updateStats();

    // Configurar intervalo
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  // Función para guardar datos offline
  const saveOfflineData = useCallback(
    async (data: Partial<OfflineData>): Promise<void> => {
      await OfflineService.saveOfflineData(data);
    },
    []
  );

  // Función para obtener datos offline
  const getOfflineData = useCallback(async (): Promise<OfflineData> => {
    return await OfflineService.getOfflineData();
  }, []);

  // Función para agregar acción pendiente
  const addPendingAction = useCallback(
    async (action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<void> => {
      await OfflineService.addPendingAction(action);
      // Actualizar contador inmediatamente
      setPendingActionsCount(OfflineService.getPendingActionsCount());
    },
    []
  );

  // Función para sincronizar manualmente
  const syncNow = useCallback(async (): Promise<boolean> => {
    try {
      return await OfflineService.forcSync();
    } catch (error) {
      console.error('Error during manual sync:', error);
      throw error;
    }
  }, []);

  // Función para limpiar datos
  const clearData = useCallback(async (): Promise<void> => {
    await OfflineService.clearOfflineData();
    setPendingActionsCount(0);
  }, []);

  // Función para obtener estadísticas
  const getSyncStats = useCallback(() => {
    return OfflineService.getSyncStats();
  }, []);

  return {
    isOnline,
    pendingActionsCount,
    syncInProgress,
    saveOfflineData,
    getOfflineData,
    addPendingAction,
    syncNow,
    clearData,
    getSyncStats,
  };
};

import { useState, useCallback } from "react";
import api from "../services/api";
import { handleApiError } from "../utils/api-helpers";

/**
 * useSync - Hook reutilizável para sincronização de dados
 * Centraliza lógica de sync com loading e error handling
 * 
 * @param {string} endpoint - Endpoint base para sincronização
 * @param {function} onSuccess - Callback executado após sync bem-sucedido
 * @param {function} onError - Callback executado se sync falhar
 * @returns {object} Estado e função de sincronização
 */
export const useSync = (endpoint, onSuccess = null, onError = null) => {
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  /**
   * Executa sincronização
   */
  const sync = useCallback(
    async (params = {}) => {
      setSyncing(true);
      setError(null);
      
      try {
        const response = await api.post(endpoint, params);
        
        setLastSyncTime(new Date());
        
        // Callback de sucesso
        if (onSuccess) {
          onSuccess(response.data);
        }
        
        return response.data;
      } catch (err) {
        const message = handleApiError(err, "Erro ao sincronizar", true);
        setError(message);
        
        // Callback de erro
        if (onError) {
          onError(err);
        }
        
        throw err;
      } finally {
        setSyncing(false);
      }
    },
    [endpoint, onSuccess, onError]
  );
  
  /**
   * Verifica se pode sincronizar (cooldown de 10 segundos)
   */
  const canSync = useCallback(() => {
    if (!lastSyncTime) return true;
    
    const timeSinceLastSync = Date.now() - lastSyncTime.getTime();
    return timeSinceLastSync > 10000; // 10 segundos
  }, [lastSyncTime]);
  
  /**
   * Tempo até poder sincronizar novamente (em segundos)
   */
  const getTimeUntilNextSync = useCallback(() => {
    if (!lastSyncTime) return 0;
    
    const timeSinceLastSync = Date.now() - lastSyncTime.getTime();
    const timeRemaining = Math.max(0, 10000 - timeSinceLastSync);
    return Math.ceil(timeRemaining / 1000);
  }, [lastSyncTime]);
  
  return {
    // Estado
    syncing,
    error,
    lastSyncTime,
    
    // Funções
    sync,
    canSync,
    getTimeUntilNextSync,
  };
};

export default useSync;

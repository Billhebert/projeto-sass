import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { handleApiError, buildQueryParams } from "../utils/api-helpers";
import { usePagination } from "./usePagination";
import { useFilters } from "./useFilters";
import { useMLAccounts } from "./useMLAccounts";
import { useSync } from "./useSync";

/**
 * useListPage - Hook super-reutilizável para páginas de lista
 * Combina: loading, pagination, filters, accounts, sync
 * Substitui lógica duplicada em 10+ páginas
 * 
 * @param {object} config - Configuração da lista
 * @returns {object} Estado e funções completas para página de lista
 */
export const useListPage = (config = {}) => {
  const {
    endpoint, // Endpoint base da API (ex: "/claims")
    accountEndpoint = null, // Endpoint com account ID (ex: "/claims/:accountId")
    requiresAccount = true, // Se requer conta selecionada
    initialFilters = {}, // Filtros iniciais
    initialLimit = 50, // Limite de itens por página
    autoLoad = true, // Se deve carregar automaticamente
    syncEndpoint = null, // Endpoint para sincronização
    onLoadSuccess = null, // Callback após carregar com sucesso
    onLoadError = null, // Callback após erro ao carregar
    onSyncSuccess = null, // Callback após sync com sucesso
  } = config;
  
  // Estados
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Hooks compostos
  const pagination = usePagination(initialLimit);
  const filters = useFilters(initialFilters);
  const accounts = requiresAccount ? useMLAccounts() : { selectedAccount: null };
  const sync = syncEndpoint
    ? useSync(
        syncEndpoint,
        (data) => {
          if (onSyncSuccess) onSyncSuccess(data);
          loadItems();
        }
      )
    : { syncing: false, sync: null };
  
  /**
   * Constrói endpoint com account ID se necessário
   */
  const buildEndpoint = useCallback(() => {
    if (accountEndpoint && accounts.selectedAccount) {
      return accountEndpoint.replace(":accountId", accounts.selectedAccount);
    }
    return endpoint;
  }, [endpoint, accountEndpoint, accounts.selectedAccount]);
  
  /**
   * Carrega itens da API
   */
  const loadItems = useCallback(async () => {
    // Verifica se precisa de conta selecionada
    if (requiresAccount && !accounts.selectedAccount) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const apiEndpoint = buildEndpoint();
      const queryParams = buildQueryParams({
        ...filters.buildQueryParams(),
        offset: pagination.offset,
        limit: pagination.limit,
      });
      
      const response = await api.get(`${apiEndpoint}?${queryParams.toString()}`);
      
      // Extrai itens da resposta
      const data = response.data.data || response.data;
      const itemsList = data.items || data.list || data[Object.keys(data)[0]] || [];
      
      setItems(Array.isArray(itemsList) ? itemsList : []);
      
      // Atualiza paginação
      pagination.updatePaginationFromResponse(response);
      
      // Callback de sucesso
      if (onLoadSuccess) {
        onLoadSuccess(response.data);
      }
      
      return itemsList;
    } catch (err) {
      const message = handleApiError(err, "Erro ao carregar dados", true);
      setError(message);
      
      // Callback de erro
      if (onLoadError) {
        onLoadError(err);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [
    requiresAccount,
    accounts.selectedAccount,
    buildEndpoint,
    filters,
    pagination,
    onLoadSuccess,
    onLoadError,
  ]);
  
  /**
   * Carrega estatísticas (opcional)
   */
  const loadStats = useCallback(async (statsEndpoint) => {
    if (!statsEndpoint) return;
    
    try {
      const apiEndpoint = statsEndpoint.replace(":accountId", accounts.selectedAccount);
      const response = await api.get(apiEndpoint);
      setStats(response.data.data || response.data);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
    }
  }, [accounts.selectedAccount]);
  
  /**
   * Recarrega dados
   */
  const refetch = useCallback(() => {
    return loadItems();
  }, [loadItems]);
  
  /**
   * Executa sincronização
   */
  const handleSync = useCallback(async () => {
    if (!sync.sync || !sync.canSync()) return;
    
    const endpoint = syncEndpoint.replace(":accountId", accounts.selectedAccount);
    await sync.sync({ all: true });
  }, [sync, syncEndpoint, accounts.selectedAccount]);
  
  // Auto-carrega ao montar ou quando dependências mudam
  useEffect(() => {
    if (autoLoad) {
      loadItems();
    }
  }, [
    accounts.selectedAccount,
    filters.filters,
    filters.sortBy,
    pagination.page,
    pagination.limit,
  ]);
  
  return {
    // Dados
    items,
    stats,
    loading,
    error,
    
    // Setters
    setItems,
    setStats,
    setError,
    
    // Funções
    loadItems,
    loadStats,
    refetch,
    
    // Sub-hooks (desestruture conforme necessário)
    pagination,
    filters,
    accounts: requiresAccount ? accounts : null,
    sync: syncEndpoint ? { ...sync, handleSync } : null,
    
    // Helpers
    hasItems: items.length > 0,
    isEmpty: !loading && items.length === 0,
    isLoading: loading,
    hasError: !!error,
  };
};

export default useListPage;

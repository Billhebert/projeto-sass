import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { handleApiError } from "../utils/api-helpers";

/**
 * useMLAccounts - Hook para gerenciar contas do Mercado Livre
 * Substitui loadAccounts() duplicado em 15+ arquivos
 * 
 * @param {boolean} autoSelectFirst - Se deve selecionar automaticamente a primeira conta
 * @returns {object} Estado e funções de contas ML
 */
export const useMLAccounts = (autoSelectFirst = true) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  /**
   * Carrega contas do Mercado Livre
   */
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get("/ml-accounts");
      const accountsList =
        response.data.data?.accounts || response.data.accounts || [];
      
      const validAccounts = Array.isArray(accountsList) ? accountsList : [];
      setAccounts(validAccounts);
      
      // Auto-seleciona primeira conta se habilitado
      if (autoSelectFirst && validAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(validAccounts[0].id);
      }
      
      return validAccounts;
    } catch (err) {
      const message = handleApiError(err, "Erro ao carregar contas", false);
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [autoSelectFirst, selectedAccount]);
  
  /**
   * Recarrega contas (alias para loadAccounts)
   */
  const refetch = useCallback(() => {
    return loadAccounts();
  }, [loadAccounts]);
  
  /**
   * Busca conta por ID
   */
  const getAccountById = useCallback(
    (accountId) => {
      return accounts.find((acc) => acc.id === accountId);
    },
    [accounts]
  );
  
  /**
   * Busca conta atualmente selecionada
   */
  const getSelectedAccount = useCallback(() => {
    return accounts.find((acc) => acc.id === selectedAccount);
  }, [accounts, selectedAccount]);
  
  /**
   * Muda conta selecionada
   */
  const handleAccountChange = useCallback((accountId) => {
    setSelectedAccount(accountId);
  }, []);
  
  /**
   * Limpa conta selecionada
   */
  const clearSelectedAccount = useCallback(() => {
    setSelectedAccount("");
  }, []);
  
  /**
   * Verifica se tem contas disponíveis
   */
  const hasAccounts = accounts.length > 0;
  
  /**
   * Verifica se uma conta específica está selecionada
   */
  const isAccountSelected = (accountId) => {
    return selectedAccount === accountId;
  };
  
  // Carrega contas na montagem do componente
  useEffect(() => {
    loadAccounts();
  }, []);
  
  // Auto-seleciona primeira conta quando contas são carregadas
  useEffect(() => {
    if (autoSelectFirst && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount, autoSelectFirst]);
  
  return {
    // Estado
    accounts,
    selectedAccount,
    loading,
    error,
    hasAccounts,
    
    // Getters
    getAccountById,
    getSelectedAccount,
    isAccountSelected,
    
    // Setters
    setSelectedAccount,
    setAccounts,
    
    // Funções
    loadAccounts,
    refetch,
    handleAccountChange,
    clearSelectedAccount,
  };
};

export default useMLAccounts;

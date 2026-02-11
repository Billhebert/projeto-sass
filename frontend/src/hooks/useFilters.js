import { useState, useCallback } from "react";

/**
 * useFilters - Hook para gerenciar filtros de forma consistente
 * Centraliza lógica de filtros usada em múltiplas páginas
 * 
 * @param {object} initialFilters - Filtros iniciais
 * @returns {object} Estado e funções de filtros
 */
export const useFilters = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("-createdAt");
  
  /**
   * Atualiza um filtro específico
   */
  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);
  
  /**
   * Atualiza múltiplos filtros de uma vez
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);
  
  /**
   * Remove um filtro específico
   */
  const removeFilter = useCallback((key) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);
  
  /**
   * Reseta filtros para os valores iniciais
   */
  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchTerm("");
    setSortBy("-createdAt");
  }, [initialFilters]);
  
  /**
   * Limpa todos os filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm("");
  }, []);
  
  /**
   * Verifica se há filtros ativos
   */
  const hasActiveFilters = useCallback(() => {
    return Object.keys(filters).length > 0 || searchTerm !== "";
  }, [filters, searchTerm]);
  
  /**
   * Conta quantos filtros estão ativos
   */
  const activeFilterCount = useCallback(() => {
    let count = Object.keys(filters).length;
    if (searchTerm) count++;
    return count;
  }, [filters, searchTerm]);
  
  /**
   * Constrói objeto de query params para API
   */
  const buildQueryParams = useCallback(() => {
    const params = { ...filters };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    if (sortBy) {
      params.sort = sortBy;
    }
    
    // Remove valores vazios
    Object.keys(params).forEach((key) => {
      if (params[key] === "" || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    return params;
  }, [filters, searchTerm, sortBy]);
  
  return {
    // Estado
    filters,
    searchTerm,
    sortBy,
    
    // Setters
    setFilters,
    setSearchTerm,
    setSortBy,
    
    // Funções
    updateFilter,
    updateFilters,
    removeFilter,
    resetFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    buildQueryParams,
  };
};

export default useFilters;

import { useState, useCallback } from "react";

/**
 * usePagination - Hook para gerenciar paginação de forma consistente
 * Substitui lógica de paginação duplicada em 8+ arquivos
 * 
 * @param {number} initialLimit - Limite inicial de itens por página
 * @param {number} initialPage - Página inicial
 * @returns {object} Estado e funções de paginação
 */
export const usePagination = (initialLimit = 50, initialPage = 1) => {
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
    totalPages: 0,
    offset: 0,
  });
  
  /**
   * Atualiza informações de paginação a partir da resposta da API
   */
  const updatePaginationFromResponse = useCallback((response) => {
    const data = response.data?.data || response.data || {};
    const total = data.total || data.count || 0;
    const limit = pagination.limit;
    
    setPagination((prev) => ({
      ...prev,
      total,
      totalPages: Math.ceil(total / limit),
    }));
  }, [pagination.limit]);
  
  /**
   * Muda para uma página específica
   */
  const handlePageChange = useCallback((newPage) => {
    setPagination((prev) => {
      if (newPage < 1 || newPage > prev.totalPages) {
        return prev;
      }
      
      return {
        ...prev,
        page: newPage,
        offset: (newPage - 1) * prev.limit,
      };
    });
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  
  /**
   * Vai para a página anterior
   */
  const handlePrevPage = useCallback(() => {
    setPagination((prev) => {
      if (prev.page <= 1) return prev;
      
      const newPage = prev.page - 1;
      return {
        ...prev,
        page: newPage,
        offset: (newPage - 1) * prev.limit,
      };
    });
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  
  /**
   * Vai para a próxima página
   */
  const handleNextPage = useCallback(() => {
    setPagination((prev) => {
      if (prev.page >= prev.totalPages) return prev;
      
      const newPage = prev.page + 1;
      return {
        ...prev,
        page: newPage,
        offset: (newPage - 1) * prev.limit,
      };
    });
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  
  /**
   * Reseta para a primeira página
   */
  const resetToFirstPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: 1,
      offset: 0,
    }));
  }, []);
  
  /**
   * Atualiza o limite de itens por página
   */
  const setLimit = useCallback((newLimit) => {
    setPagination((prev) => {
      const newTotalPages = Math.ceil(prev.total / newLimit);
      const newPage = Math.min(prev.page, newTotalPages || 1);
      
      return {
        ...prev,
        limit: newLimit,
        page: newPage,
        offset: (newPage - 1) * newLimit,
        totalPages: newTotalPages,
      };
    });
  }, []);
  
  /**
   * Define o total de itens manualmente
   */
  const setTotal = useCallback((total) => {
    setPagination((prev) => ({
      ...prev,
      total,
      totalPages: Math.ceil(total / prev.limit),
    }));
  }, []);
  
  return {
    // Estado
    pagination,
    currentPage: pagination.page,
    totalPages: pagination.totalPages,
    totalItems: pagination.total,
    limit: pagination.limit,
    offset: pagination.offset,
    hasMore: pagination.page < pagination.totalPages,
    hasPrev: pagination.page > 1,
    
    // Funções
    setPagination,
    handlePageChange,
    handlePrevPage,
    handleNextPage,
    resetToFirstPage,
    setLimit,
    setTotal,
    updatePaginationFromResponse,
  };
};

export default usePagination;

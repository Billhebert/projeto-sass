import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from '../store/toastStore';

/**
 * Hook para gerenciar produtos de uma conta ML
 * Centraliza lógica de fetch, sync, stats, filtros
 */
export function useProducts(accountId, options = {}) {
  const {
    autoLoad = true,
    fetchStats = true,
    defaultStatus = 'active',
    defaultSort = '-createdAt'
  } = options;

  // States
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [account, setAccount] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState(defaultStatus);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);

  // Fetch products
  const loadProducts = useCallback(async () => {
    if (!accountId) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({
        all: 'true',
        sort: sortBy,
      });

      if (filterStatus) {
        query.append('status', filterStatus);
      }

      const response = await api.get(`/products/${accountId}?${query.toString()}`);

      if (response.data.success) {
        setProducts(response.data.data.products);
        setAccount(response.data.data.account);
        setTotal(response.data.data.total || 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao carregar produtos');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId, filterStatus, sortBy]);

  // Fetch stats
  const loadStats = useCallback(async () => {
    if (!accountId || !fetchStats) return;

    try {
      const response = await api.get(`/products/${accountId}/stats`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [accountId, fetchStats]);

  // Sync products
  const syncProducts = useCallback(async () => {
    if (!accountId) return;

    setSyncing(true);
    try {
      const response = await api.post(`/products/${accountId}/sync`, { all: true });

      if (response.data.success) {
        setProducts(response.data.data.products);
        setTotal(response.data.data.productsCount || response.data.data.products.length);
        await loadStats();
        toast.success(`${response.data.data.productsCount || response.data.data.products.length} produtos sincronizados!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao sincronizar');
      console.error('Error syncing products:', err);
    } finally {
      setSyncing(false);
    }
  }, [accountId, loadStats]);

  // Delete product
  const deleteProduct = useCallback(async (productId) => {
    if (!accountId) return;

    try {
      await api.delete(`/products/${accountId}/${productId}`);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Produto removido com sucesso');
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao remover produto');
      return false;
    }
  }, [accountId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && accountId) {
      loadProducts();
      loadStats();
    }
  }, [autoLoad, accountId, loadProducts, loadStats]);

  // Reload when filters change
  useEffect(() => {
    if (accountId) {
      loadProducts();
    }
  }, [filterStatus, sortBy]);

  // Filtered products (search)
  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    // Data
    products,
    filteredProducts,
    stats,
    account,
    total,
    
    // States
    loading,
    syncing,
    
    // Filters
    filterStatus,
    setFilterStatus,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    
    // Actions
    loadProducts,
    loadStats,
    syncProducts,
    deleteProduct,
  };
}

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from '../store/toastStore';
import { exportToCSV, exportToPDF, prepareProductsForExport } from '../utils/export';
import './Products.css';

export default function Products() {
  const navigate = useNavigate();
  const { accountId } = useParams();

  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [account, setAccount] = useState(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0 });

  // Fetch products
  useEffect(() => {
    fetchProducts();
    fetchStats();
  }, [accountId, filterStatus, sortBy, pagination]);

  const fetchProducts = async () => {
    if (!accountId) return;

    setLoading(true);

    try {
      const query = new URLSearchParams({
        limit: pagination.limit,
        offset: pagination.offset,
        sort: sortBy,
      });

      if (filterStatus) {
        query.append('status', filterStatus);
      }

      const response = await api.get(
        `/products/${accountId}?${query.toString()}`
      );

      if (response.data.success) {
        setProducts(response.data.data.products);
        setAccount(response.data.data.account);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.total,
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!accountId) return;

    try {
      const response = await api.get(`/products/${accountId}/stats`);

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleSyncProducts = async () => {
    if (!accountId) return;

    setSyncing(true);

    try {
      const response = await api.post(`/products/${accountId}/sync`);

      if (response.data.success) {
        setProducts(response.data.data.products);
        fetchStats();
        toast.success('Products synced successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to sync products');
      console.error('Error syncing products:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveProduct = async (productId) => {
    if (!accountId) return;

    if (!window.confirm('Are you sure you want to remove this product?')) {
      return;
    }

    try {
      await api.delete(`/products/${accountId}/${productId}`);
      setProducts(products.filter(p => p.id !== productId));
      toast.success('Product removed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove product');
    }
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasProducts = filteredProducts.length > 0;
  const totalPages = Math.ceil((pagination.total || 0) / pagination.limit);
  const currentPage = pagination.offset / pagination.limit + 1;

  // Export handlers
  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.warning('No products to export');
      return;
    }
    const data = prepareProductsForExport(products);
    const accountName = account?.nickname || 'account';
    exportToCSV(data, `products_${accountName}_${new Date().toISOString().split('T')[0]}`);
    toast.success('CSV file exported successfully!');
  };

  const handleExportPDF = () => {
    if (products.length === 0) {
      toast.warning('No products to export');
      return;
    }

    const columns = [
      { key: 'title', label: 'Product' },
      { key: 'price', label: 'Price', format: 'currency' },
      { key: 'quantity', label: 'Stock', format: 'number' },
      { key: 'salesCount', label: 'Sales', format: 'number' },
      { key: 'status', label: 'Status' },
    ];

    const accountName = account?.nickname || 'Account';
    exportToPDF(`Products Report - ${accountName}`, products, columns);
    toast.info('PDF opened in new tab. Use Ctrl+P to save.');
  };

  return (
    <div className="products-container">
      <div className="products-header">
        <div className="header-left">
          <h1>🏪 Products</h1>
          {account && <p className="account-name">{account.nickname}</p>}
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          {products.length > 0 && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleExportCSV}
                title="Export to CSV"
              >
                📄 CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportPDF}
                title="Export to PDF"
              >
                📑 PDF
              </button>
            </>
          )}
          <button
            className={`btn btn-primary ${syncing ? 'loading' : ''}`}
            onClick={handleSyncProducts}
            disabled={syncing}
          >
            {syncing ? '⏳ Syncing...' : '🔄 Sync Products'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{stats.products.total}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-label">Active</div>
              <div className="stat-value">{stats.products.active}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏸️</div>
            <div className="stat-content">
              <div className="stat-label">Paused</div>
              <div className="stat-value">{stats.products.paused}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-label">Low Stock</div>
              <div className="stat-value">{stats.products.lowStock}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Sales</div>
              <div className="stat-value">{stats.sales}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Est. Value</div>
              <div className="stat-value">
                R$ {(stats.estimatedValue || 0).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="products-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPagination({ ...pagination, offset: 0 });
            }}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="-createdAt">Newest First</option>
            <option value="createdAt">Oldest First</option>
            <option value="-price.amount">Price: High to Low</option>
            <option value="price.amount">Price: Low to High</option>
            <option value="-salesCount">Most Sales</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      ) : hasProducts ? (
        <>
          <div className="products-table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Sales</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="product-row">
                    <td className="product-info">
                      {product.thumbnailUrl && (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.title}
                          className="product-thumbnail"
                        />
                      )}
                      <div className="product-details">
                        <a
                          href={product.permalinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="product-title"
                        >
                          {product.title}
                        </a>
                        <span className="product-id">#{product.mlProductId}</span>
                      </div>
                    </td>
                    <td className="product-price">
                      R$ {product.price.toLocaleString('pt-BR')}
                    </td>
                    <td className="product-stock">
                      <span
                        className={`stock-badge ${
                          product.quantity > 10
                            ? 'high'
                            : product.quantity > 0
                            ? 'medium'
                            : 'low'
                        }`}
                      >
                        {product.quantity} units
                      </span>
                    </td>
                    <td className="product-sales">
                      {product.salesCount} sales
                    </td>
                    <td className="product-status">
                      <span className={`status-badge ${product.status}`}>
                        {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </span>
                    </td>
                    <td className="product-actions">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() =>
                          navigate(
                            `/accounts/${accountId}/products/${product.id}`
                          )
                        }
                        title="View details"
                      >
                        👁️
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleRemoveProduct(product.id)}
                        title="Remove product"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    offset: Math.max(0, pagination.offset - pagination.limit),
                  })
                }
                disabled={currentPage === 1}
                className="btn btn-small"
              >
                ← Previous
              </button>

              <div className="pagination-info">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    offset: pagination.offset + pagination.limit,
                  })
                }
                disabled={currentPage === totalPages}
                className="btn btn-small"
              >
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>No Products Found</h2>
          <p>
            {searchTerm
              ? 'No products match your search'
              : 'Sync your Mercado Livre account to see products here'}
          </p>
          {!searchTerm && (
            <button
              className="btn btn-primary"
              onClick={handleSyncProducts}
              disabled={syncing}
            >
              {syncing ? '⏳ Syncing...' : '🔄 Sync Products Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

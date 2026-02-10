import React, { useState, useCallback } from "react";
import {
  useMLAccounts,
  useOrders,
  useOrdersStats,
  useSyncOrders,
} from "../hooks/useApi";
import api from "../services/api";
import OrdersFilters from "../components/OrdersFilters";
import OrdersStats from "../components/OrdersStats";
import OrdersTable from "../components/OrdersTable";
import OrderDetailsModal from "../components/OrderDetailsModal";
import LoadingState from "../components/LoadingState";
import "./Orders.css";

/**
 * Orders Page - Manage Mercado Livre orders
 */
function Orders() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Fetch accounts using React Query
  const { data: accounts = [], isLoading: accountsLoading } = useMLAccounts();

  // Fetch orders using React Query
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useOrders(selectedAccount, filters);

  // Fetch orders stats
  const { data: stats } = useOrdersStats(selectedAccount);

  // Sync orders mutation
  const { mutate: syncOrders, isPending: syncing } = useSyncOrders();

  // Auto-select first account when accounts load
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const firstAccountId = accounts[0]._id || accounts[0].id;
      setSelectedAccount(firstAccountId);
    }
  }, [accounts, selectedAccount]);

  // Format currency helper
  const formatCurrency = useCallback((value, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  }, []);

  // Format date helper
  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleString("pt-BR");
  }, []);

  // Get status badge class helper
  const getStatusBadgeClass = useCallback((status) => {
    const statusMap = {
      paid: "badge-success",
      confirmed: "badge-success",
      payment_required: "badge-warning",
      pending: "badge-warning",
      cancelled: "badge-danger",
      invalid: "badge-danger",
    };
    return statusMap[status] || "badge-secondary";
  }, []);

  // Handle sync orders
  const handleSyncOrders = () => {
    syncOrders({
      accountId: selectedAccount,
      options: { status: "paid", days: 90, all: true },
    });
  };

  // View order details
  const viewOrderDetails = async (orderId) => {
    try {
      const response = await api.get(`/orders/${selectedAccount}/${orderId}`);
      const resData = response.data;

      // Handle different response formats
      let orderData = null;

      if (resData?.success && resData?.data) {
        orderData = resData.data.order || resData.data;
      } else if (resData?.order) {
        orderData = resData.order;
      } else {
        orderData = resData;
      }

      setSelectedOrder(orderData);
      setShowModal(true);
    } catch (err) {
      console.error("Error loading order details:", err);
    }
  };

  const orders = ordersData?.orders || [];
  const isLoading = accountsLoading || ordersLoading;

  return (
    <div className="orders-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <span className="material-icons">shopping_cart</span>
            Pedidos
          </h1>
          <p>Gerencie seus pedidos do Mercado Livre</p>
        </div>
        <div className="header-actions">
          <select
            className="account-select"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            aria-label="Selecionar conta"
          >
            {accounts.map((acc) => (
              <option key={acc._id || acc.id} value={acc._id || acc.id}>
                {acc.nickname || acc.mlUserId}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            onClick={handleSyncOrders}
            disabled={syncing || !selectedAccount}
            aria-label={syncing ? "Sincronizando..." : "Sincronizar pedidos"}
          >
            <span className="material-icons">sync</span>
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <OrdersStats stats={stats} formatCurrency={formatCurrency} />

      {/* Filters */}
      <OrdersFilters filters={filters} onFilterChange={setFilters} />

      {/* Error state */}
      {ordersError && !isLoading && (
        <div className="alert alert-danger">
          <span className="material-icons">error</span>
          {ordersError.message || "Erro ao carregar pedidos"}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <LoadingState message="Carregando pedidos..." />
      ) : (
        /* Orders Table */
        <OrdersTable
          orders={orders}
          onViewDetails={viewOrderDetails}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadgeClass={getStatusBadgeClass}
        />
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        order={selectedOrder}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusBadgeClass={getStatusBadgeClass}
      />
    </div>
  );
}

export default Orders;

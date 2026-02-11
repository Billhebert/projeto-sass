/**
 * Orders Types
 * 
 * Type definitions for Mercado Livre orders
 */

export type OrderStatus = 
  | 'confirmed' 
  | 'payment_in_process' 
  | 'payment_pending'
  | 'paid'
  | 'partially_paid'
  | 'authorized'
  | 'in_process'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'not_delivered'
  | 'returned'
  | 'refunded';

export type PaymentStatus =
  | 'approved'
  | 'pending'
  | 'authorized'
  | 'in_process'
  | 'rejected'
  | 'refunded'
  | 'cancelled'
  | 'in_mediation';

export type ShippingStatus =
  | 'pending'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'not_delivered'
  | 'returned'
  | 'handling';

export interface OrderBuyer {
  id: string;
  nickname: string;
  email?: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  title: string;
  variationId?: string;
  variationAttributes?: Array<{
    id: string;
    name: string;
    valueId: string;
    valueName: string;
  }>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  thumbnail: string;
  itemId: string;
}

export interface OrderPayment {
  id: string;
  paymentMethod: string;
  paymentMethodId: string;
  status: PaymentStatus;
  amount: number;
  currencyId: string;
  transactionAmount: number;
  installments: number;
  dateApproved?: string;
  dateCreated: string;
}

export interface OrderShipping {
  id: string;
  shipmentId: string;
  status: ShippingStatus;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  dateDelivered?: string;
  address: {
    streetName: string;
    streetNumber?: string;
    complement?: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface OrderDetail {
  id: string;
  externalOrderId: string;
  accountId: string;
  status: OrderStatus;
  buyer: OrderBuyer;
  items: OrderItem[];
  payments: OrderPayment[];
  shipping: OrderShipping;
  subtotal: number;
  shippingCost: number;
  discount: number;
  totalAmount: number;
  currencyId: string;
  dateCreated: string;
  dateConfirmed?: string;
  dateShipped?: string;
  dateDelivered?: string;
  feedback?: {
    given: boolean;
    received: boolean;
    rating?: number;
  };
  tags: string[];
  notes?: string;
}

export interface OrderListItem {
  id: string;
  externalOrderId: string;
  accountId: string;
  status: OrderStatus;
  buyerNickname: string;
  buyerId: string;
  totalAmount: number;
  currencyId: string;
  itemsCount: number;
  dateCreated: string;
  firstItemTitle: string;
  firstItemThumbnail: string;
}

export interface OrderFilters {
  accountId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  shippingStatus?: ShippingStatus;
  buyerId?: string;
  buyerNickname?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchQuery?: string;
}

export interface OrdersStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

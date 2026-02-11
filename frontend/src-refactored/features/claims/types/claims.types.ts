/**
 * Claims Types
 * 
 * Type definitions for Mercado Livre claims/disputes
 */

export type ClaimStatus = 
  | 'opened'
  | 'processing'
  | 'pending'
  | 'closed'
  | 'escalated'
  | 'resolved'
  | 'cancelled';

export type ClaimType = 
  | 'product_not_received'
  | 'product_not_as_described'
  | 'product_defective'
  | 'wrong_item'
  | 'incomplete_order'
  | 'other';

export type ClaimResolution = 
  | 'refund'
  | 'replacement'
  | 'return'
  | 'partial_refund'
  | 'not_responsible'
  | 'buyer_did_not_respond'
  | 'other';

export interface ClaimBuyer {
  id: string;
  nickname: string;
  email?: string;
}

export interface ClaimOrder {
  id: string;
  externalOrderId: string;
  dateCreated: string;
  totalAmount: number;
}

export interface ClaimItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  thumbnail: string;
}

export interface ClaimMessage {
  id: string;
  from: 'buyer' | 'seller' | 'system';
  text: string;
  attachments?: Array<{ url: string; name: string }>;
  createdAt: string;
}

export interface ClaimDetail {
  id: string;
  accountId: string;
  mlClaimId: string;
  type: ClaimType;
  status: ClaimStatus;
  stage: string;
  resolution?: ClaimResolution;
  buyer: ClaimBuyer;
  order: ClaimOrder;
  item: ClaimItem;
  reason: string;
  claimAmount: number;
  awardedAmount?: number;
  currencyId: string;
  messages: ClaimMessage[];
  documents: Array<{ id: string; type: string; url: string }>;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  resolvedAt?: string;
}

export interface ClaimListItem {
  id: string;
  accountId: string;
  mlClaimId: string;
  type: ClaimType;
  status: ClaimStatus;
  buyerNickname: string;
  orderId: string;
  itemTitle: string;
  claimAmount: number;
  currencyId: string;
  createdAt: string;
  daysOpen: number;
}

export interface ClaimFilters {
  accountId?: string;
  status?: ClaimStatus;
  type?: ClaimType;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ClaimStats {
  total: number;
  opened: number;
  processing: number;
  resolved: number;
  escalated: number;
  totalAmountInDispute: number;
  totalAwardedAmount: number;
  averageResolutionTime: number;
}

export interface ClaimResponsePayload {
  claimId: string;
  text: string;
  documents?: string[];
}

export interface AcceptClaimPayload {
  claimId: string;
  resolution: ClaimResolution;
  comment?: string;
}

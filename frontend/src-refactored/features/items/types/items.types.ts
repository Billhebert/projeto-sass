/**
 * Items/Products Types
 * 
 * Type definitions for Mercado Livre items/products
 */

export interface ItemFilters {
  accountId?: string;
  status?: ItemStatus;
  searchQuery?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStock?: number;
  maxStock?: number;
}

export type ItemStatus = 
  | 'active' 
  | 'paused' 
  | 'closed' 
  | 'under_review' 
  | 'inactive';

export type ListingType = 'gold_special' | 'gold_pro' | 'gold' | 'silver' | 'bronze' | 'free';

export interface ItemPicture {
  id: string;
  url: string;
  secureUrl: string;
  size: string;
  maxSize: string;
}

export interface ItemAttribute {
  id: string;
  name: string;
  valueId?: string;
  valueName: string;
}

export interface ItemShipping {
  mode: string;
  freeShipping: boolean;
  localPickUp: boolean;
  logisticType?: string;
}

export interface ItemDetails {
  id: string;
  title: string;
  categoryId: string;
  price: number;
  currencyId: string;
  availableQuantity: number;
  soldQuantity: number;
  status: ItemStatus;
  condition: 'new' | 'used';
  permalink: string;
  thumbnail: string;
  pictures: ItemPicture[];
  listingType: ListingType;
  shipping: ItemShipping;
  attributes: ItemAttribute[];
  warranty?: string;
  videoId?: string;
  tags: string[];
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemListItem {
  id: string;
  title: string;
  price: number;
  availableQuantity: number;
  soldQuantity: number;
  status: ItemStatus;
  thumbnail: string;
  permalink: string;
  listingType: ListingType;
  accountId: string;
  updatedAt: string;
}

export interface BulkUpdatePayload {
  itemIds: string[];
  updates: {
    status?: ItemStatus;
    price?: number;
    availableQuantity?: number;
  };
}

export interface ItemsStats {
  totalItems: number;
  activeItems: number;
  pausedItems: number;
  totalStock: number;
  totalValue: number;
  averagePrice: number;
}

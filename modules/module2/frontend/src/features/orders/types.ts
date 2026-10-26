export type OrderStatus =
  | 'CREATED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ManufacturingOrder {
  id: string;
  orderNo: string;
  approvalId: string;
  planHash: string;
  quantity: number;
  status: OrderStatus;
  recipientId?: string;
  recipientName?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assetTags: string[];
}

export interface CreateOrderRequest {
  approvalId: string;
  quantity?: number;
  recipientId?: string;
}

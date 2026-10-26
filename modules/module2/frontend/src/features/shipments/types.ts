export type ShipmentStatus =
  | 'PREPARING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED';

export interface ShipmentEvent {
  id: number;
  shipmentId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId?: string;
  note?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  shipmentNo: string;
  orderId: string;
  orderNo: string;
  status: ShipmentStatus;
  carrierLabel: string;
  trackingNo?: string;
  createdAt: string;
  updatedAt: string;
  events: ShipmentEvent[];
}

export interface TransitionShipmentRequest {
  toStatus: string;
  note?: string;
}

export interface CreateShipmentRequest {
  carrierLabel?: string;
  trackingNo?: string;
}

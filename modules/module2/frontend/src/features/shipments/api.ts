import { api } from '@/lib/apiClient';
import { Shipment, CreateShipmentRequest, TransitionShipmentRequest } from './types';

export const shipmentsApi = {
  getShipments: async (): Promise<Shipment[]> => {
    return api.get<Shipment[]>('/shipments');
  },

  getShipmentById: async (id: string): Promise<Shipment> => {
    return api.get<Shipment>(`/shipments/${id}`);
  },

  createShipment: async (orderId: string, request?: CreateShipmentRequest): Promise<Shipment> => {
    return api.post<Shipment>(`/orders/${orderId}/shipments`, request || {});
  },

  transitionShipment: async (id: string, request: TransitionShipmentRequest): Promise<Shipment> => {
    return api.post<Shipment>(`/shipments/${id}/transition`, request);
  },

  confirmDelivery: async (id: string): Promise<Shipment> => {
    return api.post<Shipment>(`/shipments/${id}/confirm-delivery`, {});
  },
};

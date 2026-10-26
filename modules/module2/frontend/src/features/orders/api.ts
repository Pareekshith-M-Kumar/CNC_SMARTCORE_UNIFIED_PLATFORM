import { api } from '@/lib/apiClient';
import { ManufacturingOrder, CreateOrderRequest } from './types';

export const ordersApi = {
  getOrders: async (): Promise<ManufacturingOrder[]> => {
    return api.get<ManufacturingOrder[]>('/orders');
  },

  getOrderById: async (id: string): Promise<ManufacturingOrder> => {
    return api.get<ManufacturingOrder>(`/orders/${id}`);
  },

  createOrder: async (request: CreateOrderRequest): Promise<ManufacturingOrder> => {
    return api.post<ManufacturingOrder>('/orders', request);
  },
};

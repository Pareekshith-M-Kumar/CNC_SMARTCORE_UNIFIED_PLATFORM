import { api } from '@/lib/apiClient';
import { PhysicalAsset, RegisterAssetRequest, LinkMachineRequest } from './types';

export const assetsApi = {
  getAssets: async (): Promise<PhysicalAsset[]> => {
    return api.get<PhysicalAsset[]>('/assets');
  },

  getAssetByTag: async (tag: string): Promise<PhysicalAsset> => {
    return api.get<PhysicalAsset>(`/assets/${tag}`);
  },

  registerAsset: async (tag: string, request?: RegisterAssetRequest): Promise<PhysicalAsset> => {
    return api.post<PhysicalAsset>(`/assets/${tag}/register`, request || {});
  },

  linkMachine: async (tag: string, request: LinkMachineRequest): Promise<PhysicalAsset> => {
    return api.post<PhysicalAsset>(`/assets/${tag}/link-machine`, request);
  },
};

import { api } from '@/lib/apiClient';
import { Material, MaterialRecommendationRequest, MaterialRecommendationResponse } from './types';
import { CadVersion } from '../design/types';

const normalizeMaterial = (m: any): Material => ({
  ...m,
  kcNPerMm2: m.kcNPerMm2 ?? m.kcNMm2 ?? 700,
  vcMinMPerMin: m.vcMinMPerMin ?? m.vcMinMMin ?? 180,
  vcMaxMPerMin: m.vcMaxMPerMin ?? m.vcMaxMMin ?? 350,
});

export const materialsApi = {
  getMaterials: async (): Promise<Material[]> => {
    const list = await api.get<any[]>('/materials');
    return (list || []).map(normalizeMaterial);
  },

  getMaterialById: async (id: string): Promise<Material> => {
    const m = await api.get<any>(`/materials/${id}`);
    return normalizeMaterial(m);
  },

  recommendMaterials: async (
    cadVersionId: string,
    request: MaterialRecommendationRequest
  ): Promise<MaterialRecommendationResponse> => {
    return api.post<MaterialRecommendationResponse>(
      `/cad-versions/${cadVersionId}/material-recommendations`,
      request
    );
  },

  getLatestRecommendation: async (
    cadVersionId: string
  ): Promise<MaterialRecommendationResponse | null> => {
    try {
      return await api.get<MaterialRecommendationResponse>(
        `/cad-versions/${cadVersionId}/material-recommendations`
      );
    } catch {
      return null;
    }
  },

  selectMaterial: async (
    cadVersionId: string,
    materialId: string
  ): Promise<CadVersion> => {
    return api.put<CadVersion>(
      `/cad-versions/${cadVersionId}/material-selection`,
      { materialId }
    );
  },
};

import { api } from '@/lib/apiClient';
import { SimulationResponse } from './types';

export const simulationApi = {
  runSimulation: async (camJobId: string): Promise<SimulationResponse> => {
    return api.post<SimulationResponse>(`/cam-jobs/${camJobId}/simulations`);
  },

  getLatestSimulation: async (camJobId: string): Promise<SimulationResponse> => {
    return api.get<SimulationResponse>(`/cam-jobs/${camJobId}/simulations/latest`);
  },

  getSimulationById: async (id: string): Promise<SimulationResponse> => {
    return api.get<SimulationResponse>(`/simulations/${id}`);
  },
};

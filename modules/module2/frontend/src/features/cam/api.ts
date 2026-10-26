import { api } from '@/lib/apiClient';
import {
  MachineProfile,
  CuttingTool,
  CamJob,
  CreateCamJobRequest,
  ConfigureCamJobRequest,
  CamEstimates,
  ToolpathGeometry,
} from './types';

export const camApi = {
  getMachines: async (): Promise<MachineProfile[]> => {
    return api.get<MachineProfile[]>('/machine-profiles');
  },

  getMachineById: async (id: string): Promise<MachineProfile> => {
    return api.get<MachineProfile>(`/machine-profiles/${id}`);
  },

  getTools: async (): Promise<CuttingTool[]> => {
    return api.get<CuttingTool[]>('/cutting-tools');
  },

  getToolById: async (id: string): Promise<CuttingTool> => {
    return api.get<CuttingTool>(`/cutting-tools/${id}`);
  },

  getCamJobs: async (cadVersionId?: string): Promise<CamJob[]> => {
    const url = cadVersionId ? `/cam-jobs?cadVersionId=${cadVersionId}` : '/cam-jobs';
    return api.get<CamJob[]>(url);
  },

  getCamJobById: async (id: string): Promise<CamJob> => {
    return api.get<CamJob>(`/cam-jobs/${id}`);
  },

  createCamJob: async (request: CreateCamJobRequest): Promise<CamJob> => {
    return api.post<CamJob>('/cam-jobs', request);
  },

  configureCamJob: async (
    id: string,
    request: ConfigureCamJobRequest
  ): Promise<CamJob> => {
    return api.put<CamJob>(`/cam-jobs/${id}/configuration`, request);
  },

  calculateSandbox: async (
    id: string,
    request: ConfigureCamJobRequest
  ): Promise<CamEstimates> => {
    return api.post<CamEstimates>(`/cam-jobs/${id}/calculate`, request);
  },

  generateToolpaths: async (id: string): Promise<CamJob> => {
    return api.post<CamJob>(`/cam-jobs/${id}/toolpaths/generate`);
  },

  getToolpathGeometry: async (id: string): Promise<ToolpathGeometry> => {
    return api.get<ToolpathGeometry>(`/cam-jobs/${id}/toolpath`);
  },

  getGCode: async (id: string, download = false): Promise<string> => {
    const devRole = typeof window !== 'undefined' ? (localStorage.getItem('cnc_dev_role') || 'admin') : 'admin';
    const res = await fetch(`/api/v1/cam-jobs/${id}/gcode${download ? '?download=true' : ''}`, {
      headers: {
        'X-Dev-Role': devRole,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to fetch G-code' }));
      throw new Error(err.message || 'Failed to fetch G-code');
    }
    return res.text();
  },
};

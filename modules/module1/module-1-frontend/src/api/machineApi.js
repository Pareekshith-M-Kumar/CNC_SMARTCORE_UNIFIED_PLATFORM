import axios from './axios';

const MACHINE_BASE = '/api/v1/machines';
const ANALYTICS_BASE = '/api/v1/analytics';
const MAINTENANCE_BASE = '/api/v1/maintenance';
const TOOLS_BASE = '/api/v1/tools';
const SCHEDULING_BASE = '/api/v1/scheduling';

export const machineApi = {
  // Machines
  getAll: () => axios.get(MACHINE_BASE),
  getById: (id) => axios.get(`${MACHINE_BASE}/${id}`),
  create: (data) => axios.post(MACHINE_BASE, data),
  update: (id, data) => axios.put(`${MACHINE_BASE}/${id}`, data),
  delete: (id) => axios.delete(`${MACHINE_BASE}/${id}`),

  // Metrics
  getMetrics: (id) => axios.get(`${MACHINE_BASE}/${id}/metrics`),
  getLatestMetrics: (id) =>
      axios.get(`${MACHINE_BASE}/${id}/metrics/latest`),

  // Analytics
  getAnalytics: () =>
      axios.get(`${ANALYTICS_BASE}/fleet`),

  // Predictive maintenance
  getPredictiveMaintenance: () =>
      axios.get(`${MAINTENANCE_BASE}/recommendations`),

  // Tool wear
  getToolWear: () =>
      axios.get(`${TOOLS_BASE}/high-wear`),

  // Job scheduling
  getJobs: () =>
      axios.get(`${SCHEDULING_BASE}/jobs`),

  // Alerts
  // TODO: backend currently has no global alerts endpoint
  getAlerts: () =>
      Promise.resolve({ data: [] }),
};
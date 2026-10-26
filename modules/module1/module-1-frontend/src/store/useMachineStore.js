import { create } from 'zustand';
import { machineApi } from '../api/machineApi';

export const INITIAL_CNC_MACHINES = [
  {
    id: 1,
    machineName: 'Haas VF-2SS 3-Axis VMC',
    machineCode: 'CNC-001',
    status: 'RUNNING',
    location: 'Bay 1 - CNC Milling Cell',
    manufacturer: 'Haas Automation',
    model: 'VF-2SS',
    spindleSpeed: 12000,
    feedRate: 1500,
    temperature: 42.5,
    vibration: 0.038,
    toolWear: 24.5,
    healthScore: 94.2,
    failureProbability: 0.058,
    rulHours: 185.0,
    datasetSource: 'AI4I 2020 / NASA Milling Dataset (tool_wear_model.pkl)',
    aiRecommendation: 'Optimal wear profile. Normal flank wear progression within tolerance.',
    activeJob: 'Aero Bracket Milling (JOB-1042)',
    efficiency: 94.2,
    assetTag: 'ASSET-000123',
  },
  {
    id: 2,
    machineName: 'DMG Mori NLX 2500 Lathe',
    machineCode: 'CNC-002',
    status: 'RUNNING',
    location: 'Bay 2 - CNC Turning Center',
    manufacturer: 'DMG MORI',
    model: 'NLX 2500/700',
    spindleSpeed: 3800,
    feedRate: 420,
    temperature: 38.2,
    vibration: 0.024,
    toolWear: 31.0,
    healthScore: 91.8,
    failureProbability: 0.082,
    rulHours: 210.0,
    datasetSource: 'AI4I 2020 / NASA Milling Dataset (health_model.pkl)',
    aiRecommendation: 'Stable turning vibration envelope. Maintain coolant flow rate.',
    activeJob: 'Titanium Rotor Shaft (JOB-1043)',
    efficiency: 91.8,
    assetTag: 'ASSET-000120',
  },
  {
    id: 3,
    machineName: 'Hermle C42 5-Axis Machining Center',
    machineCode: 'CNC-003',
    status: 'IDLE',
    location: 'Bay 3 - Precision 5-Axis Cell',
    manufacturer: 'Hermle AG',
    model: 'C42U',
    spindleSpeed: 0,
    feedRate: 0,
    temperature: 24.1,
    vibration: 0.005,
    toolWear: 12.0,
    healthScore: 98.5,
    failureProbability: 0.015,
    rulHours: 320.0,
    datasetSource: 'AI4I 2020 / NASA Milling Dataset (failure_model.pkl)',
    aiRecommendation: 'Pre-machining zero-offset verified. Machine in optimal standby state.',
    activeJob: 'Awaiting Workpiece Setup',
    efficiency: 87.5,
  },
  {
    id: 4,
    machineName: 'Makino D500 5-Axis VMC',
    machineCode: 'CNC-004',
    status: 'RUNNING',
    location: 'Bay 4 - High-Speed Machining',
    manufacturer: 'Makino',
    model: 'D500',
    spindleSpeed: 18500,
    feedRate: 2200,
    temperature: 58.8,
    vibration: 0.068,
    toolWear: 68.4,
    healthScore: 76.5,
    failureProbability: 0.235,
    rulHours: 42.0,
    datasetSource: 'AI4I 2020 / NASA Milling Dataset (tool_wear_model.pkl)',
    aiRecommendation: 'Accelerated thermal wear detected (58.8°C). Schedule insert rotation within 4 operating hours.',
    activeJob: 'Turbine Impeller 5-Axis Contour',
    efficiency: 96.0,
  },
  {
    id: 5,
    machineName: 'Mitsubishi MV2400-S Wire EDM',
    machineCode: 'CNC-005',
    status: 'OFFLINE',
    location: 'Bay 5 - EDM Toolroom',
    manufacturer: 'Mitsubishi Electric',
    model: 'MV2400-S',
    spindleSpeed: 0,
    feedRate: 0,
    temperature: 21.0,
    vibration: 0.001,
    toolWear: 88.0,
    healthScore: 58.0,
    failureProbability: 0.420,
    rulHours: 8.5,
    datasetSource: 'AI4I 2020 / NASA Milling Dataset (failure_model.pkl)',
    aiRecommendation: 'High wire guide wear index. Scheduled preventive overhaul required.',
    activeJob: 'Scheduled Preventive Maintenance',
    efficiency: 78.4,
  },
];

export const INITIAL_CNC_ALERTS = [
  {
    id: 1,
    machineId: 4,
    machineCode: 'CNC-004',
    severity: 'WARNING',
    message: 'High spindle thermal gradient detected (46.8°C)',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    acknowledged: false,
  },
  {
    id: 2,
    machineId: 5,
    machineCode: 'CNC-005',
    severity: 'INFO',
    message: 'Wire electrode spool replacement recommended in 4 hours',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    acknowledged: false,
  },
];

const useMachineStore = create((set, get) => ({
  machines: INITIAL_CNC_MACHINES,
  selectedMachine: INITIAL_CNC_MACHINES[0],
  alerts: INITIAL_CNC_ALERTS,
  jobs: [],
  analytics: null,
  loading: false,
  error: null,

  fetchMachines: async () => {
    set({ loading: true, error: null });
    try {
      const res = await machineApi.getAll();
      if (Array.isArray(res?.data) && res.data.length > 0) {
        set({ machines: res.data, loading: false });
      } else {
        // Fall back gracefully to demo machines if backend returns empty or non-array
        set((state) => ({
          machines: state.machines?.length > 0 ? state.machines : INITIAL_CNC_MACHINES,
          loading: false,
        }));
      }
    } catch (err) {
      // Retain machines and clear error so offline/dev server never produces a blank screen
      set((state) => ({
        machines: state.machines?.length > 0 ? state.machines : INITIAL_CNC_MACHINES,
        loading: false,
        error: null,
      }));
    }
  },

  fetchMachineById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await machineApi.getById(id);
      if (res?.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
        set({ selectedMachine: res.data, loading: false });
      } else {
        const found = get().machines.find((m) => String(m.id) === String(id));
        set({ selectedMachine: found || INITIAL_CNC_MACHINES[0], loading: false });
      }
    } catch (err) {
      const found = get().machines.find((m) => String(m.id) === String(id));
      set({ selectedMachine: found || INITIAL_CNC_MACHINES[0], loading: false });
    }
  },

  createMachine: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await machineApi.create(data);
      const newMachine = res?.data || { ...data, id: Date.now() };
      set((state) => ({
        machines: [...state.machines, newMachine],
        loading: false,
      }));
      return newMachine;
    } catch (err) {
      // Local fallback creation
      const localMachine = { ...data, id: Date.now() };
      set((state) => ({
        machines: [...state.machines, localMachine],
        loading: false,
      }));
      return localMachine;
    }
  },

  updateMachine: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const res = await machineApi.update(id, data);
      const updated = res?.data || { ...data, id };
      set((state) => ({
        machines: state.machines.map((m) => (m.id === id ? { ...m, ...updated } : m)),
        selectedMachine: updated,
        loading: false,
      }));
      return updated;
    } catch (err) {
      set((state) => ({
        machines: state.machines.map((m) => (m.id === id ? { ...m, ...data } : m)),
        selectedMachine: { ...data, id },
        loading: false,
      }));
      return { ...data, id };
    }
  },

  deleteMachine: async (id) => {
    set({ loading: true, error: null });
    try {
      await machineApi.delete(id);
    } catch {
      // Ignore network failure and delete locally
    }
    set((state) => ({
      machines: state.machines.filter((m) => m.id !== id),
      loading: false,
    }));
  },

  fetchAlerts: async () => {
    try {
      const res = await machineApi.getAlerts();
      if (Array.isArray(res?.data) && res.data.length > 0) {
        set({ alerts: res.data });
      } else {
        set((state) => ({
          alerts: state.alerts?.length > 0 ? state.alerts : INITIAL_CNC_ALERTS,
        }));
      }
    } catch {
      // Silently keep default alerts
    }
  },

  fetchJobs: async () => {
    try {
      const res = await machineApi.getJobs();
      if (Array.isArray(res?.data)) {
        set({ jobs: res.data });
      }
    } catch {
      // Silently keep
    }
  },

  clearError: () => set({ error: null }),
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
}));

export default useMachineStore;

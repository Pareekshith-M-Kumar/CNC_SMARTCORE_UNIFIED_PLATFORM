import { Routes, Route } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Dashboard from '../pages/Dashboard';
import MachineMonitoring from '../pages/MachineMonitoring';
import MachineDetails from '../pages/MachineDetails';
import Analytics from '../pages/Analytics';
import PredictiveMaintenance from '../pages/PredictiveMaintenance';
import ToolWear from '../pages/ToolWear';
import JobScheduling from '../pages/JobScheduling';
import Alerts from '../pages/Alerts';
import Settings from '../pages/Settings';
import NotFound from '../pages/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="machines" element={<MachineMonitoring />} />
        <Route path="machines/:id" element={<MachineDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="predictive-maintenance" element={<PredictiveMaintenance />} />
        <Route path="tool-wear" element={<ToolWear />} />
        <Route path="job-scheduling" element={<JobScheduling />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

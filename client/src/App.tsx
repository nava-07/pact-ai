import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import Landing from './pages/Landing'; import Login from './pages/Login'; import Dashboard from './pages/Dashboard'; import Plan from './pages/Plan';
import Pacts from './pages/Pacts'; import Pact from './pages/Pact'; import Ledger from './pages/Ledger'; import LedgerDetail from './pages/LedgerDetail';
import Copilot from './pages/Copilot'; import Profile from './pages/Profile'; import Status from './pages/Status'; import Info from './pages/Info'; import PayReturn, { PayCancel } from './pages/PayReturn';
import Onboarding from './pages/Onboarding'; import Unlock from './pages/Unlock';
import AgentCenter from './pages/AgentCenter'; import Simulator from './pages/Simulator'; import Notifications from './pages/Notifications'; import Analytics from './pages/Analytics'; import SmartShare from './pages/SmartShare';
import { Toast } from './components/ui';
export default function App() {
  return <><Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/onboarding" element={<Onboarding />} /><Route path="/unlock" element={<Unlock />} /><Route path="/info/:slug" element={<Info />} /><Route path="/pay/return" element={<PayReturn />} /><Route path="/pay/cancel" element={<PayCancel />} />
    <Route element={<AppShell />}>
      <Route path="/app" element={<Dashboard />} /><Route path="/plan" element={<Plan />} /><Route path="/pacts" element={<Pacts />} /><Route path="/pacts/:id" element={<Pact />} />
      <Route path="/ledger" element={<Ledger />} /><Route path="/ledger/:id" element={<LedgerDetail />} /><Route path="/copilot" element={<Copilot />} /><Route path="/profile" element={<Profile />} /><Route path="/status" element={<Status />} />
      <Route path="/agent" element={<AgentCenter />} /><Route path="/simulator" element={<Simulator />} /><Route path="/notifications" element={<Notifications />} /><Route path="/analytics" element={<Analytics />} /><Route path="/share" element={<SmartShare />} />
    </Route><Route path="*" element={<Navigate to="/" replace />} /></Routes><Toast /></>;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './features/auth/pages/Login';
import VerifyEmail from './features/auth/pages/VerifyEmail';
import Maintenance from './pages/Maintenance';
import Companies from './features/company/pages/Companies';
import JobOffers from './features/company/pages/JobOffers';
import Kanban from './features/company/pages/Kanban';
import GraduateProfile from './features/graduate/pages/GraduateProfile';
import GraduateExperience from './features/graduate/pages/GraduateExperience';
import GraduateEducation from './features/graduate/pages/GraduateEducation';
import JobBoard from './features/graduate/pages/JobBoard';
import GraduateApplications from './features/graduate/pages/GraduateApplications';
import GraduateSurveys from './features/graduate/pages/GraduateSurveys';
import AdminGraduates from './features/admin/pages/AdminGraduates';
import AdminApplications from './features/admin/pages/AdminApplications';
import AdminSectors from './features/admin/pages/AdminSectors';
import AdminCities from './features/admin/pages/AdminCities';
import AdminPrograms from './features/admin/pages/AdminPrograms';
import AdminUsers from './features/admin/pages/AdminUsers';
import CompanyTalentPool from './features/company/pages/CompanyTalentPool';
import AdminDashboard from './features/admin/pages/AdminDashboard';
import CompanyDashboard from './features/company/pages/CompanyDashboard';
import GraduateDashboard from './features/graduate/pages/GraduateDashboard';
import AdminMatchmaking from './features/admin/pages/AdminMatchmaking';
import AdminSettings from './features/admin/pages/AdminSettings';

const HomeRedirect = () => {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return <Navigate to="/login" replace />;
  const user = JSON.parse(rawUser);
  if (user.role_name === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role_name === 'COMPANY') return <Navigate to="/company/dashboard" replace />;
  if (user.role_name === 'GRADUATE') return <Navigate to="/graduate/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster position="top-center" reverseOrder={false} />
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/mantenimiento" element={<Maintenance />} />

          {/* Solo ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route
              path="/admin/dashboard"
              element={<Layout><AdminDashboard /></Layout>}
            />
            <Route
              path="/admin/settings"
              element={<Layout><AdminSettings /></Layout>}
            />
          </Route>

          {/* Privadas — Módulo 2 (Empresas y Administrador) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'COMPANY']} />}>
            <Route
              path="/companies"
              element={<Layout><Companies /></Layout>}
            />
            <Route
              path="/company/dashboard"
              element={<Layout><CompanyDashboard /></Layout>}
            />
            <Route
              path="/talent-pool"
              element={<Layout><CompanyTalentPool /></Layout>}
            />
            <Route
              path="/job-offers"
              element={<Layout><JobOffers /></Layout>}
            />
            <Route
              path="/kanban"
              element={<Layout><Kanban /></Layout>}
            />
            <Route
              path="/admin/graduates"
              element={<Layout><AdminGraduates /></Layout>}
            />
            <Route
              path="/admin/applications"
              element={<Layout><AdminApplications /></Layout>}
            />
            <Route
              path="/admin/sectors"
              element={<Layout><AdminSectors /></Layout>}
            />
            <Route
              path="/admin/cities"
              element={<Layout><AdminCities /></Layout>}
            />
            <Route
              path="/admin/programs"
              element={<Layout><AdminPrograms /></Layout>}
            />
            <Route
              path="/admin/users"
              element={<Layout><AdminUsers /></Layout>}
            />
            <Route
              path="/admin/matchmaking"
              element={<Layout><AdminMatchmaking /></Layout>}
            />
          </Route>

          {/* Privadas — Módulo 1 (Egresados) */}
          <Route element={<ProtectedRoute allowedRoles={['GRADUATE', 'ADMIN']} />}>
            <Route
              path="/graduate/dashboard"
              element={<Layout><GraduateDashboard /></Layout>}
            />
            <Route
              path="/profile"
              element={<Layout><GraduateProfile /></Layout>}
            />
            <Route
              path="/experience"
              element={<Layout><GraduateExperience /></Layout>}
            />
            <Route
              path="/education"
              element={<Layout><GraduateEducation /></Layout>}
            />
            <Route
              path="/jobs"
              element={<Layout><JobBoard /></Layout>}
            />
            <Route
              path="/applications"
              element={<Layout><GraduateApplications /></Layout>}
            />
            <Route
              path="/surveys"
              element={<Layout><GraduateSurveys /></Layout>}
            />
          </Route>

          {/* Redirige raíz */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
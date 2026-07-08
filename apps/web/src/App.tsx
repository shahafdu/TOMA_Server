import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CatalogPage } from './routes/CatalogPage.js';
import { CourseDetailPage } from './routes/CourseDetailPage.js';
import { DashboardPage } from './routes/DashboardPage.js';
import { EmployeeProfilePage } from './routes/EmployeeProfilePage.js';
import { EmployeesPage } from './routes/EmployeesPage.js';
import { LoginPage } from './routes/LoginPage.js';
import { ProtectedShell } from './routes/ProtectedShell.js';
import { ColorModeProvider } from './ui/colorMode.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:id" element={<CourseDetailPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/:id" element={<EmployeeProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ColorModeProvider>
    </QueryClientProvider>
  );
}

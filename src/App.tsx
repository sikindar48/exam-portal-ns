import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";

// Pages
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import JoinTest from "./pages/JoinTest";
import SuperAdminDashboard from "./pages/SuperAdmin/Dashboard";
import ClientsManagement from "./pages/SuperAdmin/Clients";
import ClientAdminDashboard from "./pages/ClientAdmin/Dashboard";
import StudentsManagement from "./pages/ClientAdmin/Students";
import QuestionsManagement from "./pages/ClientAdmin/Questions";
import TestsManagement from "./pages/ClientAdmin/Tests";
import TestBuilder from "./pages/ClientAdmin/TestBuilder";
import ClientSettings from "./pages/ClientAdmin/Settings";
import StudentDashboard from "./pages/Student/Dashboard";
import TestEngine from "./pages/Student/TestEngine";
import TestHistory from "./pages/Student/History";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="exam-portal-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/exam-portal-ns">
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/auth" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/join/:code" element={<JoinTest />} />
              <Route path="/join" element={<JoinTest />} />

              {/* Super Admin Routes */}
              <Route
                path="/superadmin"
                element={
                  <ProtectedRoute allowedRoles={["superadmin"]}>
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/superadmin/clients"
                element={
                  <ProtectedRoute allowedRoles={["superadmin"]}>
                    <ClientsManagement />
                  </ProtectedRoute>
                }
              />

              {/* Client Admin Routes */}
              <Route
                path="/client-admin"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <ClientAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/students"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <StudentsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/questions"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <QuestionsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/tests"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <TestsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/tests/builder"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <TestBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/tests/builder/:testId"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <TestBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client-admin/settings"
                element={
                  <ProtectedRoute allowedRoles={["clientadmin"]}>
                    <ClientSettings />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/test/:testId"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <TestEngine />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/history"
                element={
                  <ProtectedRoute allowedRoles={["student"]}>
                    <TestHistory />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

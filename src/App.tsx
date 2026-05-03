import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./components/theme-provider";
import { Suspense, lazy } from "react";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const JoinTest = lazy(() => import("./pages/JoinTest"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Super Admin Pages
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdmin/Dashboard"));
const ClientsManagement = lazy(() => import("./pages/SuperAdmin/Clients"));

// Client Admin Pages
const ClientAdminDashboard = lazy(
  () => import("./pages/ClientAdmin/Dashboard"),
);
const StudentsManagement = lazy(() => import("./pages/ClientAdmin/Students"));
const QuestionsManagement = lazy(() => import("./pages/ClientAdmin/Questions"));
const TestsManagement = lazy(() => import("./pages/ClientAdmin/Tests"));
const TestBuilder = lazy(() => import("./pages/ClientAdmin/TestBuilder"));
const ClientSettings = lazy(() => import("./pages/ClientAdmin/Settings"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/Student/Dashboard"));
const TestEngine = lazy(() => import("./pages/Student/TestEngine"));
const TestHistory = lazy(() => import("./pages/Student/History"));

const queryClient = new QueryClient();

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="exam-portal-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Landing />} />
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
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

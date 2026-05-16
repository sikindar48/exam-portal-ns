import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Protected } from "./components/Auth/Protected";
import { Provider } from "./components/Theme/Provider";
import { Suspense, lazy } from "react";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home/Page"));
const Auth = lazy(() => import("./pages/Auth/Page"));
const Forgot = lazy(() => import("./pages/Auth/Forgot"));
const Reset = lazy(() => import("./pages/Auth/Reset"));
const Join = lazy(() => import("./pages/Test/Join"));
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
const Builder = lazy(() => import("./pages/ClientAdmin/Builder"));
const Results = lazy(() => import("./pages/ClientAdmin/Results"));
const ClientSettings = lazy(() => import("./pages/ClientAdmin/Settings"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/Student/Dashboard"));
const Engine = lazy(() => import("./pages/Student/Engine"));
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
    <Provider defaultTheme="system" storageKey="exam-portal-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<Forgot />} />
                <Route path="/reset-password" element={<Reset />} />
                <Route path="/join/:code" element={<Join />} />
                <Route path="/join" element={<Join />} />

                {/* Super Admin Routes */}
                <Route
                  path="/superadmin"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminDashboard />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/clients"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <ClientsManagement />
                    </Protected>
                  }
                />

                {/* Client Admin Routes */}
                <Route
                  path="/client-admin"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <ClientAdminDashboard />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/students"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <StudentsManagement />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/questions"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <QuestionsManagement />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/tests"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <TestsManagement />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/tests/builder"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <Builder />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/tests/builder/:testId"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <Builder />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/tests/:testId/results"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <Results />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/settings"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <ClientSettings />
                    </Protected>
                  }
                />

                {/* Student Routes */}
                <Route
                  path="/student"
                  element={
                    <Protected allowedRoles={["student"]}>
                      <StudentDashboard />
                    </Protected>
                  }
                />
                <Route
                  path="/student/test/:testId"
                  element={
                    <Protected allowedRoles={["student"]}>
                      <Engine />
                    </Protected>
                  }
                />
                <Route
                  path="/student/history"
                  element={
                    <Protected allowedRoles={["student"]}>
                      <TestHistory />
                    </Protected>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </Provider>
  </QueryClientProvider>
);

export default App;

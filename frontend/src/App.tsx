import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Protected } from "./components/Auth/Protected";
import { Provider } from "./components/Theme/Provider";
import { Suspense, lazy } from "react";
import { GlobalAnnouncementBanner } from "./components/Brand/GlobalAnnouncementBanner";

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
const SuperAdminSecurity = lazy(() => import("./pages/SuperAdmin/Security"));
const SuperAdminSettings = lazy(() => import("./pages/SuperAdmin/Settings"));
const SuperAdminSubscriptions = lazy(() => import("./pages/SuperAdmin/Subscriptions"));
const SuperAdminAuditLogs = lazy(() => import("./pages/SuperAdmin/AuditLogs"));
const SuperAdminClientSettings = lazy(() => import("./pages/SuperAdmin/ClientSettings"));
const SuperAdminFeedbacks = lazy(() => import("./pages/SuperAdmin/Feedbacks"));
const Suspended = lazy(() => import("./pages/Suspended"));

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
const ProctoringLogs = lazy(() => import("./pages/ClientAdmin/ProctoringLogs"));
const Analytics = lazy(() => import("./pages/ClientAdmin/Analytics"));
const Subscription = lazy(() => import("./pages/ClientAdmin/Subscription"));
const PackageSelection = lazy(() => import("./pages/ClientAdmin/PackageSelection"));
const SuperAdminPackages = lazy(() => import("./pages/SuperAdmin/Packages"));
const SuperAdminPackagesRequests = lazy(() => import("./pages/SuperAdmin/PackagesRequests"));
const SuperAdminSubscriptionRequests = lazy(() => import("./pages/SuperAdmin/SubscriptionRequests"));
const ClientAdminPlans = lazy(() => import("./pages/ClientAdmin/Plans"));

// Student Pages
const StudentDashboard = lazy(() => import("./pages/Student/Dashboard"));
const Engine = lazy(() => import("./pages/Student/Engine"));
const TestHistory = lazy(() => import("./pages/Student/History"));
const Review = lazy(() => import("./pages/Student/Review"));
const SubmitSuccess = lazy(() => import("./pages/Student/SubmitSuccess"));

const queryClient = new QueryClient();

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Provider defaultTheme="light" storageKey="exam-portal-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <GlobalAnnouncementBanner />
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<Forgot />} />
                <Route path="/reset-password" element={<Reset />} />
                <Route path="/join/:code" element={<Join />} />
                <Route path="/join" element={<Join />} />
                <Route path="/suspended" element={<Suspended />} />

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
                <Route
                  path="/superadmin/clients/setting"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminClientSettings />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/security"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminSecurity />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/settings"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminSettings />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/packages"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminPackages />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/packages-requests"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminPackagesRequests />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/subscription-requests"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminSubscriptionRequests />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/subscriptions"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminSubscriptions />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/audit-logs"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminAuditLogs />
                    </Protected>
                  }
                />
                <Route
                  path="/superadmin/feedbacks"
                  element={
                    <Protected allowedRoles={["superadmin"]}>
                      <SuperAdminFeedbacks />
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
                  path="/client-admin/proctoring"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <ProctoringLogs />
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
                <Route
                  path="/client-admin/analytics"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <Analytics />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/subscription"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <Subscription />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/subscription/packages"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <PackageSelection />
                    </Protected>
                  }
                />
                <Route
                  path="/client-admin/subscription/plans"
                  element={
                    <Protected allowedRoles={["clientadmin"]}>
                      <ClientAdminPlans />
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
                <Route
                  path="/student/review/:attemptId"
                  element={
                    <Protected allowedRoles={["student"]}>
                      <Review />
                    </Protected>
                  }
                />
                <Route
                  path="/student/submit-success"
                  element={<SubmitSuccess />}
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

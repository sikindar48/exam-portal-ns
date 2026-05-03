import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import ErrorBoundary from "./ErrorBoundary";

// Simple test pages
function TestAuth() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>🔐 Auth Page</h1>
      <p>This is the auth page - React Router is working!</p>
      <div
        style={{ marginTop: "20px", padding: "10px", background: "#f0f0f0" }}
      >
        <h3>Debug Info:</h3>
        <p>Current URL: {window.location.href}</p>
        <p>Pathname: {window.location.pathname}</p>
        <p>Environment: {import.meta.env.MODE}</p>
      </div>
    </div>
  );
}

function TestNotFound() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>❌ 404 - Page Not Found</h1>
      <p>The requested page was not found.</p>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Disable retries for debugging
    },
  },
});

const App = () => {
  console.log("App component rendering...");
  console.log("Environment:", import.meta.env.MODE);
  console.log("Base URL:", import.meta.env.BASE_URL);

  try {
    return (
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="exam-portal-theme">
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename="/">
                <div
                  style={{
                    minHeight: "100vh",
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    padding: "20px",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "800px",
                      margin: "0 auto",
                      background: "rgba(255,255,255,0.1)",
                      padding: "40px",
                      borderRadius: "10px",
                    }}
                  >
                    <h1 style={{ fontSize: "2.5rem", marginBottom: "20px" }}>
                      🎓 Exam Portal - Debug Mode
                    </h1>

                    <Routes>
                      <Route
                        path="/"
                        element={<Navigate to="/auth" replace />}
                      />
                      <Route path="/auth" element={<TestAuth />} />
                      <Route path="*" element={<TestNotFound />} />
                    </Routes>

                    <div
                      style={{
                        marginTop: "30px",
                        padding: "20px",
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                      }}
                    >
                      <h3>🔧 System Status:</h3>
                      <ul style={{ listStyle: "none", padding: 0 }}>
                        <li>✅ React: Working</li>
                        <li>✅ React Router: Working</li>
                        <li>✅ Vite Build: Working</li>
                        <li>✅ Vercel Deploy: Working</li>
                        <li>✅ Error Boundary: Active</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Error in App component:", error);
    return (
      <div style={{ padding: "20px", background: "#fee", color: "#d00" }}>
        <h1>Critical Error in App Component</h1>
        <pre>{String(error)}</pre>
      </div>
    );
  }
};

export default App;

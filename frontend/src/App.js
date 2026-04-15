import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "@/pages/LandingPage";
import AuditPage from "@/pages/AuditPage";
import AuditResultsPage from "@/pages/AuditResultsPage";
import PlanSelectionPage from "@/pages/PlanSelectionPage";
import OnboardingWizard from "@/pages/OnboardingWizard";
import ConfirmationPage from "@/pages/ConfirmationPage";
import StatusPage from "@/pages/StatusPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminSubmissionDetail from "@/pages/AdminSubmissionDetail";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/audit/:auditId" element={<AuditResultsPage />} />
            <Route path="/plans" element={<PlanSelectionPage />} />
            <Route path="/onboarding/:sessionId" element={<OnboardingWizard />} />
            <Route path="/confirmation/:submissionId" element={<ConfirmationPage />} />
            <Route path="/status/:submissionId" element={<StatusPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/submissions/:id" element={<ProtectedRoute><AdminSubmissionDetail /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

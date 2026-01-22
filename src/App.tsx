import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import Index from "./pages/Index";
import About from "./pages/About";
import Programme from "./pages/Programme";
import Admissions from "./pages/Admissions";
import ApplicationForm from "./pages/ApplicationForm";
import Impact from "./pages/Impact";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Partners from "./pages/Partners";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import CheckStatus from "./pages/CheckStatus";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminBlogManagement from "./pages/admin/AdminBlogManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminCertificates from "./pages/admin/AdminCertificates";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AdminAuthProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/programme" element={<Programme />} />
              <Route path="/admissions" element={<Admissions />} />
              <Route path="/apply" element={<ApplicationForm />} />
              <Route path="/impact" element={<Impact />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/check-status" element={<CheckStatus />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/reset-password" element={<AdminResetPassword />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute moduleKey="dashboard">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute moduleKey="dashboard">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/applications"
                element={
                  <ProtectedRoute moduleKey="applications">
                    <AdminApplications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute moduleKey="users">
                    <AdminManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute moduleKey="analytics">
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/blog"
                element={
                  <ProtectedRoute moduleKey="blog">
                    <AdminBlogManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute moduleKey="settings">
                    <AdminSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-log"
                element={
                  <ProtectedRoute moduleKey="audit-log">
                    <AdminAuditLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/email-templates"
                element={
                  <ProtectedRoute moduleKey="email-templates">
                    <AdminEmailTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/permissions"
                element={
                  <ProtectedRoute moduleKey="permissions">
                    <AdminPermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/certificates"
                element={
                  <ProtectedRoute moduleKey="certificates">
                    <AdminCertificates />
                  </ProtectedRoute>
                }
              />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AdminAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

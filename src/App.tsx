import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { lazy, Suspense } from "react";

// Eagerly load the landing page for fast first paint
import Index from "./pages/Index";

// Lazy-load all other pages
const About = lazy(() => import("./pages/About"));
const Programme = lazy(() => import("./pages/Programme"));
const Admissions = lazy(() => import("./pages/Admissions"));
const ApplicationForm = lazy(() => import("./pages/ApplicationForm"));
const Impact = lazy(() => import("./pages/Impact"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Partners = lazy(() => import("./pages/Partners"));
const Contact = lazy(() => import("./pages/Contact"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CheckStatus = lazy(() => import("./pages/CheckStatus"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminApplications = lazy(() => import("./pages/admin/AdminApplications"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminBlogManagement = lazy(() => import("./pages/admin/AdminBlogManagement"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminResetPassword = lazy(() => import("./pages/admin/AdminResetPassword"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/AdminEmailTemplates"));
const AdminPermissions = lazy(() => import("./pages/admin/AdminPermissions"));
const AdminCertificates = lazy(() => import("./pages/admin/AdminCertificates"));
const AdminMessageTemplates = lazy(() => import("./pages/admin/AdminMessageTemplates"));
const AdminMessageCenter = lazy(() => import("./pages/admin/AdminMessageCenter"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminTestimonials = lazy(() => import("./pages/admin/AdminTestimonials"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const AdminEmailLogs = lazy(() => import("./pages/admin/AdminEmailLogs"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks"));

const queryClient = new QueryClient();

// Minimal loading fallback
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AdminAuthProvider>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/faq" element={<FAQ />} />
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/reset-password" element={<AdminResetPassword />} />
                <Route
                  path="/admin"
                  element={<ProtectedRoute moduleKey="dashboard"><AdminDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/admin/dashboard"
                  element={<ProtectedRoute moduleKey="dashboard"><AdminDashboard /></ProtectedRoute>}
                />
                <Route
                  path="/admin/applications"
                  element={<ProtectedRoute moduleKey="applications"><AdminApplications /></ProtectedRoute>}
                />
                <Route
                  path="/admin/users"
                  element={<ProtectedRoute moduleKey="users"><AdminManagement /></ProtectedRoute>}
                />
                <Route
                  path="/admin/analytics"
                  element={<ProtectedRoute moduleKey="analytics"><AdminAnalytics /></ProtectedRoute>}
                />
                <Route
                  path="/admin/blog"
                  element={<ProtectedRoute moduleKey="blog"><AdminBlogManagement /></ProtectedRoute>}
                />
                <Route
                  path="/admin/settings"
                  element={<ProtectedRoute moduleKey="settings"><AdminSettings /></ProtectedRoute>}
                />
                <Route
                  path="/admin/audit-log"
                  element={<ProtectedRoute moduleKey="audit-log"><AdminAuditLog /></ProtectedRoute>}
                />
                <Route
                  path="/admin/email-templates"
                  element={<ProtectedRoute moduleKey="email-templates"><AdminEmailTemplates /></ProtectedRoute>}
                />
                <Route
                  path="/admin/permissions"
                  element={<ProtectedRoute moduleKey="permissions"><AdminPermissions /></ProtectedRoute>}
                />
                <Route
                  path="/admin/certificates"
                  element={<ProtectedRoute moduleKey="certificates"><AdminCertificates /></ProtectedRoute>}
                />
                <Route
                  path="/admin/message-templates"
                  element={<ProtectedRoute moduleKey="message-templates"><AdminMessageTemplates /></ProtectedRoute>}
                />
                <Route
                  path="/admin/message-center"
                  element={<ProtectedRoute moduleKey="message-center"><AdminMessageCenter /></ProtectedRoute>}
                />
                <Route
                  path="/admin/chat"
                  element={<ProtectedRoute moduleKey="chat"><AdminChat /></ProtectedRoute>}
                />
                <Route
                  path="/admin/reports"
                  element={<ProtectedRoute moduleKey="reports"><AdminReports /></ProtectedRoute>}
                />
                <Route
                  path="/admin/testimonials"
                  element={<ProtectedRoute moduleKey="testimonials"><AdminTestimonials /></ProtectedRoute>}
                />
                <Route
                  path="/admin/subscribers"
                  element={<ProtectedRoute moduleKey="subscribers"><AdminSubscribers /></ProtectedRoute>}
                />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AdminAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

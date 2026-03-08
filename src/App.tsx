import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ScrollToTop } from "./components/ScrollToTop";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { SchoolAuthProvider } from "./contexts/SchoolAuthContext";
import { PortalAuthProvider } from "./contexts/PortalAuthContext";
import { ProtectedRoute } from "./components/admin/ProtectedRoute";
import { SchoolProtectedRoute } from "./components/school/SchoolProtectedRoute";
import { PortalProtectedRoute } from "./components/portal/PortalProtectedRoute";
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

// Admin pages
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
const AdminSchools = lazy(() => import("./pages/admin/AdminSchools"));
const AdminMarketplace = lazy(() => import("./pages/admin/AdminMarketplace"));

// School portal pages
const SchoolLogin = lazy(() => import("./pages/school/SchoolLogin"));
const SchoolResetPassword = lazy(() => import("./pages/school/SchoolResetPassword"));
const SchoolDashboard = lazy(() => import("./pages/school/SchoolDashboard"));
const SchoolAttendance = lazy(() => import("./pages/school/SchoolAttendance"));
const SchoolClasses = lazy(() => import("./pages/school/SchoolClasses"));
const SchoolStudents = lazy(() => import("./pages/school/SchoolStudents"));
const SchoolStaff = lazy(() => import("./pages/school/SchoolStaff"));
const SchoolAbsenceRequests = lazy(() => import("./pages/school/SchoolAbsenceRequests"));
const SchoolReports = lazy(() => import("./pages/school/SchoolReports"));
const SchoolLinkRequests = lazy(() => import("./pages/school/SchoolLinkRequests"));

// General portal pages
const PortalLogin = lazy(() => import("./pages/portal/PortalLogin"));
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalAttendance = lazy(() => import("./pages/portal/PortalAttendance"));
const PortalAbsenceRequest = lazy(() => import("./pages/portal/PortalAbsenceRequest"));
const PortalMyChildren = lazy(() => import("./pages/portal/PortalMyChildren"));
const PortalMyClasses = lazy(() => import("./pages/portal/PortalMyClasses"));
const PortalECard = lazy(() => import("./pages/portal/PortalECard"));
const PortalReports = lazy(() => import("./pages/portal/PortalReports"));
const PortalMarketplace = lazy(() => import("./pages/portal/PortalMarketplace"));

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
            <SchoolAuthProvider>
              <PortalAuthProvider>
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
                    <Route path="/admin" element={<ProtectedRoute moduleKey="dashboard"><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/dashboard" element={<ProtectedRoute moduleKey="dashboard"><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/applications" element={<ProtectedRoute moduleKey="applications"><AdminApplications /></ProtectedRoute>} />
                    <Route path="/admin/users" element={<ProtectedRoute moduleKey="users"><AdminManagement /></ProtectedRoute>} />
                    <Route path="/admin/analytics" element={<ProtectedRoute moduleKey="analytics"><AdminAnalytics /></ProtectedRoute>} />
                    <Route path="/admin/blog" element={<ProtectedRoute moduleKey="blog"><AdminBlogManagement /></ProtectedRoute>} />
                    <Route path="/admin/settings" element={<ProtectedRoute moduleKey="settings"><AdminSettings /></ProtectedRoute>} />
                    <Route path="/admin/audit-log" element={<ProtectedRoute moduleKey="audit-log"><AdminAuditLog /></ProtectedRoute>} />
                    <Route path="/admin/email-templates" element={<ProtectedRoute moduleKey="email-templates"><AdminEmailTemplates /></ProtectedRoute>} />
                    <Route path="/admin/permissions" element={<ProtectedRoute moduleKey="permissions"><AdminPermissions /></ProtectedRoute>} />
                    <Route path="/admin/certificates" element={<ProtectedRoute moduleKey="certificates"><AdminCertificates /></ProtectedRoute>} />
                    <Route path="/admin/message-templates" element={<ProtectedRoute moduleKey="message-templates"><AdminMessageTemplates /></ProtectedRoute>} />
                    <Route path="/admin/message-center" element={<ProtectedRoute moduleKey="message-center"><AdminMessageCenter /></ProtectedRoute>} />
                    <Route path="/admin/chat" element={<ProtectedRoute moduleKey="chat"><AdminChat /></ProtectedRoute>} />
                    <Route path="/admin/reports" element={<ProtectedRoute moduleKey="reports"><AdminReports /></ProtectedRoute>} />
                    <Route path="/admin/testimonials" element={<ProtectedRoute moduleKey="testimonials"><AdminTestimonials /></ProtectedRoute>} />
                    <Route path="/admin/subscribers" element={<ProtectedRoute moduleKey="subscribers"><AdminSubscribers /></ProtectedRoute>} />
                    <Route path="/admin/email-logs" element={<ProtectedRoute moduleKey="email-logs"><AdminEmailLogs /></ProtectedRoute>} />
                    <Route path="/admin/webhooks" element={<ProtectedRoute moduleKey="webhooks"><AdminWebhooks /></ProtectedRoute>} />
                    <Route path="/admin/schools" element={<ProtectedRoute moduleKey="schools"><AdminSchools /></ProtectedRoute>} />
                    <Route path="/admin/marketplace" element={<ProtectedRoute moduleKey="marketplace"><AdminMarketplace /></ProtectedRoute>} />

                    {/* School Portal Routes */}
                    <Route path="/school/login" element={<SchoolLogin />} />
                    <Route path="/school/reset-password" element={<SchoolResetPassword />} />
                    <Route path="/school/dashboard" element={<SchoolProtectedRoute><SchoolDashboard /></SchoolProtectedRoute>} />
                    <Route path="/school/attendance" element={<SchoolProtectedRoute><SchoolAttendance /></SchoolProtectedRoute>} />
                    <Route path="/school/classes" element={<SchoolProtectedRoute><SchoolClasses /></SchoolProtectedRoute>} />
                    <Route path="/school/students" element={<SchoolProtectedRoute><SchoolStudents /></SchoolProtectedRoute>} />
                    <Route path="/school/staff" element={<SchoolProtectedRoute><SchoolStaff /></SchoolProtectedRoute>} />
                    <Route path="/school/absence-requests" element={<SchoolProtectedRoute><SchoolAbsenceRequests /></SchoolProtectedRoute>} />
                    <Route path="/school/reports" element={<SchoolProtectedRoute><SchoolReports /></SchoolProtectedRoute>} />
                    <Route path="/school/link-requests" element={<SchoolProtectedRoute><SchoolLinkRequests /></SchoolProtectedRoute>} />

                    {/* General Portal Routes */}
                    <Route path="/portal/login" element={<PortalLogin />} />
                    <Route path="/portal/dashboard" element={<PortalProtectedRoute><PortalDashboard /></PortalProtectedRoute>} />
                    <Route path="/portal/attendance" element={<PortalProtectedRoute><PortalAttendance /></PortalProtectedRoute>} />
                    <Route path="/portal/absence-request" element={<PortalProtectedRoute><PortalAbsenceRequest /></PortalProtectedRoute>} />
                    <Route path="/portal/my-children" element={<PortalProtectedRoute><PortalMyChildren /></PortalProtectedRoute>} />
                    <Route path="/portal/my-classes" element={<PortalProtectedRoute><PortalMyClasses /></PortalProtectedRoute>} />
                    <Route path="/portal/e-card" element={<PortalProtectedRoute><PortalECard /></PortalProtectedRoute>} />
                    <Route path="/portal/reports" element={<PortalProtectedRoute><PortalReports /></PortalProtectedRoute>} />
                    <Route path="/portal/marketplace" element={<PortalProtectedRoute><PortalMarketplace /></PortalProtectedRoute>} />
                    
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </PortalAuthProvider>
            </SchoolAuthProvider>
          </AdminAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;

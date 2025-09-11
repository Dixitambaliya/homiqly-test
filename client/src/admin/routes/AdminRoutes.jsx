import { Routes, Route, Navigate } from "react-router-dom";
import { useAdminAuth } from "../contexts/AdminAuthContext";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

// Pages
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import Dashboard from "../pages/Dashboard";
import Vendors from "../pages/Vendors";
import Users from "../pages/Users";
import Services from "../pages/Services";
import Bookings from "../pages/Bookings";
import SupplyKits from "../pages/SupplyKits";
import Contractors from "../pages/Contractors";
import Employees from "../pages/Employees";
import Payments from "../pages/Payments";
import Analytics from "../pages/Analytics";
import Notifications from "../pages/Notifications";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import Packages from "../pages/Packages";
import Tickets from "../pages/Tickets";
import BookingDetailsPage from "../pages/subpages/BookingDetailsPage";
import PlatformFees from "../pages/subpages/PlatformFees";
import GeneralSettings from "../pages/subpages/GeneralSettings";
import UserRating from "../pages/UserRating";
import VendorRating from "../pages/VendorRating";
import PackageRating from "../pages/PackageRating";
import PaymentDetails from "../pages/subpages/PaymentDetails";
import ServiceCities from "../pages/subpages/ServiceCities";
import VendorApplications from "../pages/VendorApplications";
import VendorApplicationDetails from "../pages/subpages/VendorApplicationDetails";
import { Loader, Loader2 } from "lucide-react";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2">
        <Loader2 className="animate-spin" />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />;
  }

  return children;
};

const AdminRoutes = () => {
  const { isAuthenticated } = useAdminAuth();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route
          index
          element={
            isAuthenticated ? <Navigate to="/admin/dashboard" /> : <Login />
          }
        />
        <Route
          path="login"
          element={
            isAuthenticated ? <Navigate to="/admin/dashboard" /> : <Login />
          }
        />
        <Route path="forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* Dashboard Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="users" element={<Users />} />
        <Route path="services" element={<Services />} />
        <Route path="packages" element={<Packages />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="supply-kits" element={<SupplyKits />} />
        <Route path="contractors" element={<Contractors />} />
        <Route path="employees" element={<Employees />} />
        <Route path="vendor-applications" element={<VendorApplications />} />
        <Route
          path="vendor-applications/:id"
          element={<VendorApplicationDetails />}
        />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:paymentId" element={<PaymentDetails />} />
        <Route path="analytics" element={<Analytics />} />
        {/* <Route path="rating" element={<UserRating />} /> */}
        <Route path="rating/user" element={<UserRating />} />
        <Route path="rating/vendor" element={<VendorRating />} />
        <Route path="rating/package" element={<PackageRating />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/platform-fees" element={<PlatformFees />} />
        <Route path="settings/general" element={<GeneralSettings />} />
        <Route path="settings/city" element={<ServiceCities />} />
        <Route path="tickets" element={<Tickets />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};

export default AdminRoutes;

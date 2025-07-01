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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAdminAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
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
        <Route path="bookings" element={<Bookings />} />
        <Route path="supply-kits" element={<SupplyKits />} />
        <Route path="contractors" element={<Contractors />} />
        <Route path="employees" element={<Employees />} />
        <Route path="payments" element={<Payments />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};

export default AdminRoutes;
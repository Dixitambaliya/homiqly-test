import { Routes, Route, Navigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

// Pages
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import Services from "../pages/Services";
import Bookings from "../pages/Bookings";
import Calendar from "../pages/Calendar";
import SupplyKits from "../pages/SupplyKits";
import Payments from "../pages/Payments";
import Ratings from "../pages/Ratings";
import Settings from "../pages/Settings";
import SupportForm from "../pages/SupportForm";
import Employees from "../pages/Employees";
import PaymentDetails from "../pages/subpages/PaymentDetails";
import BookingDetailsPage from "../pages/subpages/BookingDetailsPage";
import AccountDetails from "../pages/AccountDetails";
import LoadingSlider from "../../shared/components/LoadingSpinner";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useVendorAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSlider />{" "}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/vendor/login" />;
  }

  return children;
};

const VendorRoutes = () => {
  const { isAuthenticated } = useVendorAuth();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route
          index
          element={
            isAuthenticated ? <Navigate to="/vendor/dashboard" /> : <Login />
          }
        />
        <Route
          path="login"
          element={
            isAuthenticated ? <Navigate to="/vendor/dashboard" /> : <Login />
          }
        />
        <Route
          path="register"
          element={
            isAuthenticated ? <Navigate to="/vendor/dashboard" /> : <Register />
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
        <Route path="profile" element={<Profile />} />
        <Route path="services" element={<Services />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="supply-kits" element={<SupplyKits />} />
        <Route path="employees" element={<Employees />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payments/:paymentId" element={<PaymentDetails />} />
        <Route path="ratings" element={<Ratings />} />
        <Route path="settings" element={<Settings />} />
        <Route path="accountdetails" element={<AccountDetails />} />
        <Route path="support" element={<SupportForm />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/vendor" />} />
    </Routes>
  );
};

export default VendorRoutes;

import { Routes, Route, Navigate } from "react-router-dom";
import { useEmployeesAuth } from "../contexts/EmployeesAuthContext";

// Layouts
import DashboardLayout from "../layouts/DashboardLayout";
import AuthLayout from "../layouts/AuthLayout";

// Pages
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import Dashboard from "../pages/Dashboard";
// import Vendors from "../pages/Vendors";
// import Users from "../pages/Users";
// import Services from "../pages/Services";
import Bookings from "../pages/Bookings";
import Profile from "../pages/Profile";
import Calendar from "../pages/Calendar";
import BookingDetailsPage from "../pages/subpages/BookingDetailsPage";
import WorkHistory from "../pages/WorkHistory";
import WorkHistoryDetails from "../pages/subpages/WorkHistoryDetails";
import { Loader, Loader2 } from "lucide-react";
// import SupplyKits from "../pages/SupplyKits";
// import Contractors from "../pages/Contractors";
// import Employees from "../pages/Employees";
// import Payments from "../pages/Payments";
// import Analytics from "../pages/Analytics";
// import Notifications from "../pages/Notifications";
// import Profile from "../pages/Profile";
// import Settings from "../pages/Settings";
// import Packages from "../pages/Packages";
// import Tickets from "../pages/Tickets";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useEmployeesAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2">
        <Loader2 className="animate-spin" />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/employees/login" />;
  }

  return children;
};

const EmployeesRoutes = () => {
  const { isAuthenticated } = useEmployeesAuth();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route
          index
          element={
            isAuthenticated ? <Navigate to="/employees/dashboard" /> : <Login />
          }
        />
        <Route
          path="login"
          element={
            isAuthenticated ? <Navigate to="/employees/dashboard" /> : <Login />
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
        <Route path="bookings" element={<Bookings />} />
        <Route path="bookings/:bookingId" element={<BookingDetailsPage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="workhistory" element={<WorkHistory />} />
        <Route path="workhistory/:bookingId" element={<WorkHistoryDetails />} />
        {/* <Route path="vendors" element={<Vendors />} />
        <Route path="users" element={<Users />} />
        <Route path="services" element={<Services />} />
        <Route path="packages" element={<Packages />} />
        <Route path="supply-kits" element={<SupplyKits />} />
        <Route path="contractors" element={<Contractors />} />
        <Route path="employees" element={<Employees />} />
        <Route path="payments" element={<Payments />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="tickets" element={<Tickets />} /> */}
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/employees" />} />
    </Routes>
  );
};

export default EmployeesRoutes;

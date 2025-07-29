import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Routes
import AdminRoutes from "./admin/routes/AdminRoutes";
import VendorRoutes from "./vendor/routes/VendorRoutes";

// Auth Providers
import { AdminAuthProvider } from "./admin/contexts/AdminAuthContext";
import { VendorAuthProvider } from "./vendor/contexts/VendorAuthContext";
import { EmployeesAuthProvider } from "./employees/contexts/EmployeesAuthContext";
import EmployeesRoutes from "./employees/routes/EmployeesRoutes";

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <AdminAuthProvider>
              <AdminRoutes />
            </AdminAuthProvider>
          }
        />
        {/* Vendor Routes */}
        <Route
          path="/vendor/*"
          element={
            <VendorAuthProvider>
              <VendorRoutes />
            </VendorAuthProvider>
          }
        />
        {/* Employees Routes */}
        <Route
          path="/employees/*"
          element={
            <EmployeesAuthProvider>
              <EmployeesRoutes />
            </EmployeesAuthProvider>
          }
        />
        '{/* Redirect root to admin by default */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Slide}
      />
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Routes
import AdminRoutes from './admin/routes/AdminRoutes';
import VendorRoutes from './vendor/routes/VendorRoutes';

// Auth Providers
import { AdminAuthProvider } from './admin/contexts/AdminAuthContext';
import { VendorAuthProvider } from './vendor/contexts/VendorAuthContext';

function App() {
  return (
    <Router>
      <Routes>
        {/* Admin Routes */}
        <Route path="/admin/*" element={
          <AdminAuthProvider>
            <AdminRoutes />
          </AdminAuthProvider>
        } />

        {/* Vendor Routes */}
        <Route path="/vendor/*" element={
          <VendorAuthProvider>
            <VendorRoutes />
          </VendorAuthProvider>
        } />

        {/* Redirect root to admin by default */}
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
      />
    </Router>
  );
}

export default App;
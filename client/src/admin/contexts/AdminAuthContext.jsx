import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { requestFCMToken } from "../../firebase/firebase";

const AdminAuthContext = createContext();

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState("");

  useEffect(() => {
    // Check if admin is logged in on mount
    const token = localStorage.getItem("adminToken");
    const userData = localStorage.getItem("adminData");

    if (token && userData) {
      setCurrentUser(JSON.parse(userData));
      setIsAuthenticated(true);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    requestFCMToken().then((token) => {
      if (token) setFcmToken(token);
    });
  }, []);

  const login = async (email, password, fcmToken) => {
    try {
      setError(null);
      const response = await axios.post("/api/admin/login", {
        email,
        password,
        fcmToken,
      });

      const { token, admin_id, name, role } = response.data;

      const userData = { admin_id, name, role };

      localStorage.setItem("adminToken", token);
      localStorage.setItem("adminData", JSON.stringify(userData));

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setCurrentUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
      return {
        success: false,
        error: err.response?.data?.error || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminData");
    delete axios.defaults.headers.common["Authorization"];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      await axios.post("/api/admin/requestreset", { email });
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send reset code");
      return {
        success: false,
        error: err.response?.data?.error || "Failed to send reset code",
      };
    }
  };

  const verifyResetCode = async (email, resetCode) => {
    try {
      setError(null);
      const response = await axios.post("/api/admin/verifyresetcode", {
        email,
        resetCode,
      });
      return { success: true, token: response.data.token };
    } catch (err) {
      setError(err.response?.data?.error || "Invalid code");
      return {
        success: false,
        error: err.response?.data?.error || "Invalid code",
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setError(null);
      await axios.post(
        "/api/admin/resetpassword",
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
      return {
        success: false,
        error: err.response?.data?.error || "Failed to reset password",
      };
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

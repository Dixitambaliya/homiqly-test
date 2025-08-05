import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { requestFCMToken } from "../../firebase/firebase";

const VendorAuthContext = createContext();

export const useVendorAuth = () => useContext(VendorAuthContext);

export const VendorAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState("");

  useEffect(() => {
    // Check if vendor is logged in on mount
    const token = localStorage.getItem("vendorToken");
    const userData = localStorage.getItem("vendorData");

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

  const login = async (email, password) => {
    try {
      setError(null);

      const response = await axios.post("/api/vendor/login", {
        email,
        password,
        fcmToken, // directly using from state
      });

      const { token, vendor_id, vendor_type, name, role } = response.data;

      const userData = { vendor_id, vendor_type, name, role };

      localStorage.setItem("vendorToken", token);
      localStorage.setItem("vendorData", JSON.stringify(userData));

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

  const register = async (formData) => {
    try {
      setError(null);
      const response = await axios.post("/api/vendor/register", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
      return {
        success: false,
        error: err.response?.data?.error || "Registration failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("vendorToken");
    localStorage.removeItem("vendorData");
    delete axios.defaults.headers.common["Authorization"];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      await axios.post("/api/vendor/requestreset", { email });
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
      const response = await axios.post("/api/vendor/verifyresetcode", {
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
        "/api/vendor/resetpassword",
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
    register,
    logout,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
  };

  return (
    <VendorAuthContext.Provider value={value}>
      {children}
    </VendorAuthContext.Provider>
  );
};

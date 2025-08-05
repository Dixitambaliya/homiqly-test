import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { requestFCMToken } from "../../firebase/firebase";

const EmployeesAuthContext = createContext();

export const useEmployeesAuth = () => useContext(EmployeesAuthContext);

export const EmployeesAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("employeesToken");
    const userData = localStorage.getItem("employeesData");

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
      const response = await axios.post("/api/employee/login", {
        email,
        password,
        fcmToken,
      });

      const { token, employees_id, name, role } = response.data;

      const userData = { employees_id, name, role };

      localStorage.setItem("employeesToken", token);
      localStorage.setItem("employeesData", JSON.stringify(userData));

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
    localStorage.removeItem("employeesToken");
    localStorage.removeItem("employeesData");
    delete axios.defaults.headers.common["Authorization"];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const requestPasswordReset = async (email) => {
    try {
      setError(null);
      await axios.post("/api/employees/requestreset", { email });
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
      const response = await axios.post("/api/employees/verifyresetcode", {
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
        "/api/employees/resetpassword",
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
    <EmployeesAuthContext.Provider value={value}>
      {children}
    </EmployeesAuthContext.Provider>
  );
};

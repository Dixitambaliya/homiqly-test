import React, { useState, useEffect } from "react";
import api from "../../lib/axiosConfig";
import { Loader2 } from "lucide-react"; // or any loader icon of your choice

export default function ToggleButton() {
  const [isOn, setIsOn] = useState(false); // false = OFF, true = ON
  const [loading, setLoading] = useState(true); // true initially to disable during fetch
  const [toggling, setToggling] = useState(false); // toggling state for better UX

  // Fetch initial toggle value on mount
  useEffect(() => {
    const fetchInitialToggle = async () => {
      try {
        const response = await api.get("/api/employee/getstatus", {
          headers: {
            Authorization: `Bearer ${
              localStorage.getItem("employeesToken")
              // localStorage.getItem("adminToken")
            }`,
          },
        });
        setIsOn(response.data.is_active === 1);
      } catch (error) {
        console.error("Error fetching toggle status", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialToggle();
  }, []);

  const handleToggle = async () => {
    if (toggling || loading) return;
    setToggling(true);
    const newValue = isOn ? 0 : 1;

    try {
      await api.put("/api/employee/togglechange", { is_active: newValue });
      setIsOn(!isOn);
    } catch (error) {
      console.error("Error toggling value", error);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <span className="text-gray-700 font-medium">
        Service Toggle : {loading ? "Loading..." : isOn ? "ON" : "OFF"}
      </span>

      <button
        onClick={handleToggle}
        disabled={loading || toggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${
          isOn ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        {toggling ? (
          <Loader2 className="w-4 h-4 text-white animate-spin mx-auto" />
        ) : (
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
              isOn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        )}
      </button>
    </div>
  );
}

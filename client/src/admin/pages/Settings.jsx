import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import Button from "../../shared/components/Button/Button"; // Adjust path if needed

const Settings = () => {
  const [platformFee, setPlatformFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/settings/getsettings");
      console.log("Settings fetched:", res);
      setPlatformFee(parseFloat(res.data.platform_fee_percentage).toString());
    } catch (err) {
      console.error("Error fetching settings", err);
      toast.error(err.response?.data?.message || " Failed to fetch settings");
      if (err) {
        setPlatformFee(""); // Reset to empty if fetch fails
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!platformFee) return;

    setSaving(true);
    try {
      const res = await api.put("/api/settings/setplatformfee", {
        platform_fee_percentage: parseFloat(platformFee),
      });
      toast.success(`✅ ${res.data.message}`);
    } catch (err) {
      console.error("Error updating platform fee", err);
      toast.error(
        err.response?.data?.message || " Failed to update platform fee"
      );
      if (err) {
        fetchSettings();
      }
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">⚙️ Platform Fee Settings</h2>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Loading current settings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-2">
              Platform Fee (%)
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={platformFee}
              onChange={(e) => setPlatformFee(e.target.value)}
              placeholder="Enter platform fee percentage"
              required
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : "Update Fee"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default Settings;

import React, { useEffect, useState } from "react";
import api from "../../../lib/axiosConfig";
import { toast } from "react-toastify";
import Button from "../../../shared/components/Button/Button";

const PlatformFees = () => {
  const [vendorType, setVendorType] = useState("company"); // default value
  const [platformFee, setPlatformFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async (type) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/settings/getsettings/${type}`);
      const fee = parseFloat(res.data.platform_fee_percentage || 0).toString();
      setPlatformFee(fee);
    } catch (err) {
      toast.error(
        err.response?.data?.message || ` Failed to fetch settings for ${type}`
      );
      setPlatformFee("");
    } finally {
      setLoading(false);
    }
  };

  const handleVendorTypeChange = (e) => {
    const selectedType = e.target.value;
    setVendorType(selectedType);
    fetchSettings(selectedType);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!platformFee || isNaN(platformFee)) return;

    setSaving(true);
    try {
      const res = await api.put("/api/settings/setplatformfee", {
        vendor_type: vendorType,
        platform_fee_percentage: parseFloat(platformFee),
      });
      toast.success(` ${res.data.message}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update platform fee"
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings(vendorType); // initial load
  }, []);

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-white shadow rounded-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4">⚙️ Platform Fee Settings</h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-medium text-gray-700 mb-2">
            Select Vendor Type
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={vendorType}
            onChange={handleVendorTypeChange}
          >
            <option value="company">Company</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-2 text-gray-500">Loading current fee...</p>
          </div>
        ) : (
          <>
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
          </>
        )}
      </form>
    </div>
  );
};

export default PlatformFees;

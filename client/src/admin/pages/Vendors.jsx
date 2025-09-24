import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiRefreshCw } from "react-icons/fi";
import VendorsTable from "../components/Tables/VendorsTable";
import VendorDetailsModal from "../components/Modals/VendorDetailsModal";
import { Button } from "../../shared/components/Button";
import { FormInput } from "../../shared/components/Form";
import { Search } from "lucide-react";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState("all"); // all, pending, approved, rejected

  // NEW: search state
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/getvendors");
      console.log("fetch vendor", response.data.data);
      setVendors(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setError("Failed to load vendors");
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId, status) => {
    try {
      const response = await axios.put(
        `/api/approval/verification/${vendorId}`,
        {
          is_authenticated: status,
        }
      );

      if (response.status === 200) {
        // Update local state
        setVendors(
          vendors.map((vendor) =>
            vendor.vendor_id === vendorId
              ? { ...vendor, is_authenticated: status }
              : vendor
          )
        );

        // Update selected vendor if open
        if (selectedVendor && selectedVendor.vendor_id === vendorId) {
          setSelectedVendor({
            ...selectedVendor,
            is_authenticated: status,
          });
        }

        // Show success message
        toast.success(
          `Vendor ${status === 1 ? "approved" : "rejected"} successfully`
        );

        // Close modal
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error("Error updating vendor status:", error);
      toast.error("Failed to update vendor status");
    }
  };

  const viewVendorDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  // Filter vendors by status and search term (search checks individual_name OR company_companyName)
  const filteredVendors = vendors.filter((vendor) => {
    // Status filter
    if (filter === "pending" && vendor.is_authenticated !== 0) return false;
    if (filter === "approved" && vendor.is_authenticated !== 1) return false;
    if (filter === "rejected" && vendor.is_authenticated !== 2) return false;

    // Search filter
    if (!searchTerm || searchTerm.trim() === "") return true;

    const term = searchTerm.trim().toLowerCase();

    // Choose the display name: individual_name else company_companyName
    const vendorName = (
      vendor.individual_name ||
      vendor.company_companyName ||
      ""
    )
      .toString()
      .toLowerCase();

    return vendorName.includes(term);
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2>

        <div className="flex items-center space-x-2 w-full max-w-3xl">
          {/* search fills remaining space */}
          <div className="flex-1 min-w-0">
            <FormInput
              icon={<Search />}
              type="text"
              className="w-full" // ensure input stretches
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor by name or company"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary w-44"
          >
            <option value="all">All Vendors</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <Button
            onClick={fetchVendors}
            variant="outline"
            icon={<FiRefreshCw className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <VendorsTable
        refresh={fetchVendors}
        vendors={filteredVendors}
        isLoading={loading}
        onViewVendor={viewVendorDetails}
        onApproveVendor={(vendorId) => handleApproveVendor(vendorId, 1)}
        onRejectVendor={(vendorId) => handleApproveVendor(vendorId, 2)}
      />

      <VendorDetailsModal
        refresh={fetchVendors}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        vendor={selectedVendor}
        onApprove={(vendorId) => handleApproveVendor(vendorId, 1)}
        onReject={(vendorId) => handleApproveVendor(vendorId, 2)}
      />
    </div>
  );
};

export default Vendors;

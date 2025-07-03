import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiPlus } from "react-icons/fi";
import { Button } from "../../shared/components/Button";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import LoadingSpinner from "../../shared/components/LoadingSpinner";
import PackagesTable from "../components/Tables/PackagesTable";

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVendorServices();
  }, []);

  const fetchVendorServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/vendor/getvendorservice");
      console.log("Fetched Services:", response.data.services);
      setServices(response.data.services || []);
      setLoading(false);
    } catch (error) {
      setError("Failed to load services");
      setLoading(false);
    }
  };

  const handleAddServiceType = async (formData) => {
    try {
      setSubmitting(true);
      const response = await axios.post(
        "/api/vendor/applyservicetype",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (response.status === 200 || response.status === 201) {
        toast.success("Service type submitted for approval");
        setShowAddModal(false);
        fetchVendorServices();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to submit service type"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (pkg) => {
    // You can open a modal here or navigate
    console.log("Edit Package:", pkg);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Services</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          variant="primary"
          icon={<FiPlus className="mr-2" />}
        >
          Add Service Type
        </Button>
      </div>

      {services.length > 0 ? (
        <PackagesTable
          services={services}
          onEdit={handleEdit}
          fetchData={fetchVendorServices}
        />
      ) : (
        <div className="text-center py-8 border rounded-md">
          <p className="text-gray-600 mb-4">
            You haven't added any services yet.
          </p>
          <Button onClick={() => setShowAddModal(true)} variant="primary">
            Add Your First Service
          </Button>
        </div>
      )}

      <AddServiceTypeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddServiceType}
        isSubmitting={submitting}
      />
    </div>
  );
};

export default Services;

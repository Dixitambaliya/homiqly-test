import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiPlus } from "react-icons/fi";
import { Card } from "../../shared/components/Card";
import { Button } from "../../shared/components/Button";
import AddServiceTypeModal from "../components/Modals/AddServiceTypeModal";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

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
      console.log("Vendor Services Response:", response.data);
      setServices(response.data.services || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching vendor services:", error);
      setError("Failed to load services");
      setLoading(false);
    }
  };

  const handleAddServiceType = async (formData) => {
    try {
      setSubmitting(true);
      
      const response = await axios.post("/api/vendor/applyservicetype", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        toast.success("Service type submitted for approval");
        setShowAddModal(false);
        fetchVendorServices(); // Refresh the list
      }
    } catch (error) {
      console.error("Error submitting service type:", error);
      toast.error(error.response?.data?.message || "Failed to submit service type");
    } finally {
      setSubmitting(false);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const statusClass = service.is_approved === 1 ? 'bg-green-100 text-green-800' : 
                              service.is_approved === 2 ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800';
            const statusText = service.is_approved === 1 ? 'Approved' : 
                              service.is_approved === 2 ? 'Rejected' : 
                              'Pending';
            
            return (
              <Card 
                key={service.service_type_id}
                className="overflow-hidden"
              >
                {service.serviceTypeMedia && (
                  <img 
                    src={service.serviceTypeMedia} 
                    alt={service.serviceType} 
                    className="w-full h-48 object-cover -mt-6 -mx-6 mb-4"
                  />
                )}
                
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{service.serviceType}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                    {statusText}
                  </span>
                </div>
                
                <span className="inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs font-medium mb-3">
                  {service.categoryName}
                </span>
                
                <p className="text-gray-600 mb-4">
                  <strong>Service:</strong> {service.serviceName}
                </p>
                
                {service.serviceLocation && (
                  <p className="text-gray-600 mb-4">
                    <strong>Location:</strong> {service.serviceLocation}
                  </p>
                )}
                
                {service.packages && service.packages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Packages:</h4>
                    <div className="space-y-2">
                      {service.packages.map((pkg, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between">
                            <span className="font-medium">{pkg.title}</span>
                            <span className="text-green-600">₹{pkg.price}</span>
                          </div>
                          {pkg.description && (
                            <p className="text-gray-600 text-sm mt-1">{pkg.description}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">Duration: {pkg.time_required}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't added any services yet.</p>
          <Button
            onClick={() => setShowAddModal(true)}
            variant="primary"
          >
            Add Your First Service
          </Button>
        </Card>
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
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiPackage, FiCheck, FiX } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import StatusBadge from '../../shared/components/StatusBadge';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableServices, setAvailableServices] = useState([]);
  const [formData, setFormData] = useState({
    serviceId: '',
    serviceType: '',
    serviceTypeMedia: null,
    packages: [{ package_name: '', description: '', total_price: '', total_time: '' }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchVendorServices();
    fetchAvailableServices();
  }, []);

  const fetchVendorServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vendor/getvendorservice');
      setServices(response.data.services || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendor services:', error);
      setError('Failed to load services');
      setLoading(false);
    }
  };

  const fetchAvailableServices = async () => {
    try {
      const response = await axios.get('/api/vendor/vendorservice');
      setAvailableServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching available services:', error);
      toast.error('Failed to load available services');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        serviceTypeMedia: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePackageChange = (index, field, value) => {
    const updatedPackages = [...formData.packages];
    updatedPackages[index][field] = value;
    setFormData(prev => ({
      ...prev,
      packages: updatedPackages
    }));
  };

  const addPackage = () => {
    setFormData(prev => ({
      ...prev,
      packages: [...prev.packages, { package_name: '', description: '', total_price: '', total_time: '' }]
    }));
  };

  const removePackage = (index) => {
    if (formData.packages.length > 1) {
      const updatedPackages = [...formData.packages];
      updatedPackages.splice(index, 1);
      setFormData(prev => ({
        ...prev,
        packages: updatedPackages
      }));
    } else {
      toast.warning('You must have at least one package');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.serviceId || !formData.serviceType || !formData.serviceTypeMedia) {
      toast.error('Please fill all required fields and upload an image');
      return;
    }
    
    if (!formData.packages.every(pkg => pkg.package_name && pkg.total_price && pkg.total_time)) {
      toast.error('Please fill all required package fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('serviceId', formData.serviceId);
      formDataToSend.append('serviceType', formData.serviceType);
      formDataToSend.append('serviceTypeMedia', formData.serviceTypeMedia);
      formDataToSend.append('packages', JSON.stringify(formData.packages));
      
      const response = await axios.post('/api/vendor/applyservicetype', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Service type submitted for approval');
        setShowAddModal(false);
        resetForm();
        fetchVendorServices(); // Refresh the list
      }
    } catch (error) {
      console.error('Error submitting service type:', error);
      toast.error(error.response?.data?.message || 'Failed to submit service type');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      serviceId: '',
      serviceType: '',
      serviceTypeMedia: null,
      packages: [{ package_name: '', description: '', total_price: '', total_time: '' }]
    });
    setImagePreview(null);
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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark"
        >
          <FiPlus className="mr-2" />
          Add Service Type
        </button>
      </div>

      {services.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service.service_type_id} className="bg-white rounded-lg shadow overflow-hidden">
              {service.serviceTypeMedia && (
                <img 
                  src={service.serviceTypeMedia} 
                  alt={service.serviceType} 
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{service.serviceType}</h3>
                  <StatusBadge status={service.is_approved} />
                </div>
                <p className="text-sm text-gray-600 mb-2">{service.serviceName}</p>
                <div className="text-xs inline-block bg-blue-100 text-blue-800 rounded-full px-2 py-1 mb-3">
                  {service.categoryName}
                </div>
                
                {service.packages && service.packages.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <FiPackage className="mr-1" /> Packages
                    </h4>
                    <div className="space-y-2">
                      {service.packages.map((pkg, index) => (
                        <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{pkg.title}</span>
                            <span className="text-green-600">₹{pkg.price}</span>
                          </div>
                          {pkg.description && (
                            <p className="text-gray-600 text-xs mt-1">{pkg.description}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">Duration: {pkg.time_required}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">You haven't added any services yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark"
          >
            Add Your First Service
          </button>
        </div>
      )}

      {/* Add Service Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Service Type</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 mb-1">
                    Service*
                  </label>
                  <select
                    id="serviceId"
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="">Select a service</option>
                    {availableServices.map(service => (
                      <option key={service.service_id} value={service.service_id}>
                        {service.serviceName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type Name*
                  </label>
                  <input
                    type="text"
                    id="serviceType"
                    name="serviceType"
                    value={formData.serviceType}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Bridal Makeup Package"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="serviceTypeMedia" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Type Image*
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      id="serviceTypeMedia"
                      name="serviceTypeMedia"
                      accept="image/*"
                      onChange={handleImageChange}
                      required={!imagePreview}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Packages*
                  </label>
                  <div className="space-y-4">
                    {formData.packages.map((pkg, index) => (
                      <div key={index} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium">Package {index + 1}</h4>
                          {formData.packages.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePackage(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label htmlFor={`package_name_${index}`} className="block text-xs font-medium text-gray-500 mb-1">
                              Package Name*
                            </label>
                            <input
                              type="text"
                              id={`package_name_${index}`}
                              value={pkg.package_name}
                              onChange={(e) => handlePackageChange(index, 'package_name', e.target.value)}
                              required
                              placeholder="e.g., Basic Package"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`description_${index}`} className="block text-xs font-medium text-gray-500 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              id={`description_${index}`}
                              value={pkg.description}
                              onChange={(e) => handlePackageChange(index, 'description', e.target.value)}
                              placeholder="Brief description"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`total_price_${index}`} className="block text-xs font-medium text-gray-500 mb-1">
                              Price (₹)*
                            </label>
                            <input
                              type="number"
                              id={`total_price_${index}`}
                              value={pkg.total_price}
                              onChange={(e) => handlePackageChange(index, 'total_price', e.target.value)}
                              required
                              min="0"
                              step="0.01"
                              placeholder="e.g., 1999.99"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                            />
                          </div>
                          
                          <div>
                            <label htmlFor={`total_time_${index}`} className="block text-xs font-medium text-gray-500 mb-1">
                              Time Required*
                            </label>
                            <input
                              type="text"
                              id={`total_time_${index}`}
                              value={pkg.total_time}
                              onChange={(e) => handlePackageChange(index, 'total_time', e.target.value)}
                              required
                              placeholder="e.g., 2 hours"
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={addPackage}
                      className="flex items-center text-sm text-primary-600 hover:text-primary-800"
                    >
                      <FiPlus className="mr-1" />
                      Add Another Package
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Submitting...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck className="mr-2" />
                      Submit for Approval
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
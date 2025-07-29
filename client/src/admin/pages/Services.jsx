import { useState, useEffect } from 'react';
import api from '../../lib/axiosConfig';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit, FiTrash2, FiRefreshCw, FiX } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const Services = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [serviceFormData, setServiceFormData] = useState({
    serviceName: '',
    categoryName: '',
    serviceDescription: '',
    serviceImage: null
  });
  const [categoryFormData, setCategoryFormData] = useState({
    categoryName: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch services
      const servicesResponse = await api.get('/api/service/getadminservices');
      setServices(servicesResponse.data.services || []);
      
      // Fetch categories
      const categoriesResponse = await api.get('/api/service/getservicecategories');
      setCategories(categoriesResponse.data.categories || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services data:', error);
      setError('Failed to load services');
      setLoading(false);
    }
  };

  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setServiceFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setServiceFormData(prev => ({
        ...prev,
        serviceImage: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    
    if (!serviceFormData.serviceName || !serviceFormData.categoryName || !serviceFormData.serviceImage) {
      toast.error('Please fill all required fields and upload an image');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('serviceName', serviceFormData.serviceName);
      formDataToSend.append('categoryName', serviceFormData.categoryName);
      formDataToSend.append('serviceDescription', serviceFormData.serviceDescription || '');
      formDataToSend.append('serviceImage', serviceFormData.serviceImage);
      
      const response = await api.post('/api/service/addservice', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 201) {
        toast.success('Service added successfully');
        setShowAddServiceModal(false);
        resetServiceForm();
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error(error.response?.data?.message || 'Failed to add service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditService = async (e) => {
    e.preventDefault();
    
    if (!serviceFormData.serviceName || !serviceFormData.categoryName) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('serviceId', selectedService.serviceId);
      formDataToSend.append('serviceName', serviceFormData.serviceName);
      formDataToSend.append('categoryName', serviceFormData.categoryName);
      formDataToSend.append('serviceDescription', serviceFormData.serviceDescription || '');
      
      if (serviceFormData.serviceImage) {
        formDataToSend.append('serviceImage', serviceFormData.serviceImage);
      }
      
      const response = await api.put('/api/service/editService', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200) {
        toast.success('Service updated successfully');
        setShowEditServiceModal(false);
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error(error.response?.data?.message || 'Failed to update service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryFormData.categoryName) {
      toast.error('Please enter a category name');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await api.post('/api/service/addcategory', categoryFormData);
      
      if (response.status === 201) {
        toast.success('Category added successfully');
        setShowAddCategoryModal(false);
        setCategoryFormData({ categoryName: '' });
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error(error.response?.data?.message || 'Failed to add category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    
    if (!categoryFormData.categoryName) {
      toast.error('Please enter a category name');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await api.put('/api/service/editcategory', {
        serviceCategoryId: selectedCategory.serviceCategoryId,
        newCategoryName: categoryFormData.categoryName
      });
      
      if (response.status === 200) {
        toast.success('Category updated successfully');
        setShowEditCategoryModal(false);
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error.response?.data?.message || 'Failed to update category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }
    
    try {
      const response = await api.delete('/api/service/deleteservice', {
        data: { serviceId }
      });
      
      if (response.status === 200) {
        toast.success('Service deleted successfully');
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  const handleDeleteCategory = async (serviceCategoryId) => {
    if (!confirm('Are you sure you want to delete this category? This will also delete all services in this category.')) {
      return;
    }
    
    try {
      const response = await api.delete('/api/service/deletecategory', {
        data: { serviceCategoryId }
      });
      
      if (response.status === 200) {
        toast.success('Category deleted successfully');
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      serviceName: '',
      categoryName: '',
      serviceDescription: '',
      serviceImage: null
    });
    setImagePreview(null);
  };

  const editService = (service) => {
    setSelectedService(service);
    setServiceFormData({
      serviceName: service.title,
      categoryName: service.categoryName,
      serviceDescription: service.description || '',
      serviceImage: null
    });
    setImagePreview(service.serviceImage);
    setShowEditServiceModal(true);
  };

  const editCategory = (category) => {
    setSelectedCategory(category);
    setCategoryFormData({
      categoryName: category.categoryName
    });
    setShowEditCategoryModal(true);
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
        <h2 className="text-2xl font-bold text-gray-800">Service Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddServiceModal(true)}
            className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
          >
            <FiPlus className="mr-2" />
            Add Service
          </button>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiPlus className="mr-2" />
            Add Category
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Categories</h3>
        
        {categories.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map(category => (
                    <tr key={category.serviceCategoryId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{category.serviceCategoryId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{category.serviceCategory}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => editCategory({
                            serviceCategoryId: category.serviceCategoryId,
                            categoryName: category.serviceCategory
                          })}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <FiEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.serviceCategoryId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No categories found.</p>
          </div>
        )}
      </div>

      {/* Services Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
        
        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(category => (
              <div key={category.categoryName} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-4 bg-gray-50 border-b">
                  <h4 className="font-medium text-gray-800">{category.categoryName}</h4>
                </div>
                
                {category.services && category.services.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {category.services.map(service => (
                      <div key={service.serviceId} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{service.title}</h5>
                            {service.description && (
                              <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            )}
                          </div>
                          <div className="flex items-start ml-4">
                            <button
                              onClick={() => editService(service)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(service.serviceId)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No services in this category
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No services found.</p>
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Service</h3>
              <button 
                onClick={() => {
                  setShowAddServiceModal(false);
                  resetServiceForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddService} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name*
                  </label>
                  <input
                    type="text"
                    id="serviceName"
                    name="serviceName"
                    value={serviceFormData.serviceName}
                    onChange={handleServiceInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <select
                    id="categoryName"
                    name="categoryName"
                    value={serviceFormData.categoryName}
                    onChange={handleServiceInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.serviceCategoryId} value={category.serviceCategory}>
                        {category.serviceCategory}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="serviceDescription"
                    name="serviceDescription"
                    value={serviceFormData.serviceDescription}
                    onChange={handleServiceInputChange}
                    rows="3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="serviceImage" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Image*
                  </label>
                  <input
                    type="file"
                    id="serviceImage"
                    name="serviceImage"
                    onChange={handleServiceImageChange}
                    accept="image/*"
                    required
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddServiceModal(false);
                    resetServiceForm();
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
                      <span className="ml-2">Adding...</span>
                    </>
                  ) : (
                    'Add Service'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {showEditServiceModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Service</h3>
              <button 
                onClick={() => setShowEditServiceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditService} className="p-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name*
                  </label>
                  <input
                    type="text"
                    id="serviceName"
                    name="serviceName"
                    value={serviceFormData.serviceName}
                    onChange={handleServiceInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                  </label>
                  <select
                    id="categoryName"
                    name="categoryName"
                    value={serviceFormData.categoryName}
                    onChange={handleServiceInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  >
                    <option value="">Select Category</option>
                    {categories.map(category => (
                      <option key={category.serviceCategoryId} value={category.serviceCategory}>
                        {category.serviceCategory}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="serviceDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="serviceDescription"
                    name="serviceDescription"
                    value={serviceFormData.serviceDescription}
                    onChange={handleServiceInputChange}
                    rows="3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="serviceImage" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Image
                  </label>
                  <input
                    type="file"
                    id="serviceImage"
                    name="serviceImage"
                    onChange={handleServiceImageChange}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditServiceModal(false)}
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
                      <span className="ml-2">Updating...</span>
                    </>
                  ) : (
                    'Update Service'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Category</h3>
              <button 
                onClick={() => setShowAddCategoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCategory} className="p-4">
              <div>
                <label htmlFor="newCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name*
                </label>
                <input
                  type="text"
                  id="newCategoryName"
                  name="categoryName"
                  value={categoryFormData.categoryName}
                  onChange={handleCategoryInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
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
                      <span className="ml-2">Adding...</span>
                    </>
                  ) : (
                    'Add Category'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && selectedCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Edit Category</h3>
              <button 
                onClick={() => setShowEditCategoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditCategory} className="p-4">
              <div>
                <label htmlFor="editCategoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name*
                </label>
                <input
                  type="text"
                  id="editCategoryName"
                  name="categoryName"
                  value={categoryFormData.categoryName}
                  onChange={handleCategoryInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEditCategoryModal(false)}
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
                      <span className="ml-2">Updating...</span>
                    </>
                  ) : (
                    'Update Category'
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
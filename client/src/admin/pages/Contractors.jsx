import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { Check, Eye, Plus, X } from 'lucide-react';

const Contractors = () => {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    commission_rate: 20,
    business_license: null,
    insurance_certificate: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchContractors();
  }, []);

  const fetchContractors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/contractor/all');
      setContractors(response.data.contractors || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contractors:', error);
      setError('Failed to load contractors');
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.contact_person || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('company_name', formData.company_name);
      formDataToSend.append('contact_person', formData.contact_person);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('address', formData.address || '');
      formDataToSend.append('commission_rate', formData.commission_rate);
      
      if (formData.business_license) {
        formDataToSend.append('business_license', formData.business_license);
      }
      
      if (formData.insurance_certificate) {
        formDataToSend.append('insurance_certificate', formData.insurance_certificate);
      }
      
      const response = await axios.post('/api/contractor/create', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 201) {
        toast.success('Contractor created successfully');
        setShowAddModal(false);
        resetForm();
        fetchContractors(); // Refresh the list
      }
    } catch (error) {
      console.error('Error creating contractor:', error);
      toast.error(error.response?.data?.message || 'Failed to create contractor');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      commission_rate: 20,
      business_license: null,
      insurance_certificate: null
    });
  };

  const viewContractorDetails = (contractor) => {
    setSelectedContractor(contractor);
    setShowDetailsModal(true);
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
        <h2 className="text-2xl font-bold text-gray-800">Contractor Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
        >
          <Plus className="mr-2" />
          Add Contractor
        </button>
      </div>

      {contractors.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractors.map(contractor => (
                  <tr key={contractor.contractor_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contractor.contractor_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contractor.company_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contractor.contact_person}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contractor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contractor.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        contractor.is_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {contractor.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewContractorDetails(contractor)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Eye className="h-5 w-5" />
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
          <p className="text-gray-600">No contractors found.</p>
        </div>
      )}

      {/* Add Contractor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Add New Contractor</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name*
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person*
                  </label>
                  <input
                    type="text"
                    id="contact_person"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone*
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="commission_rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    id="commission_rate"
                    name="commission_rate"
                    value={formData.commission_rate}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    step="0.1"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
                
                <div>
                  <label htmlFor="business_license" className="block text-sm font-medium text-gray-700 mb-1">
                    Business License
                  </label>
                  <input
                    type="file"
                    id="business_license"
                    name="business_license"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
                
                <div>
                  <label htmlFor="insurance_certificate" className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Certificate
                  </label>
                  <input
                    type="file"
                    id="insurance_certificate"
                    name="insurance_certificate"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
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
                      <span className="ml-2">Creating...</span>
                    </>
                  ) : (
                    'Create Contractor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contractor Details Modal */}
      {showDetailsModal && selectedContractor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Contractor Details</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Contractor ID</h4>
                  <p className="text-gray-900">#{selectedContractor.contractor_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedContractor.is_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedContractor.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Company Name</h4>
                  <p className="text-gray-900">{selectedContractor.company_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Contact Person</h4>
                  <p className="text-gray-900">{selectedContractor.contact_person}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
                  <p className="text-gray-900">{selectedContractor.email}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
                  <p className="text-gray-900">{selectedContractor.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
                  <p className="text-gray-900">{selectedContractor.address || 'Not provided'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Commission Rate</h4>
                  <p className="text-gray-900">{selectedContractor.commission_rate}%</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Registration Date</h4>
                  <p className="text-gray-900">
                    {new Date(selectedContractor.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {selectedContractor.business_license && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Business License</h4>
                    <a 
                      href={selectedContractor.business_license} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View Document
                    </a>
                  </div>
                )}
                
                {selectedContractor.insurance_certificate && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Insurance Certificate</h4>
                    <a 
                      href={selectedContractor.insurance_certificate} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800"
                    >
                      View Document
                    </a>
                  </div>
                )}
              </div>
              
              {/* Services Section */}
              {selectedContractor.services && selectedContractor.services.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Services Offered</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedContractor.services.map((service, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                        <div className="text-sm text-gray-600">Category: {service.categoryName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!selectedContractor.is_verified && (
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                  <button
                    onClick={async () => {
                      try {
                        await axios.put(`/api/contractor/${selectedContractor.contractor_id}/verify`, {
                          is_verified: true
                        });
                        toast.success('Contractor verified successfully');
                        setShowDetailsModal(false);
                        fetchContractors();
                      } catch (error) {
                        console.error('Error verifying contractor:', error);
                        toast.error('Failed to verify contractor');
                      }
                    }}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
                  >
                    <Check className="mr-2" />
                    Verify Contractor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contractors;
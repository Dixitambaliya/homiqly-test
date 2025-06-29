import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiCheck, FiX, FiEye, FiRefreshCw } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import StatusBadge from '../../shared/components/StatusBadge';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/getvendors');
      setVendors(response.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Failed to load vendors');
      setLoading(false);
    }
  };

  const handleApproveVendor = async (vendorId, status) => {
    try {
      const response = await axios.put(`/api/approval/verification/${vendorId}`, {
        is_authenticated: status
      });
      
      if (response.status === 200) {
        // Update local state
        setVendors(vendors.map(vendor => 
          vendor.vendor_id === vendorId
            ? { ...vendor, is_authenticated: status }
            : vendor
        ));
        
        // Update selected vendor if open
        if (selectedVendor && selectedVendor.vendor_id === vendorId) {
          setSelectedVendor({
            ...selectedVendor,
            is_authenticated: status
          });
        }
        
        // Show success message
        toast.success(`Vendor ${status === 1 ? 'approved' : 'rejected'} successfully`);
      }
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast.error('Failed to update vendor status');
    }
  };

  const viewVendorDetails = (vendor) => {
    setSelectedVendor(vendor);
    setShowDetailsModal(true);
  };

  const filteredVendors = vendors.filter(vendor => {
    if (filter === 'all') return true;
    if (filter === 'pending') return vendor.is_authenticated === 0;
    if (filter === 'approved') return vendor.is_authenticated === 1;
    if (filter === 'rejected') return vendor.is_authenticated === 2;
    return true;
  });

  const getVendorName = (vendor) => {
    if (vendor.vendorType === 'individual') {
      return vendor.individual_name || 'N/A';
    } else {
      return vendor.company_companyName || 'N/A';
    }
  };

  const getVendorEmail = (vendor) => {
    if (vendor.vendorType === 'individual') {
      return vendor.individual_email || 'N/A';
    } else {
      return vendor.company_companyEmail || 'N/A';
    }
  };

  const getVendorPhone = (vendor) => {
    if (vendor.vendorType === 'individual') {
      return vendor.individual_phone || 'N/A';
    } else {
      return vendor.company_companyPhone || 'N/A';
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
        <h2 className="text-2xl font-bold text-gray-800">Vendor Management</h2>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
          >
            <option value="all">All Vendors</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={fetchVendors}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {vendors.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
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
                {filteredVendors.map(vendor => (
                  <tr key={vendor.vendor_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.vendor_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{getVendorName(vendor)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{vendor.vendorType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getVendorEmail(vendor)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getVendorPhone(vendor)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={vendor.is_authenticated} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewVendorDetails(vendor)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                      
                      {vendor.is_authenticated === 0 && (
                        <>
                          <button
                            onClick={() => handleApproveVendor(vendor.vendor_id, 1)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            <FiCheck className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApproveVendor(vendor.vendor_id, 2)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiX className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No vendors found.</p>
        </div>
      )}

      {/* Vendor Details Modal */}
      {showDetailsModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Vendor Details</h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Vendor ID</h4>
                  <p className="text-gray-900">#{selectedVendor.vendor_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <StatusBadge status={selectedVendor.is_authenticated} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Vendor Type</h4>
                  <p className="text-gray-900 capitalize">{selectedVendor.vendorType}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Registration Date</h4>
                  <p className="text-gray-900">
                    {new Date(selectedVendor.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="text-md font-medium text-gray-700 mb-3">
                  {selectedVendor.vendorType === 'individual' ? 'Individual Details' : 'Company Details'}
                </h4>
                
                {selectedVendor.vendorType === 'individual' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Name</h5>
                      <p className="text-gray-900">{selectedVendor.individual_name || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Email</h5>
                      <p className="text-gray-900">{selectedVendor.individual_email || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Phone</h5>
                      <p className="text-gray-900">{selectedVendor.individual_phone || 'N/A'}</p>
                    </div>
                    {selectedVendor.individual_resume && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Resume</h5>
                        <a 
                          href={selectedVendor.individual_resume} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800"
                        >
                          View Resume
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Company Name</h5>
                      <p className="text-gray-900">{selectedVendor.company_companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Contact Person</h5>
                      <p className="text-gray-900">{selectedVendor.company_contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Company Email</h5>
                      <p className="text-gray-900">{selectedVendor.company_companyEmail || 'N/A'}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Company Phone</h5>
                      <p className="text-gray-900">{selectedVendor.company_companyPhone || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Company Address</h5>
                      <p className="text-gray-900">{selectedVendor.company_companyAddress || 'N/A'}</p>
                    </div>
                    {selectedVendor.company_googleBusinessProfileLink && (
                      <div className="md:col-span-2">
                        <h5 className="text-sm font-medium text-gray-500 mb-1">Google Business Profile</h5>
                        <a 
                          href={selectedVendor.company_googleBusinessProfileLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800"
                        >
                          {selectedVendor.company_googleBusinessProfileLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Services Section */}
              {selectedVendor.services && selectedVendor.services.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Services Offered</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedVendor.services.map((service, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium text-gray-900">{service.serviceName}</div>
                        <div className="text-sm text-gray-600">Category: {service.categoryName}</div>
                        {service.serviceLocation && (
                          <div className="text-sm text-gray-600">Location: {service.serviceLocation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedVendor.is_authenticated === 0 && (
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleApproveVendor(selectedVendor.vendor_id, 1);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
                  >
                    <FiCheck className="mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleApproveVendor(selectedVendor.vendor_id, 2);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                  >
                    <FiX className="mr-2" />
                    Reject
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

export default Vendors;
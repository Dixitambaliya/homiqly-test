import React from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button';
import StatusBadge from '../../../shared/components/StatusBadge';

const VendorDetailsModal = ({ 
  isOpen, 
  onClose, 
  vendor, 
  onApprove, 
  onReject 
}) => {
  if (!vendor) return null;
  
  const getVendorName = () => {
    return vendor.vendorType === 'individual' 
      ? vendor.individual_name 
      : vendor.company_companyName;
  };
  
  const getVendorEmail = () => {
    return vendor.vendorType === 'individual' 
      ? vendor.individual_email 
      : vendor.company_companyEmail;
  };
  
  const getVendorPhone = () => {
    return vendor.vendorType === 'individual' 
      ? vendor.individual_phone 
      : vendor.company_companyPhone;
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vendor Details"
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Vendor ID</h4>
          <p className="text-gray-900">#{vendor.vendor_id}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
          <StatusBadge status={vendor.is_authenticated} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Vendor Type</h4>
          <p className="text-gray-900 capitalize">{vendor.vendorType}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Registration Date</h4>
          <p className="text-gray-900">
            {new Date(vendor.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h4 className="text-md font-medium text-gray-700 mb-3">
          {vendor.vendorType === 'individual' ? 'Individual Details' : 'Company Details'}
        </h4>
        
        {vendor.vendorType === 'individual' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Name</h5>
              <p className="text-gray-900">{vendor.individual_name || 'N/A'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Email</h5>
              <p className="text-gray-900">{vendor.individual_email || 'N/A'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Phone</h5>
              <p className="text-gray-900">{vendor.individual_phone || 'N/A'}</p>
            </div>
            {vendor.individual_resume && (
              <div>
                <h5 className="text-sm font-medium text-gray-500 mb-1">Resume</h5>
                <a 
                  href={vendor.individual_resume} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark"
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
              <p className="text-gray-900">{vendor.company_companyName || 'N/A'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Contact Person</h5>
              <p className="text-gray-900">{vendor.company_contactPerson || 'N/A'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Company Email</h5>
              <p className="text-gray-900">{vendor.company_companyEmail || 'N/A'}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-500 mb-1">Company Phone</h5>
              <p className="text-gray-900">{vendor.company_companyPhone || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <h5 className="text-sm font-medium text-gray-500 mb-1">Company Address</h5>
              <p className="text-gray-900">{vendor.company_companyAddress || 'N/A'}</p>
            </div>
            {vendor.company_googleBusinessProfileLink && (
              <div className="md:col-span-2">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Google Business Profile</h5>
                <a 
                  href={vendor.company_googleBusinessProfileLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark"
                >
                  {vendor.company_googleBusinessProfileLink}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Services Section */}
      {vendor.services && vendor.services.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-700 mb-3">Services Offered</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendor.services.map((service, index) => (
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
      
      {vendor.is_authenticated === 0 && (
        <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
          <Button
            variant="success"
            onClick={() => onApprove(vendor.vendor_id)}
            icon={<span>✓</span>}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => onReject(vendor.vendor_id)}
            icon={<span>✕</span>}
          >
            Reject
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default VendorDetailsModal;
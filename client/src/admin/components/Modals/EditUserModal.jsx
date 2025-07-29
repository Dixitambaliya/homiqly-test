import React, { useState } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button';
import { FormInput, FormSelect } from '../../../shared/components/Form';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

const EditUserModal = ({ 
  isOpen, 
  onClose, 
  user, 
  onSave,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    is_approved: 1
  });
  
  // Initialize form data when user changes
  React.useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        is_approved: user.is_approved || 1
      });
    }
  }, [user]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(user.user_id, formData);
  };
  
  if (!user) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormInput
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
          />
          
          <FormInput
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
          />
          
          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          
          <FormInput
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
          />
          
          <FormSelect
            label="Status"
            name="is_approved"
            value={formData.is_approved}
            onChange={handleChange}
            options={[
              { value: 1, label: 'Approved' },
              { value: 0, label: 'Suspended' }
            ]}
          />
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
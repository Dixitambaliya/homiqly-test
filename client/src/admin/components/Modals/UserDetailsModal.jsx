import React from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button';

const UserDetailsModal = ({ 
  isOpen, 
  onClose, 
  user, 
  onEdit 
}) => {
  if (!user) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      size="lg"
    >
      <div className="flex items-center mb-6">
        {user.profileImage ? (
          <img 
            src={user.profileImage} 
            alt={`${user.firstName} ${user.lastName}`}
            className="h-16 w-16 rounded-full mr-4 object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center mr-4">
            <span className="text-gray-500 text-xl">
              {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
            </span>
          </div>
        )}
        <div>
          <h4 className="text-xl font-medium text-gray-900">
            {user.firstName} {user.lastName}
          </h4>
          <p className="text-gray-600">User ID: {user.user_id}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Email</h4>
          <p className="text-gray-900">{user.email}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Phone</h4>
          <p className="text-gray-900">{user.phone || 'Not provided'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
          <p className="text-gray-900">{user.address || 'Not provided'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">State</h4>
          <p className="text-gray-900">{user.state || 'Not provided'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Postal Code</h4>
          <p className="text-gray-900">{user.postalcode || 'Not provided'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Joined On</h4>
          <p className="text-gray-900">
            {new Date(user.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>
      
      <div className="flex justify-end mt-4 pt-4 border-t">
        <Button
          variant="primary"
          onClick={() => onEdit(user)}
          icon={<span>✎</span>}
        >
          Edit User
        </Button>
      </div>
    </Modal>
  );
};

export default UserDetailsModal;
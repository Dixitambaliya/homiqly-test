import React from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { FiCalendar, FiClock, FiUser, FiMapPin } from 'react-icons/fi';
import StatusBadge from '../../../shared/components/StatusBadge';
import { formatDate, formatTime } from '../../../shared/utils/dateUtils';

const BookingDetailsModal = ({ 
  isOpen, 
  onClose, 
  booking
}) => {
  if (!booking) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      size="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Booking ID</h4>
          <p className="text-gray-900">#{booking.booking_id}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
          <StatusBadge status={booking.bookingStatus} />
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Customer</h4>
          <p className="text-gray-900 flex items-center">
            <FiUser className="mr-1 text-gray-400" />
            {booking.userName}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Vendor</h4>
          <p className="text-gray-900">{booking.vendorName}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Service</h4>
          <p className="text-gray-900">{booking.serviceName}</p>
          <p className="text-sm text-gray-500">{booking.serviceCategory}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Service Type</h4>
          <p className="text-gray-900">{booking.serviceTypeName || 'N/A'}</p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
          <p className="text-gray-900 flex items-center">
            <FiCalendar className="mr-1 text-gray-400" />
            {formatDate(booking.bookingDate)}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
          <p className="text-gray-900 flex items-center">
            <FiClock className="mr-1 text-gray-400" />
            {formatTime(booking.bookingTime)}
          </p>
        </div>
      </div>
      
      {booking.notes && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
          <p className="text-gray-900 bg-gray-50 p-3 rounded">{booking.notes}</p>
        </div>
      )}
      
      {booking.bookingMedia && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-1">Attached Media</h4>
          <div className="mt-2">
            <a 
              href={booking.bookingMedia} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-dark"
            >
              View Attachment
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BookingDetailsModal;
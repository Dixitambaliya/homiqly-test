import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiFilter, FiRefreshCw } from 'react-icons/fi';
import BookingsTable from '../components/Tables/BookingsTable';
import BookingDetailsModal from '../components/Modals/BookingDetailsModal';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormSelect } from '../../shared/components/Form';

const Bookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, approved, cancelled

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/booking/vendorbookedservices');
      setBookings(response.data.bookings || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (bookingId, status) => {
    try {
      const response = await axios.put('/api/booking/approveorrejectbooking', {
        booking_id: bookingId,
        status
      });
      
      if (response.status === 200) {
        // Update local state
        setBookings(bookings.map(booking => 
          booking.booking_id === bookingId || booking.bookingId === bookingId
            ? { ...booking, bookingStatus: status }
            : booking
        ));
        
        // Update selected booking if open
        if (selectedBooking && (selectedBooking.booking_id === bookingId || selectedBooking.bookingId === bookingId)) {
          setSelectedBooking({
            ...selectedBooking,
            bookingStatus: status
          });
        }
        
        // Show success message
        toast.success(`Booking ${status === 1 ? 'approved' : 'rejected'} successfully`);
        
        // Close modal
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('Failed to update booking status');
    }
  };

  const viewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
        <div className="flex space-x-2">
          <FormSelect
            name="filter"
            value={filter}
            onChange={handleFilterChange}
            options={[
              { value: 'all', label: 'All Bookings' },
              { value: '0', label: 'Pending' },
              { value: '1', label: 'Approved' },
              { value: '2', label: 'Cancelled' }
            ]}
            className="mb-0 w-40"
          />
          <Button
            onClick={fetchBookings}
            variant="outline"
            icon={<FiRefreshCw className="mr-2" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <BookingsTable
        bookings={bookings}
        isLoading={loading}
        onViewBooking={viewBookingDetails}
        onApproveBooking={(bookingId) => handleUpdateStatus(bookingId, 1)}
        onRejectBooking={(bookingId) => handleUpdateStatus(bookingId, 2)}
        filteredStatus={filter !== 'all' ? parseInt(filter) : undefined}
      />

      <BookingDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        booking={selectedBooking}
        onApprove={(bookingId) => handleUpdateStatus(bookingId, 1)}
        onReject={(bookingId) => handleUpdateStatus(bookingId, 2)}
      />
    </div>
  );
};

export default Bookings;
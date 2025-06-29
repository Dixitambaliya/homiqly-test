import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiXCircle, FiEye, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import StatusBadge from '../../shared/components/StatusBadge';
import { formatDate, formatTime } from '../../shared/utils/dateUtils';

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

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    if (filter === 'pending') return booking.bookingStatus === 0;
    if (filter === 'approved') return booking.bookingStatus === 1;
    if (filter === 'cancelled') return booking.bookingStatus === 2;
    return true;
  });

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
        <h2 className="text-2xl font-bold text-gray-800">Booking Management</h2>
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={fetchBookings}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {bookings.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
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
                {filteredBookings.map(booking => (
                  <tr key={booking.booking_id || booking.bookingId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking.serviceName}</div>
                      <div className="text-xs text-gray-500">{booking.serviceCategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(booking.bookingDate)}</div>
                      <div className="text-xs text-gray-500">{formatTime(booking.bookingTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={booking.bookingStatus} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => viewBookingDetails(booking)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                      
                      {booking.bookingStatus === 0 && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(booking.booking_id || booking.bookingId, 1)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            <FiCheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(booking.booking_id || booking.bookingId, 2)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiXCircle className="h-5 w-5" />
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
          <p className="text-gray-600">No bookings found.</p>
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Booking Details</h3>
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
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Booking ID</h4>
                  <p className="text-gray-900">#{selectedBooking.booking_id || selectedBooking.bookingId}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                  <StatusBadge status={selectedBooking.bookingStatus} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Customer</h4>
                  <p className="text-gray-900 flex items-center">
                    <FiUser className="mr-1 text-gray-400" />
                    {selectedBooking.userName}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Service</h4>
                  <p className="text-gray-900">{selectedBooking.serviceName}</p>
                  <p className="text-sm text-gray-500">{selectedBooking.serviceCategory}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
                  <p className="text-gray-900 flex items-center">
                    <FiCalendar className="mr-1 text-gray-400" />
                    {formatDate(selectedBooking.bookingDate)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
                  <p className="text-gray-900 flex items-center">
                    <FiClock className="mr-1 text-gray-400" />
                    {formatTime(selectedBooking.bookingTime)}
                  </p>
                </div>
              </div>
              
              {selectedBooking.notes && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedBooking.notes}</p>
                </div>
              )}
              
              {selectedBooking.bookingStatus === 0 && (
                <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedBooking.booking_id || selectedBooking.bookingId, 1);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
                  >
                    <FiCheckCircle className="mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedBooking.booking_id || selectedBooking.bookingId, 2);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex items-center"
                  >
                    <FiXCircle className="mr-2" />
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

export default Bookings;
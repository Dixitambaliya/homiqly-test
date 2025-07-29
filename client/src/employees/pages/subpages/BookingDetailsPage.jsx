import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";
import { Button } from "../../../shared/components/Button";
import StatusBadge from "../../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import { toast } from "react-toastify";
import RatingModal from "../../components/Modals/RatingModal";
import Breadcrumb from "../../../shared/components/Breadcrumb";

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    if (!booking) {
      axios
        .get(`/api/employee/getbookingemployee`)
        .then((res) => {
          const found = res.data.bookings.find(
            (b) =>
              b.booking_id === parseInt(bookingId) ||
              b.bookingId === parseInt(bookingId)
          );
          if (found) setBooking(found);
        })
        .catch((err) => {
          console.error("Failed to fetch booking:", err);
        });
    }
  }, [bookingId]);

  const handleUpdateBookingStatus = async (status) => {
    try {
      const response = await axios.put(`/api/employee/updatebookingstatus`, {
        booking_id: bookingId,
        status,
      });

      if (response.status === 200) {
        toast.success(
          `Booking ${status === 3 ? "started" : "completed"} successfully`
        );
        setBooking((prev) => ({ ...prev, bookingStatus: status }));
      }
      if (status === 4) {
        setShowRatingModal(true);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  };

  if (!booking) {
    return <div className="p-6">Loading booking details...</div>;
  }

  return (
    <>
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/employees" },
          { label: "Bookings", to: "/employees/bookings" },
          { label: "Booking Details" },
        ]}
      />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Booking Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Booking ID
            </h4>
            <p className="text-gray-900">#{booking.booking_id}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
            <StatusBadge status={booking.bookingStatus} />
          </div>

          {/* Customer Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Customer</h4>
            <p className="text-gray-900 flex items-center">
              <FiUser className="mr-1 text-gray-400" />
              {booking.userName}
            </p>
            <p className="text-sm text-gray-500 flex items-center">
              <FiMail className="mr-1" /> {booking.userEmail}
            </p>
            <p className="text-sm text-gray-500 flex items-center">
              <FiPhone className="mr-1" /> {booking.userPhone}
            </p>
            <p className="text-sm text-gray-500 flex items-center">
              <FiMapPin className="mr-1" /> {booking.userAddress},{" "}
              {booking.userState} - {booking.userPostalCode}
            </p>
          </div>

          {/* Service Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Service</h4>
            <p className="text-gray-900">{booking.serviceName}</p>
            <p className="text-sm text-gray-500">{booking.serviceCategory}</p>
            <p className="text-sm text-gray-500">{booking.serviceTypeName}</p>
          </div>

          {/* Date & Time */}
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

          {/* Payment Info */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Payment</h4>
            <p className="text-gray-900">Status: {booking.payment_status}</p>
            <p className="text-gray-900">
              Amount: {booking.payment_amount}{" "}
              {booking.payment_currency?.toUpperCase()}
            </p>
          </div>

          {/* Assigned Employee */}
          {booking.assignedEmployee && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">
                Assigned Employee
              </h4>
              <p className="text-gray-900">{booking.assignedEmployee.name}</p>
              <p className="text-sm text-gray-500">
                {booking.assignedEmployee.email}
              </p>
              <p className="text-sm text-gray-500">
                {booking.assignedEmployee.phone}
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Notes</h4>
            <p className="text-gray-900 bg-gray-50 p-3 rounded">
              {booking.notes}
            </p>
          </div>
        )}

        {/* Preferences */}
        {booking.preferences?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Preferences
            </h4>
            <ul className="list-disc list-inside text-gray-900">
              {booking.preferences.map((pref) => (
                <li key={pref.preference_id}>{pref.preferenceValue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Packages */}
        {booking.packages?.map((pkg) => (
          <div key={pkg.package_id} className="mb-6 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-1">
              {pkg.packageName}
            </h4>
            <p className="text-sm text-gray-500">
              Total: {pkg.totalPrice} | Duration: {pkg.totalTime}
            </p>
            {pkg.items?.length > 0 && (
              <div className="mt-2">
                <h5 className="text-sm font-medium text-gray-600">Items:</h5>
                <ul className="list-disc list-inside text-gray-900">
                  {pkg.items.map((item) => (
                    <li key={item.item_id}>
                      {item.itemName} - {item.price} ({item.timeRequired})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {/* Media */}
        {booking.bookingMedia && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-500 mb-1">
              Attached Media
            </h4>
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

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <Button
            variant="primary"
            onClick={() => handleUpdateBookingStatus(3)}
            disabled={booking.bookingStatus !== 1}
          >
            Start
          </Button>
          <Button
            variant="success"
            onClick={() => handleUpdateBookingStatus(4)}
            disabled={booking.bookingStatus !== 3}
          >
            Complete
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          bookingId={booking.booking_id}
        />
      </div>
    </>
  );
}

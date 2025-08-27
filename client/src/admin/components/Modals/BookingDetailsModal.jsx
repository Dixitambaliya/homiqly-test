import React from "react";
import { FiX, FiCalendar, FiClock, FiUser, FiMapPin } from "react-icons/fi";
import StatusBadge from "../../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";

const BookingDetailsModal = ({ isOpen, onClose, booking }) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Booking Details</h2>
          <button onClick={onClose}>
            <FiX className="text-gray-600 w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="text-gray-900 font-medium">#{booking.booking_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <StatusBadge status={booking.bookingStatus} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="text-gray-900 flex items-center">
              <FiUser className="mr-1" /> {booking.userName}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900">{booking.userEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-gray-900">{booking.userPhone}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Address</p>
            <p className="text-gray-900 flex items-start">
              <FiMapPin className="mr-1 mt-0.5" />
              {booking.userAddress}, {booking.userState},{" "}
              {booking.userPostalCode}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="text-gray-900 flex items-center">
              <FiCalendar className="mr-1" /> {formatDate(booking.bookingDate)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time</p>
            <p className="text-gray-900 flex items-center">
              <FiClock className="mr-1" /> {formatTime(booking.bookingTime)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Payment</p>
            <p className="text-gray-900">
              {booking.payment_status?.toUpperCase()} —{" "}
              {booking.payment_currency?.toUpperCase()} {booking.payment_amount}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="bg-gray-50 p-3 rounded">{booking.notes || "None"}</p>
          </div>

          {/* Preferences */}
          {booking.preferences?.length > 0 && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500 mb-1">Preferences</p>
              <ul className="list-disc list-inside text-gray-800">
                {booking.preferences.map((pref) => (
                  <li key={pref.preference_id}>{pref.preferenceValue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Packages */}
          {booking.packages?.map((pkg) => (
            <div
              key={pkg.package_id}
              className="md:col-span-2 border rounded-md p-4"
            >
              <div className="flex gap-4 mb-2 items-center">
                <img
                  src={pkg.packageMedia}
                  alt={pkg.packageName}
                  className="w-20 h-20 object-cover rounded"
                />
                <div>
                  <p className="font-semibold">{pkg.packageName}</p>
                  <p className="text-sm text-gray-500">
                    {pkg.totalTime} • ${pkg.totalPrice}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pkg.items?.map((item) => (
                  <div key={item.item_id} className="flex gap-4 border-t pt-2">
                    <img
                      src={item.itemMedia}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium">{item.itemName}</p>
                      <p className="text-sm text-gray-500">
                        {item.timeRequired} • ${item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;

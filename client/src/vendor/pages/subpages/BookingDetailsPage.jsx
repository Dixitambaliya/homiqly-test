import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import PaymentBadge from "../../../shared/components/PaymentBadge";

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("vendorToken");
        const res = await api.get("/api/booking/vendorassignedservices", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const found = res.data.bookings.find(
          (b) => b.booking_id === Number(bookingId)
        );
        if (found) setBooking(found);
      } catch (error) {
        console.error("Failed to fetch booking:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!booking) {
      fetchBooking();
    }
  }, [bookingId]);

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSlider />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/vendor/dashboard" },
          { label: "Bookings", to: "/vendor/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />
      <div className="px-4  space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Booking #{booking.booking_id}
          </h2>
          <StatusBadge status={booking.bookingStatus} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section */}
          <div className="col-span-2 space-y-6">
            {/* Service Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-1">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Service Info
              </h4>
              <p className="text-lg font-medium text-gray-900">
                {booking.serviceName}
              </p>
              <p className="text-sm text-gray-500">{booking.serviceCategory}</p>
              <p className="text-sm text-gray-500">{booking.serviceTypeName}</p>
            </div>

            {/* Packages */}
            {booking.packages?.map((pkg) => (
              <div
                key={pkg.package_id}
                className="bg-white rounded-xl shadow-sm border p-6 space-y-3"
              >
                <div className="flex items-center gap-4">
                  {pkg.packageMedia && (
                    <img
                      src={pkg.packageMedia}
                      alt="Package"
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                  )}
                  <div>
                    <h4 className="text-base font-semibold text-gray-800">
                      {pkg.packageName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Total: ₹{pkg.totalPrice || "N/A"} | Duration:{" "}
                      {pkg.totalTime}
                    </p>
                  </div>
                </div>

                {/* Items */}
                {pkg.items?.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {pkg.items.map((item) => (
                      <li key={item.item_id} className="flex items-start gap-3">
                        {item.itemMedia && (
                          <img
                            src={item.itemMedia}
                            alt="Item"
                            className="w-14 h-14 object-cover rounded border"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {item.itemName} ({item.quantity}x)
                          </p>
                          <p className="text-sm text-gray-500">
                            {item.timeRequired} • ₹{item.price}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Notes
                </h4>
                <p className="text-sm text-gray-800">{booking.notes}</p>
              </div>
            )}

            {/* Preferences */}
            {booking.preferences?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Preferences
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {booking.preferences.map((pref) => (
                    <li key={pref.preference_id}>{pref.preferenceValue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Media */}
            {booking.bookingMedia && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Attached Media
                </h4>
                <img src={booking.bookingMedia}></img>
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-1">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Customer Info
              </h4>
              <div className="space-y-1">
                <p className="flex items-center text-sm text-gray-800">
                  <FiUser className="mr-2" />
                  {booking.userName}
                </p>
                <p className="text-sm text-gray-500">{booking.userEmail}</p>
                <p className="text-sm text-gray-500">{booking.userPhone}</p>
                {booking.userAddress && (
                  <p className="flex items-center text-sm text-gray-500 mt-1">
                    <FiMapPin className="mr-2" />
                    {booking.userAddress}
                    {booking.userState && `, ${booking.userState}`}
                    {booking.userPostalCode && ` - ${booking.userPostalCode}`}
                  </p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl shadow-sm border p-6 ">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Schedule
              </h4>
              <p className="flex items-center text-sm text-gray-800">
                <FiCalendar className="mr-2" />
                {formatDate(booking.bookingDate)}
              </p>
              <p className="flex items-center text-sm text-gray-800 mt-1">
                <FiClock className="mr-2" />
                {formatTime(booking.bookingTime)}
              </p>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Payment Info
              </h4>
              <PaymentBadge status={booking.payment_status} />
              <p className="text-sm text-gray-800 mt-2">
                ₹{booking.payment_amount}{" "}
                {booking.payment_currency?.toUpperCase()}
              </p>
              {booking.payment_intent_id && (
                <p className="text-xs text-gray-400 mt-1">
                  Payment ID: {booking.payment_intent_id}
                </p>
              )}
            </div>

            {/* Assigned Employee */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Assigned Employee
              </h4>
              <p className="text-sm text-gray-800">
                {booking.employeeName || "Not Assigned"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsPage;

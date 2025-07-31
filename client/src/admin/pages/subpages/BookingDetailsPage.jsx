import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiUser,
  FiMapPin,
} from "react-icons/fi";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { toast } from "react-toastify";
import { Button } from "../../../shared/components/Button";

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    if (!booking) {
      fetchBooking();
    }
  }, [bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/getbookings");
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

  // Fetch eligible vendors only if vendor not assigned
  useEffect(() => {
    const fetchEligibleVendors = async () => {
      if (booking && !booking.vendorName) {
        try {
          setLoading(true);
          const res = await api.get(
            `/api/booking/get-eligible-vendors/${booking.booking_id}`
          );
          setEligibleVendors(res.data.eligibleVendors || []);
        } catch (err) {
          console.error("Failed to fetch eligible vendors:", err);
          toast.error("Failed to load eligible vendors");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchEligibleVendors();
  }, [booking]);

  const handleAssignVendor = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/booking/assignbooking", {
        booking_id: booking.booking_id,
        vendor_id: selectedVendorId,
      });

      toast.success(res.data.message || "Vendor assigned successfully");

      // Refetch booking data so vendor info updates immediately
      await fetchBooking();

      // Reset dropdown state
      setSelectedVendorId("");
      setEligibleVendors([]);
    } catch (err) {
      console.error("Assign vendor failed:", err);
      toast.error("Failed to assign vendor");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSlider />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/vendor/dashboard" },
          { label: "Bookings", to: "/vendor/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />

      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Booking #{booking.booking_id}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">Status</p>
          <StatusBadge status={booking.bookingStatus} />
        </div>
        <div>
          <p className="text-sm text-gray-500">Customer</p>
          <p className="text-gray-800 flex items-center">
            <FiUser className="mr-1" />
            {booking.userName}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-gray-800">{booking.userEmail}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Phone</p>
          <p className="text-gray-800">{booking.userPhone}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Address</p>
          <p className="text-gray-800 flex items-start">
            <FiMapPin className="mr-1 mt-0.5" />
            {booking.userAddress}, {booking.userState}, {booking.userPostalCode}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Date</p>
          <p className="text-gray-800 flex items-center">
            <FiCalendar className="mr-1" />
            {formatDate(booking.bookingDate)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Time</p>
          <p className="text-gray-800 flex items-center">
            <FiClock className="mr-1" />
            {formatTime(booking.bookingTime)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Payment</p>
          <p className="text-gray-800">
            {booking.payment_status?.toUpperCase()} —{" "}
            {booking.payment_currency?.toUpperCase()} {booking.payment_amount}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Vendor</p>
          <p className="text-gray-800">
            {booking.vendorName || (
              <span className="text-gray-500 italic">Not Assigned</span>
            )}
          </p>
        </div>

        {!booking.vendorName && (
          <div className="md:col-span-2 flex gap-4 items-center">
            <select
              className="border px-3 py-2 rounded"
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
            >
              <option value="">Select Vendor</option>
              {eligibleVendors.map((vendor) => (
                <option key={vendor.vendor_id} value={vendor.vendor_id}>
                  {vendor.vendorName} ({vendor.vendorType})
                </option>
              ))}
            </select>
            <Button isLoading={loading} onClick={handleAssignVendor}>
              Assign
            </Button>
          </div>
        )}
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Notes</p>
          <p className="bg-gray-50 p-3 rounded text-gray-800">
            {booking.notes}
          </p>
        </div>
      )}

      {/* Preferences */}
      {booking.preferences?.length > 0 && (
        <div className="mb-6">
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
          className="mb-6 border rounded-md p-4 bg-white"
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
                {pkg.totalTime} • ₹{pkg.totalPrice}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pkg.items?.map((item) => (
              <div key={item.item_id} className="flex gap-4 border-t pt-2">
                <img
                  src={item.itemMedia}
                  className="w-16 h-16 object-cover rounded"
                  alt={item.itemName}
                />
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  <p className="text-sm text-gray-500">
                    {item.timeRequired} • ₹{item.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default BookingDetailsPage;

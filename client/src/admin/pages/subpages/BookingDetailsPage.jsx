"use client";

import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCalendar, FiClock, FiUser, FiMapPin } from "react-icons/fi";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { toast } from "react-toastify";
import { Button } from "../../../shared/components/Button";
import PaymentBadge from "../../../shared/components/PaymentBadge";

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    if (!booking) fetchBooking();
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
      await fetchBooking();
      setSelectedVendorId("");
      setEligibleVendors([]);
    } catch (err) {
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Booking #{booking.booking_id}
        </h2>
        <StatusBadge status={booking.bookingStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT SECTION */}
        <div className="col-span-3 space-y-6">
          {/* Service Info */}
          <div className="flex flex-col lg:flex-col gap-6">
            {/* Left: Service Info */}
            <div className="w-full  bg-white rounded-xl shadow-sm border p-6 space-y-2">
              <h4 className="text-sm font-semibold text-gray-500 mb-1">
                Service Info
              </h4>
              <div className="flex items-center gap-4">
                {booking.serviceTypeMedia && (
                  <img
                    src={booking.serviceTypeMedia}
                    alt="Service Type"
                    className="w-28 h-28 object-cover rounded-lg border"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-medium text-gray-900">
                    {booking.serviceName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.serviceCategory}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.serviceTypeName}
                  </p>
                </div>
              </div>
            </div>
            <div className="w-full space-y-4 p-6 bg-white rounded-xl shadow-sm border">
              {booking.packages?.map((pkg) => (
                <div
                  key={pkg.package_id}
                  className="bg-white rounded-xl shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-4">
                    {pkg.packageMedia && (
                      <img
                        src={pkg.packageMedia}
                        alt={pkg.packageName}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    )}
                    <div>
                      <h4 className="text-base font-semibold text-gray-800">
                        {pkg.packageName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {pkg.totalTime} • ${pkg.totalPrice}
                      </p>
                    </div>
                  </div>
                  {pkg.items?.map((item) => (
                    <div
                      key={item.item_id}
                      className="flex gap-4 border-t pt-2 items-start"
                    >
                      {item.itemMedia && (
                        <img
                          src={item.itemMedia}
                          alt={item.itemName}
                          className="w-14 h-14 object-cover rounded border"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.itemName} ({item.quantity}x)
                        </p>
                        <p className="text-sm text-gray-500">
                          {item.timeRequired} • ${item.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="w-full space-y-4 p-6 bg-white rounded-xl shadow-sm border">
              <h1>addons</h1>
              {booking.addons?.map((pkg) => (
                <div
                  key={pkg.addon_id}
                  className="bg-white rounded-xl shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-gray-800">
                        {pkg.addonName}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {pkg.addonTime} • ${pkg.price}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          {/* Booking Media */}
          {booking.bookingMedia && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Attached Media
              </h4>
              <img
                src={booking.bookingMedia}
                alt="Booking Media"
                className="w-full max-w-sm rounded-lg border"
              />
            </div>
          )}
        </div>

        {/* RIGHT SECTION */}
        <div className="col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">
              Customer
            </h4>
            <p className="flex items-center text-sm text-gray-800">
              <FiUser className="mr-2" />
              {booking.userName}
            </p>
            {booking.userEmail && (
              <p className="text-sm text-gray-500">{booking.userEmail}</p>
            )}
            {booking.userPhone && (
              <p className="text-sm text-gray-500">{booking.userPhone}</p>
            )}
            {booking.userAddress && (
              <p className="flex items-center text-sm text-gray-500 mt-1">
                <FiMapPin className="mr-2" />
                {booking.userAddress}
                {booking.userState && `, ${booking.userState}`}
                {booking.userPostalCode && ` - ${booking.userPostalCode}`}
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
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
              ${booking.payment_amount}{" "}
              {booking.payment_currency?.toUpperCase()}
            </p>
            {booking.payment_intent_id && (
              <p className="text-xs text-gray-400 mt-1">
                Payment ID: {booking.payment_intent_id}
              </p>
            )}
          </div>

          {/* Vendor Info or Assignment */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">Vendor</h4>
            {booking.vendorName ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-800 font-medium">
                  {booking.vendorName} ({booking.vendorType})
                </p>
                {booking.vendorContactPerson && (
                  <p className="text-sm text-gray-500">
                    Contact Person: {booking.vendorContactPerson}
                  </p>
                )}
                <p className="text-sm text-gray-500">{booking.vendorEmail}</p>
                <p className="text-sm text-gray-500">{booking.vendorPhone}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  className="border px-3 py-2 rounded w-full"
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
                <Button
                  onClick={handleAssignVendor}
                  isLoading={loading}
                  className="w-full"
                >
                  Assign Vendor
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsPage;

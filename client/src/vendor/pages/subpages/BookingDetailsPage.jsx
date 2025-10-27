import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import PaymentBadge from "../../../shared/components/PaymentBadge";
import { Button } from "../../../shared/components/Button";
import axios from "axios";
import { toast } from "react-toastify";
import RatingModal from "../../../employees/components/Modals/RatingModal";
import { Calendar, Clock, Mail, MapPin, Phone, User as UserIcon } from "lucide-react";

// Version: v2 — expands addons / preferences / consents so vendors see them clearly

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [vendorType, setVendorType] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    const vendorData = localStorage.getItem("vendorData");
    if (vendorData) {
      try {
        const parsed = JSON.parse(vendorData);
        setVendorType(parsed.vendor_type);
      } catch (err) {
        console.warn("Failed to parse vendorData from localStorage", err);
      }
    }
  }, []);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await api.get("/api/booking/vendorassignedservices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingsArray = res?.data?.bookings || [];
      const found = bookingsArray.find(
        (b) => Number(b.booking_id) === Number(bookingId)
      );
      if (found) setBooking(found);
      else console.warn("Booking not found in vendorassignedservice response");
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!booking) fetchBooking();
    else {
      fetchBooking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleUpdateBookingStatus = async (status) => {
    try {
      const response = await axios.put(`/api/vendor/updatebookingstatus`, {
        booking_id: bookingId,
        status,
      });

      if (response.status === 200) {
        toast.success(
          `Booking ${
            status === 3 ? "started" : status === 4 ? "completed" : "updated"
          } successfully`
        );
        setBooking((prev) =>
          prev ? { ...prev, bookingStatus: status } : prev
        );
        await fetchBooking();
      }
      if (status === 4) setShowRatingModal(true);
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update booking status"
      );
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSlider />
      </div>
    );
  }

  const subPackages = booking.sub_packages || booking.subPackages || [];
  const customerProfileImg =
    booking.userProfileImage || booking.user_profile_image;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/vendor/dashboard" },
          { label: "Bookings", to: "/vendor/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {customerProfileImg ? (
                  <img
                    src={customerProfileImg}
                    alt={booking.userName || "Customer"}
                    className="w-14 h-14 rounded-md object-cover border"
                    loading="lazy"
                    onError={(e) =>
                      (e.currentTarget.src = "/avatar-placeholder.png")
                    }
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    N/A
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold text-gray-900 truncate">
                      {booking.userName || booking.user_name || "N/A"}
                    </h1>
                    <p className="text-sm text-gray-500 truncate">
                      {booking.userAddress || "No address provided"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Booking #{booking.booking_id}
                    </div>
                    <div className="mt-1">
                      <StatusBadge status={booking.bookingStatus} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2 truncate">
                    <Calendar />
                    <span>{formatDate(booking.bookingDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Clock />
                    <span>{formatTime(booking.bookingTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Phone size={14} />
                    <a
                      href={`tel:${booking.userPhone}`}
                      className="truncate hover:underline"
                    >
                      {booking.userPhone || "No phone"}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={14} />
                    <a
                      href={`mailto:${booking.userEmail}`}
                      className="truncate hover:underline"
                    >
                      {booking.userEmail || "No email"}
                    </a>
                  </div>
                </div>

                {booking.userParkingInstructions && (
                  <p className="mt-3 text-sm text-gray-700">
                    Parking:{" "}
                    <span className="font-medium">
                      {booking.userParkingInstructions}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 border-t pt-3 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="py-2"
              >
                Back
              </Button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  booking.userAddress || ""
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block"
              >
                <Button variant="ghost" className="py-2">
                  Open Map
                </Button>
              </a>

              {booking.assignedEmployee?.name && (
                <div className="ml-auto text-sm text-gray-600">
                  Assigned: {booking.assignedEmployee?.name || "—"}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            {subPackages.map((pkg) => (
              <div
                key={pkg.package_id || pkg.sub_package_id}
                className="bg-white rounded-lg border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-20 h-20 rounded-md flex-shrink-0 overflow-hidden border">
                    {pkg.packageMedia ? (
                      <img
                        src={pkg.packageMedia}
                        alt={pkg.packageName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) =>
                          (e.currentTarget.src = "/placeholder-rect.png")
                        }
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex gap-3">
                      <h4 className="text-md font-semibold text-gray-900 ">
                        {pkg.packageName || "Package"}
                      </h4>
                      <div className="text-xs text-gray-500 mt-1">
                        {pkg.items?.length || 0} item(s) {pkg.totalTime || ""}
                      </div>
                    </div>
                    <div className="">
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          ${pkg.totalPrice ?? booking.payment_amount ?? "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {pkg.items?.map((item) => (
                    <div
                      key={item.sub_package_id || item.itemName}
                      className="mt-3 bg-gray-50 border rounded p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 overflow-hidden rounded bg-white border">
                            {item.itemMedia ? (
                              <img
                                src={item.itemMedia}
                                alt={item.itemName}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) =>
                                  (e.currentTarget.src =
                                    "/placeholder-square.png")
                                }
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                                No Image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {item.itemName || item.item_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.timeRequired || item.time_required || ""}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-sm text-gray-700">
                          <div>${item.price ?? "0.00"}</div>
                          <div className="text-xs text-gray-400">
                            Qty: {item.quantity ?? 1}
                          </div>
                        </div>
                      </div>

                      {/* Expanded details: addons, preferences, consents */}
                      <div className="mt-3 space-y-2">
                        {item.addons?.length > 0 && (
                          <div className="bg-white border rounded p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-700">
                                Addons
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.addons.length}
                              </div>
                            </div>
                            <ul className="mt-2 text-xs text-gray-600 space-y-1">
                              {item.addons.map((addon) => (
                                <li
                                  key={addon.addon_id || addon.addonName}
                                  className="flex items-center justify-between"
                                >
                                  <div className="min-w-0 truncate">
                                    {addon.addonName}
                                    {addon.addonMedia ? (
                                      <span className="ml-2 text-gray-400">
                                        {" "}
                                        (media)
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {addon.quantity
                                      ? `×${addon.quantity} `
                                      : ""}
                                    {addon.price ? `$${addon.price}` : ""}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.preferences?.length > 0 && (
                          <div className="bg-white border rounded p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-700">
                                Preferences
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.preferences.length}
                              </div>
                            </div>
                            <ul className="mt-2 text-xs text-gray-600 space-y-1">
                              {item.preferences.map((pref) => (
                                <li
                                  key={
                                    pref.preference_id || pref.preferenceValue
                                  }
                                  className="flex items-center justify-between"
                                >
                                  <div className="min-w-0 truncate">
                                    {pref.preferenceValue}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {pref.preferencePrice
                                      ? `$${pref.preferencePrice}`
                                      : ""}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.consents?.length > 0 && (
                          <div className="bg-white border rounded p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-semibold text-gray-700">
                                Consents
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.consents.length}
                              </div>
                            </div>
                            <ul className="mt-2 text-xs text-gray-600 space-y-1">
                              {item.consents.map((c) => (
                                <li
                                  key={c.consent_id || c.consentText}
                                  className="flex items-start justify-between"
                                >
                                  <div className="min-w-0 ">
                                    {c.consentText}{" "}
                                    <span className="font-semibold">
                                      {" "}
                                      {c.answer != null ? `— ${c.answer}` : ""}
                                    </span>
                                  </div>
                                  {/* <div className="ml-2 text-xs text-gray-500">
                                    </div> */}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {booking.notes && (
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700">Notes</h4>
                <p className="mt-2 text-sm text-gray-800">{booking.notes}</p>
              </div>
            )}

            {booking.preferences?.length > 0 && (
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700">
                  Booking Preferences
                </h4>
                <ul className="mt-2 list-disc list-inside text-sm text-gray-800">
                  {booking.preferences.map((p) => (
                    <li key={p.preference_id || p.preferenceValue}>
                      {p.preferenceValue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {booking.bookingMedia && (
              <div className="bg-white rounded-lg border p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700">
                  Attached Media
                </h4>
                <img
                  src={booking.bookingMedia}
                  alt="Attached media"
                  className="mt-2 max-w-full rounded"
                />
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700">Schedule</h4>
            <div className="mt-3 text-sm text-gray-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar />
                  {formatDate(booking.bookingDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock />
                  {formatTime(booking.bookingTime)}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500">Start</div>
                <div className="text-sm text-gray-900">
                  {booking.start_time
                    ? new Date(booking.start_time).toLocaleString()
                    : "—"}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500">Payment</div>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PaymentBadge status={booking.payment_status} />
                    <span className="text-sm text-gray-700 capitalize">
                      {booking.payment_status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    ${booking.payment_amount ?? booking.net_amount ?? "0.00"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700">Actions</h4>
            <div className="mt-3 space-y-3">
              {vendorType === "individual" ? (
                <>
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateBookingStatus(3)}
                    disabled={booking.bookingStatus !== 1}
                    className="w-full py-3 rounded-md"
                  >
                    Start Service
                  </Button>

                  <Button
                    variant="success"
                    onClick={() => handleUpdateBookingStatus(4)}
                    disabled={booking.bookingStatus !== 3}
                    className="w-full py-3 rounded-md"
                  >
                    Complete Service
                  </Button>
                </>
              ) : (
                <div className="text-sm text-gray-600">
                  No direct actions available for your vendor type.
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="w-full py-2"
              >
                Back
              </Button>
            </div>

            <div className="mt-4 border-t pt-3 flex flex-col gap-2">
              <a
                href={`tel:${booking.userPhone}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Phone size={16} /> Call
              </a>
              <a
                href={`mailto:${booking.userEmail}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Mail size={16} /> Email
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  booking.userAddress || ""
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <MapPin size={16} /> Map
              </a>
            </div>
          </div>

          {booking.assignedEmployee && (
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-700">
                Assigned To
              </h4>
              <div className="mt-3 text-sm text-gray-900">
                <div className="font-medium">
                  {booking.assignedEmployee.name}
                </div>
                <div className="text-xs text-gray-500">
                  {booking.assignedEmployee.email}
                </div>
                <div className="mt-2">
                  <a
                    href={`tel:${booking.assignedEmployee.phone}`}
                    className="text-sm hover:underline"
                  >
                    {booking.assignedEmployee.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        bookingId={booking.booking_id}
      />
    </div>
  );
};

export default BookingDetailsPage;

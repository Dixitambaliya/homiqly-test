import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCalendar, FiClock, FiUser, FiMapPin } from "react-icons/fi";
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

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // If route forwarded booking via state, keep it — otherwise null and we'll fetch.
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [vendorType, setVendorType] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  useEffect(() => {
    // Get vendor type from localStorage
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
      // changed to the vendor assigned service endpoint you mentioned: adjust path if your backend differs
      const res = await api.get("/api/booking/vendorassignedservices", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // res.data.bookings is the array per the example you provided
      const bookingsArray = res?.data?.bookings || [];

      const found = bookingsArray.find(
        (b) => Number(b.booking_id) === Number(bookingId)
      );

      if (found) {
        setBooking(found);
      } else {
        // If booking wasn't found in response, optionally try to fetch a single booking endpoint
        console.warn("Booking not found in vendorassignedservice response");
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  };

  // fetch when we don't already have booking data (or when bookingId changes)
  useEffect(() => {
    if (!booking) {
      fetchBooking();
    } else {
      // If we have a booking passed in state, still refresh it lightly (optional).
      // fetchBooking();
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
        await fetchBooking(); // refresh with latest data
      }
      if (status === 4) {
        setShowRatingModal(true);
      }
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

  // helpers to safely access nested arrays
  const subPackages = booking.sub_packages || booking.subPackages || [];
  const customerProfileImg =
    booking.userProfileImage || booking.user_profile_image;

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/vendor/dashboard" },
          { label: "Bookings", to: "/vendor/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />
      <div className="px-4 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Booking #{booking.booking_id}
          </h2>
          <StatusBadge status={booking.bookingStatus} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Section */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6 space-y-1">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Service Info
              </h4>
              <p className="text-lg font-medium text-gray-900">
                {booking.serviceName || booking.service_name || "N/A"}
              </p>
              <p className="text-sm text-gray-500">
                {booking.serviceCategory || booking.service_category || ""}
              </p>
              <p className="text-sm text-gray-500">
                {booking.serviceTypeName || booking.service_type_name || ""}
              </p>
            </div>

            {/* Render sub_packages (replacement for old packages) */}
            {/* --- Enhanced Minimal UI for subPackages (replace your current block) --- */}
            {subPackages.map((pkg) => (
              <article
                key={
                  pkg.package_id ||
                  pkg.sub_package_id ||
                  `${pkg.packageName}-${Math.random()}`
                }
                className="bg-white  rounded-2xl shadow-sm border border-gray-100  p-6 md:p-8 space-y-4"
                aria-labelledby={`pkg-${pkg.package_id}`}
              >
                <div className="flex items-start gap-4 md:gap-6">
                  {/* image */}
                  <div className="flex-shrink-0">
                    {pkg.packageMedia ? (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-gray-100 ">
                        <img
                          src={pkg.packageMedia}
                          alt={pkg.packageName || "Package"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder-rect.png";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-gray-50  flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* title & meta */}
                  <div className="flex-1 min-w-0">
                    <h4
                      id={`pkg-${pkg.package_id}`}
                      className="text-lg md:text-xl font-semibold text-gray-900  truncate"
                    >
                      {pkg.packageName || "Package"}
                    </h4>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm md:text-sm">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-gray-600 ">
                        <span className="font-medium">
                          ${pkg.totalPrice ?? booking.payment_amount ?? "N/A"}
                        </span>
                        <span className="text-xs text-gray-400">total</span>
                      </div>

                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-gray-600 ">
                        <span className="font-medium">
                          {pkg.totalTime ?? "—"}
                        </span>
                        <span className="text-xs text-gray-400">duration</span>
                      </div>

                      {/* optional package meta */}
                      {pkg.package_id && (
                        <div className="ml-auto text-xs text-gray-400 hidden md:inline">{`#${pkg.package_id}`}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100 " />

                {/* Items list */}
                {pkg.items?.length > 0 ? (
                  <ul className="space-y-4">
                    {pkg.items.map((item) => (
                      <li
                        key={
                          item.sub_package_id ?? item.item_id ?? item.itemName
                        }
                        className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                      >
                        {/* item image */}
                        <div className="md:col-span-2">
                          {item.itemMedia ? (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-gray-100 ">
                              <img
                                src={item.itemMedia}
                                alt={item.itemName || "Item"}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    "/placeholder-square.png";
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-gray-50  flex items-center justify-center text-xs text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* item main */}
                        <div className="md:col-span-7 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900  truncate">
                                {item.itemName || item.item_name || "Item"}
                                {item.quantity ? (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ×{item.quantity}
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {/* {item.timeRequired || item.time_required || ""} */}
                                {item.price ? (
                                  <span className="ml-2">• ${item.price}</span>
                                ) : null}
                              </p>
                            </div>

                            {/* item price chip (mobile hides) */}
                            <div className="hidden md:flex md:items-center md:gap-2">
                              {item.price && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-50  border border-gray-100  text-gray-700 ">
                                  ${item.price}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* addons / preferences / consents: stacked cards */}
                          <div className="mt-3 space-y-2">
                            {item.addons?.length > 0 && (
                              <div className="bg-gray-50  border border-gray-100  rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-semibold text-gray-700 ">
                                    Addons
                                  </h5>
                                </div>
                                <ul className="mt-2 text-xs text-gray-600  space-y-1 list-disc list-inside">
                                  {item.addons.map((addon) => (
                                    <li
                                      key={addon.addon_id || addon.addonName}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="truncate">
                                        {addon.addonName}
                                      </span>
                                      <span className="ml-2 text-xs text-gray-500">
                                        {addon.price ? `$${addon.price}` : ""}
                                        {addon.quantity
                                          ? ` ×${addon.quantity}`
                                          : ""}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.preferences?.length > 0 && (
                              <div className="bg-gray-50  border border-gray-100  rounded-lg p-3">
                                <h5 className="text-xs font-semibold text-gray-700 ">
                                  Preferences
                                </h5>
                                <ul className="mt-2 text-xs text-gray-600  space-y-1 list-disc list-inside">
                                  {item.preferences.map((pref) => (
                                    <li
                                      key={
                                        pref.preference_id ||
                                        pref.preferenceValue
                                      }
                                      className="flex items-center justify-between"
                                    >
                                      <span className="truncate">
                                        {pref.preferenceValue}
                                      </span>
                                      {pref.preferencePrice ? (
                                        <span className="ml-2 text-xs text-gray-500">
                                          ${pref.preferencePrice}
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {item.consents?.length > 0 && (
                              <div className="bg-gray-50  border border-gray-100  rounded-lg p-3">
                                <h5 className="text-xs font-semibold text-gray-700 ">
                                  Consents
                                </h5>
                                <ul className="mt-2 text-xs text-gray-600  space-y-1 list-disc list-inside">
                                  {item.consents.map((c) => (
                                    <li key={c.consent_id || c.consentText}>
                                      <span className="truncate">
                                        {c.consentText}
                                      </span>
                                      {c.answer != null ? (
                                        <span className="ml-2 text-xs text-gray-500">
                                          — {c.answer}
                                        </span>
                                      ) : null}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right column: compact price & meta */}
                        <div className="md:col-span-3 flex flex-col items-end gap-2">
                          <div className="text-right">
                            {item.price && (
                              <div className="text-sm font-semibold text-gray-900 ">
                                ${item.price}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {item.timeRequired || item.time_required || ""}
                            </div>
                          </div>

                          {/* subtle actions placeholder (keeps UI extension-ready) */}
                          <div className="mt-auto">
                            {/* keep the space for future controls — currently nothing to avoid changing logic */}
                            <div className="w-full h-0" />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">
                    No items included in this package.
                  </p>
                )}
              </article>
            ))}
            {/* --- end enhanced block --- */}

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Notes
                </h4>
                <p className="text-sm text-gray-800">{booking.notes}</p>
              </div>
            )}

            {/* Booking-level preferences (if present) */}
            {booking.preferences?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Preferences
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {booking.preferences.map((pref) => (
                    <li key={pref.preference_id || pref.preferenceValue}>
                      {pref.preferenceValue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* booking media */}
            {booking.bookingMedia && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Attached Media
                </h4>
                <img
                  src={booking.bookingMedia}
                  alt="Attached media"
                  className="max-w-full rounded"
                />
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="space-y-6">
            {/* Customer Card */}
            <section
              aria-labelledby="customer-info"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {customerProfileImg ? (
                    <img
                      src={customerProfileImg}
                      alt={booking.userName || "Customer"}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border border-gray-100 dark:border-slate-800"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/avatar-placeholder.png";
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-sm text-gray-400">
                      N/A
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3
                    id="customer-info"
                    className="text-sm md:text-base font-semibold text-gray-900 dark:text-gray-100 truncate"
                  >
                    {booking.userName || booking.user_name || "N/A"}
                  </h3>

                  <div className="mt-1 flex flex-col gap-1">
                    <a
                      href={`mailto:${booking.userEmail || ""}`}
                      className="text-xs md:text-sm text-gray-500 dark:text-gray-300 hover:underline truncate"
                    >
                      {booking.userEmail || "No email"}
                    </a>
                    <a
                      href={
                        booking.userPhone ? `tel:${booking.userPhone}` : "#"
                      }
                      className="text-xs md:text-sm text-gray-500 dark:text-gray-300 truncate"
                    >
                      {booking.userPhone || "No phone"}
                    </a>

                    {booking.userAddress && (
                      <p className="mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-300 flex items-start gap-2">
                        <span className="sr-only">Address:</span>
                        <FiMapPin className="mt-0.5 text-gray-400" />
                        <span className="truncate">
                          {booking.userAddress}
                          {booking.userState ? `, ${booking.userState}` : ""}
                          {booking.userPostalCode
                            ? ` • ${booking.userPostalCode}`
                            : ""}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule Card */}
            <section
              aria-labelledby="schedule-info"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4
                    id="schedule-info"
                    className="text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Schedule
                  </h4>
                  <div className="mt-2 flex flex-col md:flex-row md:items-center md:gap-4">
                    <div className="flex items-center gap-2">
                      <FiCalendar className="text-gray-400" />
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {formatDate(booking.bookingDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <FiClock className="text-gray-400" />
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {formatTime(booking.bookingTime)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* small created at or status meta (optional) */}
                <div className="text-right hidden md:block">
                  <span className="text-xs text-gray-400">
                    {booking.bookingStatus
                      ? `Status: ${booking.bookingStatus}`
                      : ""}
                  </span>
                </div>
              </div>
            </section>

            {/* Payment Card */}
            <section
              aria-labelledby="payment-info"
              className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4
                    id="payment-info"
                    className="text-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Payment Info
                  </h4>

                  <div className="mt-3 flex items-center gap-3">
                    <PaymentBadge status={booking.payment_status} />
                    <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                      {booking.payment_status || "—"}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    ${booking.payment_amount ?? booking.net_amount ?? "0.00"}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {(booking.payment_currency || "").toUpperCase()}
                  </div>
                </div>
              </div>
            </section>

            {/* Action Buttons Card */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 md:p-6">
              {/* Keep actions exactly as they are — only style/layout updated */}
              {vendorType === "individual" ? (
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    onClick={() => handleUpdateBookingStatus(3)}
                    disabled={booking.bookingStatus !== 1}
                    className="w-full py-3 rounded-lg"
                  >
                    Start
                  </Button>

                  <Button
                    variant="success"
                    onClick={() => handleUpdateBookingStatus(4)}
                    disabled={booking.bookingStatus !== 3}
                    className="w-full py-3 rounded-lg"
                  >
                    Complete
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="w-full py-3 rounded-lg"
                  >
                    Back
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  No direct actions available for your vendor type.
                </div>
              )}

              <RatingModal
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                bookingId={booking.booking_id}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsPage;

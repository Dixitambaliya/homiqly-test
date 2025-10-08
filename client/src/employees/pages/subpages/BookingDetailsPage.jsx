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
import PaymentBadge from "../../../shared/components/PaymentBadge";

export default function BookingDetailsPage() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/employee/getbookingemployee");
      const bookingsArray = res?.data?.bookings || [];
      const found = bookingsArray.find(
        (b) =>
          Number(b.booking_id) === Number(bookingId) ||
          Number(b.bookingId) === Number(bookingId)
      );

      if (found) {
        setBooking(found);
      } else {
        toast.error("Booking not found");
      }
    } catch (err) {
      console.error("Failed to fetch booking:", err);
      toast.error("Failed to load booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // always fetch fresh data (but preserves location.state if present)
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const handleUpdateBookingStatus = async (status) => {
    try {
      const response = await axios.put(`/api/employee/updatebookingstatus`, {
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
      if (status === 4) {
        setShowRatingModal(true);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      toast.error("Failed to update booking status");
    }
  };

  if (loading || !booking) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded w-1/3" />
            <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded" />
              <div className="col-span-2 space-y-2">
                <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded" />
                <div className="h-6 bg-gray-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded" />
                <div className="h-10 bg-gray-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // helpers
  const subPackages =
    booking.subPackages || booking.sub_packages || booking.packages || [];
  const customerProfileImg =
    booking.userProfileImage || booking.user_profile_image || null;

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/employees" },
          { label: "Bookings", to: "/employees/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />

      <div className="px-4 space-y-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Booking #{booking.booking_id}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {booking.serviceName || booking.service_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.bookingStatus} />
            <div className="text-sm text-gray-500">
              {booking.payment_status}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: main details (3/5) */}
          <div className="col-span-3 space-y-6">
            {/* Service Card */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Service Info
              </h3>
              <div className="mt-3">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {booking.serviceName}
                </h4>
                <div className="mt-1 text-sm text-gray-500">
                  {booking.serviceCategory || booking.service_category}{" "}
                  {booking.serviceTypeName
                    ? `• ${booking.serviceTypeName}`
                    : ""}
                </div>
              </div>
            </section>

            {/* Packages */}
            {subPackages.map((pkg) => (
              <article
                key={pkg.package_id ?? pkg.sub_package_id ?? Math.random()}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800">
                    {pkg.packageMedia ? (
                      <img
                        src={pkg.packageMedia}
                        alt={pkg.packageName || "Package"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) =>
                          (e.currentTarget.src = "/placeholder-rect.png")
                        }
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xs text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {pkg.packageName}
                        </h4>
                        <div className="mt-1 text-sm text-gray-500">
                          Total: $
                          {pkg.totalPrice ?? booking.payment_amount ?? "N/A"} •
                          Duration: {pkg.totalTime ?? "—"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        #{pkg.package_id}
                      </div>
                    </div>

                    {/* Items */}
                    {pkg.items?.length > 0 ? (
                      <ul className="mt-4 space-y-3">
                        {pkg.items.map((item) => (
                          <li
                            key={
                              item.sub_package_id ??
                              item.item_id ??
                              item.itemName
                            }
                            className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                          >
                            <div className="md:col-span-2">
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-slate-800">
                                {item.itemMedia ? (
                                  <img
                                    src={item.itemMedia}
                                    alt={item.itemName || "Item"}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) =>
                                      (e.currentTarget.src =
                                        "/placeholder-square.png")
                                    }
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-xs text-gray-400">
                                    No Image
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="md:col-span-7 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {item.itemName}
                                    {item.quantity ? (
                                      <span className="ml-2 text-xs text-gray-500">
                                        ×{item.quantity}
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {item.timeRequired}{" "}
                                    {item.price ? `• $${item.price}` : ""}
                                  </p>
                                </div>
                                <div className="hidden md:block text-right">
                                  {item.price && (
                                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      ${item.price}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400">
                                    {item.timeRequired}
                                  </div>
                                </div>
                              </div>

                              {/* addons/preferences/consents */}
                              <div className="mt-3 space-y-2">
                                {item.addons?.length > 0 && (
                                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300">
                                    <div className="font-medium text-sm mb-1">
                                      Addons
                                    </div>
                                    <ul className="list-inside list-disc space-y-1">
                                      {item.addons.map((ad) => (
                                        <li
                                          key={ad.addon_id ?? ad.addonName}
                                          className="flex justify-between"
                                        >
                                          <span className="truncate">
                                            {ad.addonName}
                                          </span>
                                          <span className="ml-2 text-xs text-gray-500">
                                            {ad.price ? `$${ad.price}` : ""}
                                            {ad.quantity
                                              ? ` ×${ad.quantity}`
                                              : ""}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {item.preferences?.length > 0 && (
                                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300">
                                    <div className="font-medium text-sm mb-1">
                                      Preferences
                                    </div>
                                    <ul className="list-inside list-disc space-y-1">
                                      {item.preferences.map((pf) => (
                                        <li
                                          key={
                                            pf.preference_id ??
                                            pf.preferenceValue
                                          }
                                          className="flex justify-between"
                                        >
                                          <span className="truncate">
                                            {pf.preferenceValue}
                                          </span>
                                          {pf.preferencePrice ? (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ${pf.preferencePrice}
                                            </span>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {item.consents?.length > 0 && (
                                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-3 text-xs text-gray-700 dark:text-gray-300">
                                    <div className="font-medium text-sm mb-1">
                                      Consents
                                    </div>
                                    <ul className="list-inside list-disc space-y-1">
                                      {item.consents.map((c) => (
                                        <li
                                          key={c.consent_id ?? c.consentText}
                                          className="truncate"
                                        >
                                          {c.consentText}{" "}
                                          {c.answer != null ? (
                                            <span className="text-xs text-gray-500">
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
                            {/* right meta for small screens */}
                            <div className="md:col-span-3 flex md:hidden items-center justify-between">
                              <div className="text-sm font-semibold">
                                ${item.price}
                              </div>
                              <div className="text-xs text-gray-400">
                                {item.timeRequired}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        No items in this package.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {/* Notes */}
            {booking.notes && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Notes
                </h4>
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100">
                  {booking.notes}
                </p>
              </section>
            )}

            {/* Preferences */}
            {booking.preferences?.length > 0 && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Preferences
                </h4>
                <ul className="mt-3 text-sm text-gray-800 dark:text-gray-100 list-disc list-inside">
                  {booking.preferences.map((pref) => (
                    <li key={pref.preference_id ?? pref.preferenceValue}>
                      {pref.preferenceValue}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Media */}
            {booking.bookingMedia && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Attached Media
                </h4>
                <div className="mt-3">
                  <a
                    href={booking.bookingMedia}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View attachment
                  </a>
                </div>
              </section>
            )}
          </div>

          {/* Right: meta & actions (2/5) */}
          <aside className="col-span-2 space-y-6">
            {/* Customer Card */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {customerProfileImg ? (
                    <img
                      src={customerProfileImg}
                      alt={booking.userName}
                      className="w-14 h-14 rounded-full object-cover border border-gray-100 dark:border-slate-800"
                      loading="lazy"
                      onError={(e) =>
                        (e.currentTarget.src = "/avatar-placeholder.png")
                      }
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-sm text-gray-400">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {booking.userName}
                  </h4>
                  <a
                    href={`mailto:${booking.userEmail}`}
                    className="text-xs text-gray-500 block truncate"
                  >
                    {booking.userEmail}
                  </a>
                  <a
                    href={`tel:${booking.userPhone}`}
                    className="text-xs text-gray-500 block truncate"
                  >
                    {booking.userPhone}
                  </a>

                  {booking.userAddress && (
                    <p className="mt-3 text-xs text-gray-500 flex items-start gap-2">
                      <FiMapPin className="text-gray-400 mt-0.5" />
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
            </section>

            {/* Schedule */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Schedule
              </h4>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                  <FiCalendar className="text-gray-400" />
                  <span>{formatDate(booking.bookingDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100">
                  <FiClock className="text-gray-400" />
                  <span>{formatTime(booking.bookingTime)}</span>
                </div>

                {booking.start_time && booking.end_time && (
                  <div className="mt-2 text-xs text-gray-500">
                    Session: {formatDate(booking.start_time)}{" "}
                    {formatTime(booking.start_time)} —{" "}
                    {formatTime(booking.end_time)}
                  </div>
                )}
              </div>
            </section>

            {/* Payment */}
            {/* <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Payment
                  </h4>
                  <div className="mt-2 flex items-center gap-2">
                    <PaymentBadge status={booking.payment_status} />
                    <span className="text-xs text-gray-400 capitalize">
                      {booking.payment_status}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${booking.payment_amount ?? booking.net_amount ?? "0.00"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {(booking.payment_currency || "").toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 dark:border-slate-800" />

              <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                {booking.platform_fee != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Platform fee</span>
                    <span className="font-medium">${booking.platform_fee}</span>
                  </div>
                )}
                {booking.net_amount != null && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-gray-500">Net amount</span>
                    <span className="font-medium">${booking.net_amount}</span>
                  </div>
                )}

                {booking.payment_intent_id && (
                  <div className="mt-3 text-xs text-gray-400 break-all">
                    <span className="font-medium text-gray-700 dark:text-gray-200">
                      Payment ID:
                    </span>{" "}
                    <span className="ml-1">{booking.payment_intent_id}</span>
                  </div>
                )}
              </div>
            </section> */}

            {/* Assigned Employee */}
            {booking.assignedEmployee && (
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Assigned Employee
                </h4>
                <div className="mt-3 text-sm text-gray-900 dark:text-gray-100">
                  <div>{booking.assignedEmployee.name}</div>
                  <div className="text-xs text-gray-500">
                    {booking.assignedEmployee.email}
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.assignedEmployee.phone}
                  </div>
                </div>
              </section>
            )}

            {/* Actions */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm p-6">
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
            </section>
          </aside>
        </div>

        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          bookingId={booking.booking_id}
        />
      </div>
    </div>
  );
}

import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "../../../shared/components/Button";
import StatusBadge from "../../../shared/components/StatusBadge";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import { toast } from "react-toastify";
import RatingModal from "../../components/Modals/RatingModal";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import PaymentBadge from "../../../shared/components/PaymentBadge";
import { Calendar, Clock, Mail, MapPin, Phone } from "lucide-react";

// NOTE: UI rework only. All existing functionality (fetching, status updates, rating modal)
// preserved. This layout focuses on quick access for employees in the field.

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
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="h-48 bg-gray-100 rounded" />
              <div className="col-span-2 space-y-2">
                <div className="h-6 bg-gray-100 rounded" />
                <div className="h-6 bg-gray-100 rounded" />
              </div>
              <div className="col-span-2 space-y-2">
                <div className="h-10 bg-gray-100 rounded" />
                <div className="h-10 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // helpers — support both subPackages and sub_packages shapes
  const subPackages =
    booking.subPackages || booking.sub_packages || booking.packages || [];
  const customerProfileImg =
    booking.userProfileImage || booking.user_profile_image || null;

  // Utility to render question/answer; if answer is null, show placeholder so employee knows it wasn't answered
  const renderAnswer = (ans) => (ans == null ? "—" : String(ans));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/employees" },
          { label: "Bookings", to: "/employees/bookings" },
          { label: `Booking #${booking.booking_id}` },
        ]}
      />

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary column: summary + packages */}
        <main className="lg:col-span-2 space-y-4">
          {/* Top Summary Card - actionable at a glance */}
          <section className="bg-white rounded-lg border p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {customerProfileImg ? (
                  <img
                    src={customerProfileImg}
                    alt={booking.userName || "Customer"}
                    className="w-16 h-16 rounded-md object-cover border"
                    loading="lazy"
                    onError={(e) =>
                      (e.currentTarget.src = "/avatar-placeholder.png")
                    }
                  />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    N/A
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {booking.userName}
                    </h2>
                    <div className="text-sm text-gray-500 truncate">
                      {booking.userAddress}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Booking #{booking.booking_id}
                    </div>
                    <div className="mt-2">
                      <StatusBadge status={booking.bookingStatus} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar />
                    {formatDate(booking.bookingDate)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock />
                    {formatTime(booking.bookingTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone />{" "}
                    <a
                      href={`tel:${booking.userPhone}`}
                      className="hover:underline"
                    >
                      {booking.userPhone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail />{" "}
                    <a
                      href={`mailto:${booking.userEmail}`}
                      className="hover:underline"
                    >
                      {booking.userEmail}
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

                <div className="mt-4 flex items-center gap-2">
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

                  <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="py-2"
                  >
                    Back
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Service summary compact card */}
          <section className="bg-white rounded-lg border p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-600">Service</h3>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <div className="text-md font-semibold text-gray-900">
                  {booking.serviceName}
                </div>
                <div className="text-xs text-gray-500">
                  {booking.serviceCategory || booking.service_category}
                </div>
              </div>
              <div className="text-right">
                <PaymentBadge status={booking.payment_status} />
                <div className="text-sm font-semibold mt-1">
                  ${booking.payment_amount ?? "N/A"}
                </div>
              </div>
            </div>
          </section>

          {/* Packages list — each package becomes a clear card with items and full details (no IDs displayed) */}
          {subPackages.map((pkg, pkgIndex) => (
            <section
              key={`pkg-${pkgIndex}`}
              className="bg-white rounded-lg border p-4 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-md overflow-hidden border flex-shrink-0">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-semibold text-gray-900">
                        {pkg.packageName}
                      </h4>
                      <div className="text-xs text-gray-500 mt-1">
                        {pkg.items?.length ?? 0} item(s) •{" "}
                        {pkg.totalTime ?? "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        ${pkg.totalPrice ?? booking.payment_amount ?? "N/A"}
                      </div>
                      <div className="text-xs text-gray-400">total</div>
                    </div>
                  </div>

                  {/* items */}
                  <div className="mt-3 space-y-3">
                    {pkg.items?.map((item, itemIndex) => (
                      <div
                        key={`item-${pkgIndex}-${itemIndex}`}
                        className="bg-gray-50 border rounded p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 overflow-hidden rounded bg-white border flex-shrink-0">
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

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {item.itemName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.timeRequired ??
                                    item.time_required ??
                                    ""}
                                </div>
                              </div>

                              <div className="text-right text-sm text-gray-700">
                                <div>${item.price ?? "N/A"}</div>
                                <div className="text-xs text-gray-400">
                                  Qty: {item.quantity ?? 1}
                                </div>
                              </div>
                            </div>

                            {/* Full details for addons / preferences / consents — rendered clearly and without IDs */}
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                              {/* Addons column */}
                              <div className="col-span-1">
                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                  Addons
                                </div>
                                {item.addons?.length > 0 ? (
                                  <ul className="space-y-2">
                                    {item.addons.map((ad, adIdx) => (
                                      <li
                                        key={`ad-${adIdx}`}
                                        className="flex items-start justify-between"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate font-medium">
                                            {ad.addonName}
                                          </div>
                                          {ad.addonMedia && (
                                            <div className="text-xs text-gray-400 truncate">
                                              Media attached
                                            </div>
                                          )}
                                        </div>
                                        <div className="ml-2 text-xs text-gray-500">
                                          {ad.quantity ? `×${ad.quantity}` : ""}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No addons
                                  </div>
                                )}
                              </div>

                              {/* Preferences column */}
                              <div className="col-span-1">
                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                  Preferences
                                </div>
                                {item.preferences?.length > 0 ? (
                                  <ul className="space-y-2">
                                    {item.preferences.map((pf, pfIdx) => (
                                      <li
                                        key={`pf-${pfIdx}`}
                                        className="flex items-start justify-between"
                                      >
                                        <div className="min-w-0">
                                          <div className="truncate">
                                            {pf.preferenceValue}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No preferences
                                  </div>
                                )}
                              </div>

                              {/* Consents column */}
                              <div className="col-span-1">
                                <div className="text-xs font-semibold text-gray-700 mb-2">
                                  Consents
                                </div>
                                {item.consents?.length > 0 ? (
                                  <ul className="space-y-2">
                                    {item.consents.map((c, cIdx) => (
                                      <li key={`c-${cIdx}`} className="">
                                        <div className="text-sm font-medium truncate">
                                          {c.consentText}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          Answer: {renderAnswer(c.answer)}
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-xs text-gray-400">
                                    No consents
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}

          {/* Notes and booking-level preferences */}
          {booking.notes && (
            <section className="bg-white rounded-lg border p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600">Notes</h4>
              <p className="mt-2 text-sm text-gray-800">{booking.notes}</p>
            </section>
          )}

          {booking.preferences?.length > 0 && (
            <section className="bg-white rounded-lg border p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600">
                Booking Preferences
              </h4>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-800">
                {booking.preferences.map((p, idx) => (
                  <li key={`bp-${idx}`}>{p.preferenceValue}</li>
                ))}
              </ul>
            </section>
          )}

          {booking.bookingMedia && (
            <section className="bg-white rounded-lg border p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600">
                Attached Media
              </h4>
              <div className="mt-2">
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
        </main>

        {/* Right column: quick actions, schedule, assigned employee */}
        <aside className="space-y-4">
          <section className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Schedule</h4>
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

              {booking.start_time && booking.end_time && (
                <div className="mt-2 text-xs text-gray-500">
                  Session: {formatDate(booking.start_time)}{" "}
                  {formatTime(booking.start_time)} —{" "}
                  {formatTime(booking.end_time)}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PaymentBadge status={booking.payment_status} />
                  <span className="text-sm text-gray-700 capitalize">
                    {booking.payment_status}
                  </span>
                </div>
                <div className="text-sm font-semibold">
                  ${booking.payment_amount ?? "N/A"}
                </div>
              </div>
            </div>
          </section>

          {booking.assignedEmployee && (
            <section className="bg-white rounded-lg border p-4 shadow-sm">
              <h4 className="text-sm font-medium text-gray-600">Assigned To</h4>
              <div className="mt-3 text-sm text-gray-900">
                <div className="font-medium">
                  {booking.assignedEmployee.name}
                </div>
                <div className="text-xs text-gray-500">
                  {booking.assignedEmployee.email}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {booking.assignedEmployee.phone}
                </div>
              </div>
            </section>
          )}

          <section className="bg-white rounded-lg border p-4 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Actions</h4>
            <div className="mt-3 space-y-3">
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
                <Phone /> Call
              </a>
              <a
                href={`mailto:${booking.userEmail}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Mail /> Email
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  booking.userAddress || ""
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <MapPin /> Map
              </a>
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
  );
}

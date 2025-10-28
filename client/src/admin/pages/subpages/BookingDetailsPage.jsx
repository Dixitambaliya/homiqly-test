import { useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { formatDate, formatTime } from "../../../shared/utils/dateUtils";
import StatusBadge from "../../../shared/components/StatusBadge";
import LoadingSlider from "../../../shared/components/LoadingSpinner";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { toast } from "react-toastify";
import { Button } from "../../../shared/components/Button";
import PaymentBadge from "../../../shared/components/PaymentBadge";
import { Calendar, Clock, MapPin } from "lucide-react";

// Utilities (kept from original file) --------------------------------------------------
const getField = (obj, ...keys) => {
  for (const k of keys) {
    if (typeof k === "string") {
      if (k.includes(".")) {
        const parts = k.split(".");
        let cur = obj;
        let ok = true;
        for (const p of parts) {
          if (cur && p in cur) cur = cur[p];
          else {
            ok = false;
            break;
          }
        }
        if (ok && cur !== undefined) return cur;
      } else if (obj && k in obj && obj[k] !== undefined) {
        return obj[k];
      }
    }
  }
  return undefined;
};

const safeFloat = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const computePackageTotals = (pkg) => {
  let price = 0;
  if (Array.isArray(pkg.items)) {
    for (const it of pkg.items) {
      const p = safeFloat(getField(it, "price"));
      const q = safeFloat(getField(it, "quantity")) || 1;
      price += p * q;
    }
  }
  if (Array.isArray(pkg.addons)) {
    for (const ad of pkg.addons) {
      const p = safeFloat(getField(ad, "price"));
      const q = safeFloat(getField(ad, "quantity")) || 1;
      price += p * q;
    }
  }

  const timeParts = [];
  if (Array.isArray(pkg.items)) {
    for (const it of pkg.items) {
      const t = getField(it, "timeRequired", "time_required", "duration");
      if (t) timeParts.push(t);
    }
  }
  if (Array.isArray(pkg.addons)) {
    for (const ad of pkg.addons) {
      const at = getField(ad, "addonTime", "time");
      if (at) timeParts.push(at);
    }
  }
  const totalTime = timeParts.length ? timeParts.join(" • ") : undefined;

  return {
    totalPrice: price.toFixed(2),
    totalTime,
  };
};

const aggregateFromPackages = (packages = []) => {
  const prefs = [];
  const addons = [];
  const consents = [];
  for (const p of packages) {
    if (Array.isArray(p.preferences)) prefs.push(...p.preferences);
    if (Array.isArray(p.addons)) addons.push(...p.addons);
    if (Array.isArray(p.consents)) consents.push(...p.consents);
    else if (Array.isArray(p.concents)) consents.push(...p.concents);
    else if (Array.isArray(p.censents)) consents.push(...p.censents);
  }
  return { prefs, addons, consents };
};

// Admin UI component ---------------------------------------------------------------------
export default function AdminBookingDetailsPage() {
  const { bookingId } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    if (booking) fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchBooking = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/getbookings");
      const bookings = res?.data?.bookings || [];
      const found = bookings.find(
        (b) =>
          Number(getField(b, "booking_id", "id", "bookingId")) ===
          Number(bookingId)
      );
      if (found) setBooking(found);
      else toast.error("Booking not found");
    } catch (error) {
      console.error("Failed to fetch booking:", error);
      toast.error("Failed to fetch booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEligibleVendors = async () => {
      const vendorName =
        getField(booking || {}, "vendorName", "vendor_name") || null;
      if (booking && !vendorName) {
        try {
          setLoading(true);
          const res = await api.get(
            `/api/booking/get-eligible-vendors/${getField(
              booking,
              "booking_id",
              "id",
              "bookingId"
            )}`
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
        booking_id: getField(booking, "booking_id", "id", "bookingId"),
        vendor_id: selectedVendorId,
      });

      toast.success(res.data.message || "Vendor assigned successfully");
      await fetchBooking();
      setSelectedVendorId("");
      setEligibleVendors([]);
    } catch (err) {
      console.error(err);
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

  // normalized fields
  const bookingIdVal =
    getField(booking, "booking_id", "id", "bookingId") || booking.bookingId;
  const bookingDate = getField(booking, "bookingDate", "booking_date", "date");
  const bookingTime = getField(booking, "bookingTime", "booking_time", "time");
  const bookingStatus = getField(booking, "bookingStatus", "booking_status");
  const notes = getField(booking, "notes", "note");
  const bookingMedia = getField(
    booking,
    "bookingMedia",
    "booking_media",
    "media"
  );

  const userName =
    getField(booking, "userName", "user_name", "customerName") ||
    getField(booking, "user_name");
  const userEmail =
    getField(booking, "userEmail", "user_email", "email") ||
    getField(booking, "user_email");
  const userPhone =
    getField(booking, "userPhone", "user_phone", "phone") ||
    getField(booking, "user_phone");
  const userAddress = getField(
    booking,
    "userAddress",
    "user_address",
    "address"
  );
  const userState = getField(booking, "userState", "state");
  const userPostalCode = getField(
    booking,
    "userPostalCode",
    "user_postal_code",
    "postalCode"
  );

  const serviceName =
    getField(booking, "serviceName", "service_name") ||
    getField(booking, "service", "serviceTitle");
  const serviceCategory =
    getField(booking, "serviceCategory", "service_category") ||
    getField(booking, "category");
  const serviceTypeName = getField(
    booking,
    "serviceTypeName",
    "service_type_name"
  );
  const serviceTypeMedia = getField(
    booking,
    "serviceTypeMedia",
    "service_type_media",
    "serviceMedia"
  );

  const packages = Array.isArray(getField(booking, "packages"))
    ? getField(booking, "packages")
    : [];
  const {
    prefs: aggregatedPackagePreferences,
    addons: pkgAddons,
    consents,
  } = aggregateFromPackages(packages);

  const bookingLevelAddons = Array.isArray(getField(booking, "addons"))
    ? getField(booking, "addons")
    : [];
  const bookingLevelPreferences = Array.isArray(
    getField(booking, "preferences")
  )
    ? getField(booking, "preferences")
    : [];

  const allPreferences = [
    ...bookingLevelPreferences,
    ...aggregatedPackagePreferences,
  ];
  const allAddons = [...bookingLevelAddons, ...pkgAddons];

  const paymentStatus = getField(
    booking,
    "payment_status",
    "paymentStatus",
    "paymentStatusText"
  );
  const paymentAmount =
    getField(booking, "payment_amount", "paymentAmount", "amount") || 0;
  const paymentCurrency =
    getField(booking, "payment_currency", "paymentCurrency") || "usd";
  const paymentIntentId = getField(
    booking,
    "payment_intent_id",
    "paymentIntentId",
    "payment_id"
  );

  const vendorName =
    getField(booking, "vendorName", "vendor_name") ||
    getField(booking, "vendor", "assignedVendorName");
  const vendorType = getField(booking, "vendorType", "vendor_type");
  const vendorContactPerson = getField(
    booking,
    "vendorContactPerson",
    "vendor_contact_person"
  );
  const vendorEmail = getField(booking, "vendorEmail", "vendor_email");
  const vendorPhone = getField(booking, "vendorPhone", "vendor_phone");

  // compact renderer for answers
  const renderAnswer = (ans) => (ans == null || ans === "" ? "—" : String(ans));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: `Booking #${bookingIdVal}` },
        ]}
      />

      {/* header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{`Booking #${bookingIdVal}`}</h2>
          <p className="text-sm text-gray-500 mt-1">{serviceName || "—"}</p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={bookingStatus} />
          {/* <div className="text-sm text-gray-500">{paymentStatus}</div> */}
        </div>
      </div>

      {/* layout: left = details (3), right = meta/actions (2) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: details */}
        <div className="col-span-3 space-y-4">
          {/* Compact summary card */}
          <section className="bg-white rounded-2xl border p-4 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border">
                {serviceTypeMedia ? (
                  <img
                    src={serviceTypeMedia}
                    alt={serviceName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {serviceName || "—"}
                </h3>
                <div className="mt-2 text-sm text-gray-600">
                  {serviceCategory
                    ? `${serviceCategory} ${
                        serviceTypeName ? `• ${serviceTypeName}` : ""
                      }`
                    : "Service details unavailable"}
                </div>

                <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4" />{" "}
                  <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
                  <Clock className="ml-4 w-4 h-4" />{" "}
                  <span>{bookingTime ? formatTime(bookingTime) : "—"}</span>
                </div>

                <p className="mt-3 text-sm text-gray-700">
                  Quick: customer contact and full package breakdown are below —
                  IDs and raw identifiers are intentionally hidden for clarity.
                </p>
              </div>
            </div>
          </section>

          {/* Packages list: each as a card with items and fully expanded details (addons / prefs / consents) */}
          {packages.length === 0 ? (
            <div className="bg-white rounded-2xl border p-6 shadow-sm">
              <p className="text-sm text-gray-500">
                No packages selected for this booking.
              </p>
            </div>
          ) : (
            packages.map((pkg, pi) => {
              const packageMedia = getField(
                pkg,
                "packageMedia",
                "package_media",
                "media"
              );
              const packageName =
                getField(pkg, "packageName", "package_name", "name") ||
                "Package";
              const totals = computePackageTotals(pkg);

              return (
                <article
                  key={`pkg-${pi}`}
                  className="bg-white rounded-2xl border p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-md overflow-hidden border flex-shrink-0">
                      {packageMedia ? (
                        <img
                          src={packageMedia}
                          alt={packageName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {packageName}
                        </h4>
                        <div className="text-sm text-gray-600">
                          ${totals.totalPrice}{" "}
                          {totals.totalTime && (
                            <span className="ml-2 text-xs text-gray-500">
                              • {totals.totalTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* items */}
                      <div className="mt-4 space-y-3">
                        {Array.isArray(pkg.items) && pkg.items.length > 0 ? (
                          pkg.items.map((it, idx) => {
                            const itemName =
                              getField(it, "itemName", "item_name", "name") ||
                              "Item";
                            const itemMedia = getField(
                              it,
                              "itemMedia",
                              "item_media",
                              "media"
                            );
                            const itemQty = getField(it, "quantity") || 1;
                            const itemTime =
                              getField(
                                it,
                                "timeRequired",
                                "time_required",
                                "duration"
                              ) || "";
                            const itemPrice = getField(it, "price") || 0;

                            return (
                              <div
                                key={`it-${pi}-${idx}`}
                                className="bg-gray-50 border rounded-lg p-3"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-14 h-14 overflow-hidden rounded bg-white border flex-shrink-0">
                                    {itemMedia ? (
                                      <img
                                        src={itemMedia}
                                        alt={itemName}
                                        className="w-full h-full object-cover"
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
                                          {itemName}{" "}
                                          <span className="text-xs text-gray-500">
                                            ×{itemQty}
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {itemTime ? `${itemTime} • ` : ""}$
                                          {parseFloat(itemPrice || 0).toFixed(
                                            2
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-right text-sm text-gray-700">
                                        <div className="font-semibold">
                                          $
                                          {parseFloat(itemPrice || 0).toFixed(
                                            2
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {itemTime}
                                        </div>
                                      </div>
                                    </div>

                                    {/* detailed three-column meta: addons / preferences / consents */}
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
                                      {/* ADDONS */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                          Addons
                                        </div>
                                        {Array.isArray(it.addons) &&
                                        it.addons.length > 0 ? (
                                          <ul className="space-y-1">
                                            {it.addons.map((ad, aIdx) => (
                                              <li
                                                key={`ad-${aIdx}`}
                                                className="flex items-start justify-between"
                                              >
                                                <div className="min-w-0">
                                                  <div className="truncate font-medium">
                                                    {getField(
                                                      ad,
                                                      "addonName",
                                                      "name"
                                                    ) || "Addon"}
                                                  </div>
                                                  {getField(
                                                    ad,
                                                    "addonTime"
                                                  ) && (
                                                    <div className="text-xs text-gray-400">
                                                      {getField(
                                                        ad,
                                                        "addonTime"
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="ml-2 text-xs text-gray-500">
                                                  {getField(ad, "quantity")
                                                    ? `×${getField(
                                                        ad,
                                                        "quantity"
                                                      )}`
                                                    : ""}{" "}
                                                  {getField(ad, "price")
                                                    ? `$${parseFloat(
                                                        getField(ad, "price") ||
                                                          0
                                                      ).toFixed(2)}`
                                                    : ""}
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

                                      {/* PREFERENCES */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                          Preferences
                                        </div>
                                        {Array.isArray(it.preferences) &&
                                        it.preferences.length > 0 ? (
                                          <ul className="space-y-1">
                                            {it.preferences.map((pf, pfIdx) => (
                                              <li
                                                key={`pf-${pfIdx}`}
                                                className="flex items-start justify-between"
                                              >
                                                <div className="min-w-0">
                                                  <div className="truncate">
                                                    {getField(
                                                      pf,
                                                      "preferenceValue",
                                                      "value"
                                                    ) || "—"}
                                                  </div>
                                                </div>
                                                {/* price optional */}
                                                <div className="ml-2 text-xs text-gray-500">
                                                  {getField(
                                                    pf,
                                                    "preferencePrice"
                                                  )
                                                    ? `$${parseFloat(
                                                        getField(
                                                          pf,
                                                          "preferencePrice"
                                                        ) || 0
                                                      ).toFixed(2)}`
                                                    : ""}
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

                                      {/* CONSENTS */}
                                      <div>
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                          Consents
                                        </div>
                                        {Array.isArray(it.consents) &&
                                        it.consents.length > 0 ? (
                                          <ul className="space-y-2">
                                            {it.consents.map((c, cIdx) => (
                                              <li key={`c-${cIdx}`}>
                                                <div className="text-sm font-medium truncate">
                                                  {getField(
                                                    c,
                                                    "question",
                                                    "consentText",
                                                    "q"
                                                  ) || "Consent"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  Answer:{" "}
                                                  {renderAnswer(
                                                    getField(c, "answer", "a")
                                                  )}
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
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-500">
                            No items in this package.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}

          {/* Booking-level notes */}
          {notes && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700">Notes</h4>
              <p className="mt-2 text-sm text-gray-800">{notes}</p>
            </section>
          )}

          {/* Aggregate Preferences */}
          {allPreferences.length > 0 && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  All Preferences
                </h4>
                <span className="text-xs text-gray-400">
                  {allPreferences.length} selected
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {allPreferences.map((p, idx) => (
                  <div
                    key={`ap-${idx}`}
                    className="flex items-start justify-between bg-gray-50 rounded p-3 border"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        {getField(p, "preferenceValue", "value") || "—"}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getField(p, "preferencePrice")
                        ? `$${parseFloat(
                            getField(p, "preferencePrice") || 0
                          ).toFixed(2)}`
                        : "Free"}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Aggregate Consents */}
          {consents.length > 0 && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                  All Consents
                </h4>
                <span className="text-xs text-gray-400">
                  {consents.length} items
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {consents.map((c, idx) => (
                  <div
                    key={`cons-${idx}`}
                    className="bg-gray-50 rounded p-3 border"
                  >
                    <div className="text-sm font-medium">
                      {getField(c, "question", "consentText", "q") || "Consent"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Answer: {renderAnswer(getField(c, "answer", "a"))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Booking media */}
          {bookingMedia && (
            <section className="bg-white rounded-2xl border p-5 shadow-sm">
              <h4 className="text-sm font-medium text-gray-700">
                Attached Media
              </h4>
              <div className="mt-3">
                <img
                  src={bookingMedia}
                  alt="Attached media"
                  className="w-full h-auto max-h-[360px] object-cover rounded"
                />
                <div className="mt-2">
                  <a
                    href={bookingMedia}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View attachment
                  </a>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT: meta & actions */}
        <aside className="col-span-2 space-y-4">
          {/* Customer card */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden border">
                {getField(booking, "userProfileImage", "user_profile_image") ? (
                  <img
                    src={getField(
                      booking,
                      "userProfileImage",
                      "user_profile_image"
                    )}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    N/A
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {userName || "—"}
                </div>
                {userEmail && (
                  <a
                    href={`mailto:${userEmail}`}
                    className="text-xs text-gray-500 block truncate"
                  >
                    {userEmail}
                  </a>
                )}
                {userPhone && (
                  <a
                    href={`tel:${userPhone}`}
                    className="text-xs text-gray-500 block truncate"
                  >
                    {userPhone}
                  </a>
                )}
                {userAddress && (
                  <p className="mt-2 text-xs text-gray-500 flex items-start gap-2">
                    <MapPin className="text-gray-400 mt-0.5" />{" "}
                    <span className="truncate">
                      {userAddress}
                      {userState ? `, ${userState}` : ""}
                      {userPostalCode ? ` • ${userPostalCode}` : ""}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Schedule card */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-700">Schedule</h4>
            <div className="mt-3 text-sm text-gray-900">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" />{" "}
                <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Clock className="text-gray-400" />{" "}
                <span>{bookingTime ? formatTime(bookingTime) : "—"}</span>
              </div>
              {getField(booking, "start_time") &&
                getField(booking, "end_time") && (
                  <div className="mt-2 text-xs text-gray-500">
                    Session: {formatDate(getField(booking, "start_time"))}{" "}
                    {formatTime(getField(booking, "start_time"))} —{" "}
                    {formatTime(getField(booking, "end_time"))}
                  </div>
                )}
            </div>
          </section>

          {/* Payment card */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">Payment</h4>
                <div className="mt-2 flex items-center gap-3">
                  <PaymentBadge status={paymentStatus} />
                  {/* <span className="text-xs text-gray-400 capitalize">
                    {paymentStatus || "—"}i8 
                  </span> */}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900">
                  ${parseFloat(paymentAmount || 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  {(paymentCurrency || "").toUpperCase()}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100" />
            <div className="mt-3 text-sm text-gray-600">
              {getField(booking, "platform_fee") != null && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="font-medium">
                    $
                    {parseFloat(getField(booking, "platform_fee") || 0).toFixed(
                      2
                    )}
                  </span>
                </div>
              )}
              {getField(booking, "net_amount") != null && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-500">Net amount</span>
                  <span className="font-medium">
                    $
                    {parseFloat(getField(booking, "net_amount") || 0).toFixed(
                      2
                    )}
                  </span>
                </div>
              )}
              {paymentIntentId && (
                <div className="mt-3 text-xs text-gray-400 break-all">
                  <span className="font-medium text-gray-700">Payment ID:</span>{" "}
                  <span className="ml-1">{paymentIntentId}</span>
                </div>
              )}
            </div>
          </section>

          {/* Vendor card / assign */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">Vendor</h4>
            {vendorName ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-gray-900 font-medium">
                  {vendorName} {vendorType ? `(${vendorType})` : ""}
                </p>
                {vendorContactPerson && (
                  <p className="text-sm text-gray-500">
                    Contact: {vendorContactPerson}
                  </p>
                )}
                {vendorEmail && (
                  <p className="text-sm text-gray-500">{vendorEmail}</p>
                )}
                {vendorPhone && (
                  <p className="text-sm text-gray-500">{vendorPhone}</p>
                )}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <select
                  className="border px-3 py-2 rounded w-full"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                >
                  <option value="">Select vendor</option>
                  {eligibleVendors.map((v) => (
                    <option key={v.vendor_id} value={v.vendor_id}>
                      {v.vendorName} ({v.vendorType})
                    </option>
                  ))}
                </select>
                <Button
                  onClick={handleAssignVendor}
                  isLoading={loading}
                  className="w-full"
                >
                  Assign vendor
                </Button>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <h4 className="text-sm font-medium text-gray-600">
              Raw IDs & Metadata
            </h4>
            <div className="mt-3 text-sm text-gray-800 space-y-2">
              <div>
                <span className="font-medium">Booking ID:</span> {bookingIdVal}
              </div>
              <div>
                <span className="font-medium">User ID:</span>{" "}
                {getField(booking, "user_id", "userId", "customer_id") || "—"}
              </div>
              <div>
                <span className="font-medium">Vendor ID:</span>{" "}
                {getField(
                  booking,
                  "vendor_id",
                  "vendorId",
                  "assigned_vendor_id"
                ) || "—"}
              </div>
              <div>
                <span className="font-medium">Payment Intent ID:</span>{" "}
                {paymentIntentId || "—"}
              </div>
              <div>
                <span className="font-medium">Payment Status:</span>{" "}
                {paymentStatus || "—"} •{" "}
                <span className="font-medium">Amount:</span> $
                {parseFloat(paymentAmount || 0).toFixed(2)}{" "}
                {paymentCurrency?.toUpperCase()}
              </div>

              <div className="mt-2">
                <div className="text-xs text-gray-500 font-medium">
                  Packages & item IDs
                </div>
                <div className="mt-1 space-y-1 text-xs text-gray-700">
                  {packages.length === 0 && <div>No packages</div>}
                  {packages.map((p, pi) => (
                    <div
                      key={`meta-p-${pi}`}
                      className="bg-gray-50 border rounded p-2"
                    >
                      <div>
                        <strong>Package:</strong>{" "}
                        {getField(p, "packageName", "package_name") || "—"}{" "}
                        <span className="text-gray-500">
                          (ID:{" "}
                          {getField(p, "package_id", "id", "packageId") || "—"})
                        </span>
                      </div>
                      {Array.isArray(p.items) &&
                        p.items.map((it, ii) => (
                          <div key={`meta-it-${ii}`} className="ml-3 mt-1">
                            <div>
                              Item:{" "}
                              {getField(it, "itemName", "item_name", "name") ||
                                "—"}{" "}
                              <span className="text-gray-500">
                                (ID:{" "}
                                {getField(it, "item_id", "id", "itemId") || "—"}
                                )
                              </span>
                            </div>
                            {Array.isArray(it.addons) &&
                              it.addons.length > 0 && (
                                <div className="ml-4 text-xs text-gray-600">
                                  Addons:{" "}
                                  {it.addons
                                    .map(
                                      (a) =>
                                        `${
                                          getField(a, "addonName", "name") ||
                                          "—"
                                        }(ID:${
                                          getField(a, "addon_id", "id") || "—"
                                        })`
                                    )
                                    .join(", ")}
                                </div>
                              )}
                            {Array.isArray(it.preferences) &&
                              it.preferences.length > 0 && (
                                <div className="ml-4 text-xs text-gray-600">
                                  Preferences:{" "}
                                  {it.preferences
                                    .map(
                                      (pp) =>
                                        `${
                                          getField(
                                            pp,
                                            "preferenceValue",
                                            "value"
                                          ) || "—"
                                        }(ID:${
                                          getField(pp, "preference_id", "id") ||
                                          "—"
                                        })`
                                    )
                                    .join(", ")}
                                </div>
                              )}
                            {Array.isArray(it.consents) &&
                              it.consents.length > 0 && (
                                <div className="ml-4 text-xs text-gray-600">
                                  Consents:{" "}
                                  {it.consents
                                    .map(
                                      (cc) =>
                                        `${
                                          getField(
                                            cc,
                                            "question",
                                            "consentText",
                                            "q"
                                          ) || "Consent"
                                        }(ID:${
                                          getField(cc, "consent_id", "id") ||
                                          "—"
                                        })`
                                    )
                                    .join(", ")}
                                </div>
                              )}
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border p-5 shadow-sm">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full py-3"
              >
                Back
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

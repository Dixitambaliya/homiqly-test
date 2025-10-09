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

/**
 * Helper utilities to normalise booking object fields from different API shapes.
 */
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

// Aggregate preferences/addons/consents from multiple package shapes.
// Also accept mis-typed "concents" from some API versions.
const aggregateFromPackages = (packages = []) => {
  const prefs = [];
  const addons = [];
  const consents = [];
  for (const p of packages) {
    if (Array.isArray(p.preferences)) prefs.push(...p.preferences);
    if (Array.isArray(p.addons)) addons.push(...p.addons);

    // many APIs name consents differently: consents, concents (typo), censents etc.
    if (Array.isArray(p.consents)) consents.push(...p.consents);
    else if (Array.isArray(p.concents)) consents.push(...p.concents);
    else if (Array.isArray(p.censents)) consents.push(...p.censents);
  }
  return { prefs, addons, consents };
};

const BookingDetailsPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(false);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");

  useEffect(() => {
    if (!booking) fetchBooking();
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
  const vendorId =
    getField(booking, "vendor_id", "vendorId", "assigned_vendor_id") ||
    getField(booking, "vendorId");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: `Booking #${bookingIdVal}` },
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{`Booking #${bookingIdVal}`}</h2>
          <p className="text-sm text-gray-500 mt-1">{serviceName || "—"}</p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={bookingStatus} />
          <div className="text-sm text-gray-500">{paymentStatus}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT */}
        <div className="col-span-3 space-y-6">
          {/* Service card */}
          <section className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-6 md:p-8">
            <div className="flex gap-5 items-start">
              <div className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-gray-100 ">
                {serviceTypeMedia ? (
                  <img
                    src={serviceTypeMedia}
                    alt={serviceName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) =>
                      (e.currentTarget.src = "/placeholder-rect.png")
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50  flex items-center justify-center text-sm text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-semibold text-gray-900  truncate">
                  {serviceName}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {serviceCategory && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-xs text-gray-600">
                      {serviceCategory}
                    </span>
                  )}
                  {serviceTypeName && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-xs text-gray-600">
                      {serviceTypeName}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">Service</span>
                </div>

                <p className="mt-3 text-sm text-gray-600 ">
                  {serviceName
                    ? `Details for the "${serviceName}" booking — all package and item information is below.`
                    : "Service information not available."}
                </p>
              </div>
            </div>
          </section>

          {/* Packages */}
          <section className="space-y-4">
            {packages.length === 0 ? (
              <div className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-6">
                <p className="text-sm text-gray-500">No packages selected.</p>
              </div>
            ) : (
              packages.map((pkg) => {
                const pkgId = getField(pkg, "package_id", "id", "packageId");
                const packageMedia = getField(
                  pkg,
                  "packageMedia",
                  "package_media",
                  "media"
                );
                const packageName =
                  getField(pkg, "packageName", "package_name", "name") ||
                  getField(pkg, "packageTitle") ||
                  "Package";
                const totals = computePackageTotals(pkg);

                return (
                  <article
                    key={pkgId || packageName}
                    className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow"
                  >
                    {/* package header */}
                    <div className="flex items-start gap-4 md:gap-6">
                      <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden border border-gray-100 ">
                        {packageMedia ? (
                          <img
                            src={packageMedia}
                            alt={packageName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) =>
                              (e.currentTarget.src = "/placeholder-rect.png")
                            }
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-50  flex items-center justify-center text-sm text-gray-400">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <h4 className="text-base md:text-lg font-semibold text-gray-900  truncate">
                            {packageName}
                          </h4>

                          <div className="ml-auto flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-sm font-medium text-gray-700 ">
                              ${totals.totalPrice}
                            </span>
                            {totals.totalTime && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-50  border border-gray-100  text-xs text-gray-600">
                                {totals.totalTime}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 text-sm text-gray-600 ">
                          Package ID:{" "}
                          <span className="text-xs text-gray-400">
                            #{pkgId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* items grid */}
                    {Array.isArray(pkg.items) && pkg.items.length > 0 && (
                      <ul className="mt-5 space-y-4">
                        {pkg.items.map((item) => {
                          const itemId = getField(
                            item,
                            "item_id",
                            "id",
                            "itemId"
                          );
                          const itemMedia = getField(
                            item,
                            "itemMedia",
                            "item_media",
                            "media"
                          );
                          const itemName =
                            getField(item, "itemName", "item_name") ||
                            getField(item, "name") ||
                            "Item";
                          const itemQuantity = getField(item, "quantity") || 1;
                          const itemTime =
                            getField(
                              item,
                              "timeRequired",
                              "time_required",
                              "duration"
                            ) || "";
                          const itemPrice = getField(item, "price") || 0;

                          return (
                            <li
                              key={itemId || itemName}
                              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start"
                            >
                              {/* image */}
                              <div className="md:col-span-2">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border border-gray-100 ">
                                  {itemMedia ? (
                                    <img
                                      src={itemMedia}
                                      alt={itemName}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) =>
                                        (e.currentTarget.src =
                                          "/placeholder-square.png")
                                      }
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gray-50  flex items-center justify-center text-xs text-gray-400">
                                      No Image
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* main content */}
                              <div className="md:col-span-7 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="text-sm md:text-base font-medium text-gray-900  truncate">
                                      {itemName}
                                      <span className="ml-2 text-xs text-gray-500">
                                        ×{itemQuantity}
                                      </span>
                                    </p>
                                    <p className="mt-1 text-xs md:text-sm text-gray-500">
                                      {itemTime ? `${itemTime} • ` : ""}$
                                      {parseFloat(itemPrice || 0).toFixed(2)}
                                    </p>
                                  </div>

                                  <div className="hidden md:flex md:flex-col md:items-end md:justify-between md:col-span-3">
                                    <div className="text-sm font-semibold text-gray-900 ">
                                      ${parseFloat(itemPrice || 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                      {itemTime}
                                    </div>
                                  </div>
                                </div>

                                {/* grouped meta cards: addons, preferences, consents */}
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                  {/* Addons */}
                                  {Array.isArray(item.addons) &&
                                    item.addons.length > 0 && (
                                      <div className="bg-gray-50  rounded-lg p-3 border border-gray-100  text-xs text-gray-700 ">
                                        <div className="font-semibold text-xs mb-2">
                                          Addons
                                        </div>
                                        <ul className="space-y-1">
                                          {item.addons.map((ad) => (
                                            <li
                                              key={getField(
                                                ad,
                                                "addon_id",
                                                "id",
                                                "name"
                                              )}
                                              className="flex justify-between"
                                            >
                                              <span className="truncate">
                                                {getField(
                                                  ad,
                                                  "addonName",
                                                  "name"
                                                )}
                                              </span>
                                              <span className="text-xs text-gray-500">{`$${parseFloat(
                                                getField(ad, "price") || 0
                                              ).toFixed(2)}`}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                  {/* Preferences */}
                                  {Array.isArray(item.preferences) &&
                                    item.preferences.length > 0 && (
                                      <div className="bg-gray-50  rounded-lg p-3 border border-gray-100  text-xs text-gray-700 ">
                                        <div className="font-semibold text-xs mb-2">
                                          Preferences
                                        </div>
                                        <ul className="space-y-1">
                                          {item.preferences.map((pf) => (
                                            <li
                                              key={getField(
                                                pf,
                                                "preference_id",
                                                "id",
                                                "preferenceValue"
                                              )}
                                              className="flex justify-between"
                                            >
                                              <span className="truncate">
                                                {getField(
                                                  pf,
                                                  "preferenceValue",
                                                  "value",
                                                  "preference"
                                                ) || "—"}
                                              </span>
                                              {getField(
                                                pf,
                                                "preferencePrice"
                                              ) && (
                                                <span className="text-xs text-gray-500">{`$${parseFloat(
                                                  getField(
                                                    pf,
                                                    "preferencePrice"
                                                  ) || 0
                                                ).toFixed(2)}`}</span>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                  {/* Consents */}
                                  {Array.isArray(item.consents) &&
                                    item.consents.length > 0 && (
                                      <div className="bg-gray-50  rounded-lg p-3 border border-gray-100  text-xs text-gray-700 ">
                                        <div className="font-semibold text-xs mb-2">
                                          Consents
                                        </div>
                                        <ul className="space-y-1">
                                          {item.consents.map((c) => (
                                            <li
                                              key={getField(
                                                c,
                                                "consent_id",
                                                "id",
                                                "question"
                                              )}
                                            >
                                              <div className="text-xs text-gray-800 ">
                                                {getField(
                                                  c,
                                                  "question",
                                                  "consentText",
                                                  "q"
                                                )}
                                              </div>
                                              {getField(c, "answer", "a") && (
                                                <div className="text-xs text-gray-500">
                                                  Answer:{" "}
                                                  {getField(c, "answer", "a")}
                                                </div>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                </div>
                              </div>

                              {/* mobile/meta column */}
                              <div className="md:col-span-3 flex items-center justify-between md:hidden mt-2">
                                <div className="text-sm font-semibold">
                                  ${parseFloat(itemPrice || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {itemTime}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </article>
                );
              })
            )}
          </section>

          {/* Booking-level Notes/Preferences/Consents/Media */}
          {notes && (
            <section className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-6">
              <h4 className="text-sm md:text-base font-medium text-gray-700 ">
                Notes
              </h4>
              <p className="mt-2 text-sm text-gray-800 ">{notes}</p>
            </section>
          )}

          {/* --- Preferences & Consents (Minimals.cc style) --- */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            {/* Preferences Card */}
            {allPreferences?.length > 0 && (
              <section
                aria-labelledby="prefs-heading"
                className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-5 md:p-6"
              >
                <div className="flex items-center justify-between">
                  <h4
                    id="prefs-heading"
                    className="text-sm md:text-base font-medium text-gray-700 "
                  >
                    Preferences
                  </h4>
                  <span className="text-xs text-gray-400">
                    {allPreferences.length} selected
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {allPreferences.map((pref, idx) => {
                    const label =
                      getField(
                        pref,
                        "preferenceValue",
                        "value",
                        "preference"
                      ) || "—";
                    const price = getField(pref, "preferencePrice", "price");
                    return (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 bg-gray-50  border border-gray-100  rounded-lg p-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900  truncate">
                            {label}
                          </div>
                          {/* optional small meta */}
                          {getField(pref, "note") && (
                            <div className="text-xs text-gray-400 mt-1 truncate">
                              {getField(pref, "note")}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {price != null && price !== "" ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100  text-gray-700  border border-gray-100 ">
                              ${parseFloat(price || 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-gray-400">
                              Free
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Consents Card */}
            {consents?.length > 0 && (
              <section
                aria-labelledby="consents-heading"
                className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-5 md:p-6"
              >
                <div className="flex items-center justify-between">
                  <h4
                    id="consents-heading"
                    className="text-sm md:text-base font-medium text-gray-700 "
                  >
                    Consents
                  </h4>
                  <span className="text-xs text-gray-400">
                    {consents.length} items
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {consents.map((c, idx) => {
                    const question =
                      getField(c, "question", "consentText", "q") || "Consent";
                    const answer = getField(c, "answer", "a");
                    const isAnswered =
                      answer !== undefined &&
                      answer !== null &&
                      String(answer).trim() !== "";

                    return (
                      <div
                        key={idx}
                        className="bg-gray-50  border border-gray-100  rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 ">
                              {question}
                            </div>
                            <div className="mt-1 text-xs text-gray-500 ">
                              {isAnswered ? (
                                <span className="truncate">
                                  {String(answer)}
                                </span>
                              ) : (
                                <span className="italic text-xs text-gray-400">
                                  No answer provided
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {/* status pill */}
                            {isAnswered ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                Answered
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* optional: show consent id or meta */}
                        {getField(c, "consent_id", "id") && (
                          <div className="mt-2 text-xs text-gray-400">
                            ID: {getField(c, "consent_id", "id")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
          {/* --- end Preferences & Consents (Minimals style) --- */}

          {bookingMedia && (
            <section className="bg-white  rounded-2xl border border-gray-100  shadow-sm p-6">
              <h4 className="text-sm md:text-base font-medium text-gray-700 ">
                Attached Media
              </h4>
              <div className="mt-3">
                <img
                  src={bookingMedia}
                  alt="Attached media"
                  loading="lazy"
                  onError={() => setImgError(true)}
                  className="w-full h-full max-h-[360px] object-cover"
                  style={{ display: "block" }}
                ></img>
                <a
                  href={bookingMedia}
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

        {/* RIGHT */}
        <aside className="col-span-2 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {/* show small avatar from userProfileImage if present */}
                {getField(booking, "userProfileImage", "user_profile_image") ? (
                  <img
                    src={getField(
                      booking,
                      "userProfileImage",
                      "user_profile_image"
                    )}
                    alt={userName}
                    className="w-14 h-14 rounded-full object-cover border"
                    loading="lazy"
                    onError={(e) =>
                      (e.currentTarget.src = "/avatar-placeholder.png")
                    }
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center text-sm text-gray-400">
                    N/A
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">
                  {userName || "—"}
                </h4>
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
                  <p className="mt-3 text-xs text-gray-500 flex items-start gap-2">
                    <FiMapPin className="text-gray-400 mt-0.5" />
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

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h4 className="text-sm font-medium text-gray-600">Schedule</h4>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FiCalendar className="text-gray-400" />
                <span>{bookingDate ? formatDate(bookingDate) : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-900">
                <FiClock className="text-gray-400" />
                <span>{bookingTime ? formatTime(bookingTime) : "—"}</span>
              </div>
              {getField(booking, "start_time") &&
                getField(booking, "end_time") && (
                  <div className="text-xs text-gray-500 mt-2">
                    Session: {formatDate(getField(booking, "start_time"))}{" "}
                    {formatTime(getField(booking, "start_time"))} —{" "}
                    {formatTime(getField(booking, "end_time"))}
                  </div>
                )}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-600">Payment</h4>
                <div className="mt-2 flex items-center gap-3">
                  <PaymentBadge status={paymentStatus} />
                  <span className="text-xs text-gray-400 capitalize">
                    {paymentStatus || "—"}
                  </span>
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

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
              <div className="mt-3 space-y-3">
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

          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="w-full py-3 rounded-lg"
              >
                Back
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default BookingDetailsPage;

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
  // return first defined key from obj (supports nested via dot path)
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
  // total price: sum of items' price * quantity + addons price * quantity
  let price = 0;
  if (Array.isArray(pkg.items)) {
    for (const it of pkg.items) {
      const p = safeFloat(it.price);
      const q = safeFloat(it.quantity) || 1;
      price += p * q;
    }
  }
  if (Array.isArray(pkg.addons)) {
    for (const ad of pkg.addons) {
      const p = safeFloat(ad.price);
      const q = safeFloat(ad.quantity) || 1;
      price += p * q;
    }
  }

  // total time: try to combine item.timeRequired and addon.addonTime into a readable string
  const timeParts = [];
  if (Array.isArray(pkg.items)) {
    for (const it of pkg.items) {
      if (it.timeRequired) timeParts.push(it.timeRequired);
    }
  }
  if (Array.isArray(pkg.addons)) {
    for (const ad of pkg.addons) {
      if (ad.addonTime) timeParts.push(ad.addonTime);
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
    // accept both "censents", "consents" (typo from API)
    // if (Array.isArray(p.censents)) consents.push(...p.censents);
    if (Array.isArray(p.consents)) consents.push(...p.consents);
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
      // original endpoint: getbookings -> then find by id
      const res = await api.get("/api/admin/getbookings");
      const bookings = res?.data?.bookings || [];
      // booking objects sometimes use booking_id or id etc. Try to match both.
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
      // fetch only if booking exists and vendor not set
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

  // normalize main fields with fallbacks
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

  // user fields (support variations)
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

  // service fields
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

  // packages - many APIs return packages array; ensure array
  const packages = Array.isArray(getField(booking, "packages"))
    ? getField(booking, "packages")
    : [];

  // compute aggregated prefs / addons / consents
  const {
    prefs: aggregatedPackagePreferences,
    addons: pkgAddons,
    consents,
  } = aggregateFromPackages(packages);

  // booking-level addons/preferences (some shapes have top-level booking.addons/preferences)
  const bookingLevelAddons = Array.isArray(getField(booking, "addons"))
    ? getField(booking, "addons")
    : [];
  const bookingLevelPreferences = Array.isArray(
    getField(booking, "preferences")
  )
    ? getField(booking, "preferences")
    : [];

  // merge preferences & addons (package-level + booking-level)
  const allPreferences = [
    ...bookingLevelPreferences,
    ...aggregatedPackagePreferences,
  ];
  const allAddons = [...bookingLevelAddons, ...pkgAddons];

  // payment fields
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

  // vendor fields
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Breadcrumb
        links={[
          { label: "Dashboard", to: "/admin/dashboard" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: `Booking #${bookingIdVal}` },
        ]}
      />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">
          Booking #{bookingIdVal}
        </h2>
        <StatusBadge status={bookingStatus} />
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
                {serviceTypeMedia && (
                  <img
                    src={serviceTypeMedia}
                    alt="Service Type"
                    className="w-28 h-28 object-cover rounded-lg border"
                  />
                )}
                <div className="flex flex-col gap-1">
                  <p className="text-lg font-medium text-gray-900">
                    {serviceName || "—"}
                  </p>
                  {serviceCategory && (
                    <p className="text-sm text-gray-500">{serviceCategory}</p>
                  )}
                  {serviceTypeName && (
                    <p className="text-sm text-gray-500">{serviceTypeName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Packages + items */}
            <div className="w-full space-y-4 p-6 bg-white rounded-xl shadow-sm border">
              {packages.length === 0 ? (
                <p className="text-sm text-gray-500">No packages selected.</p>
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
                    getField(pkg, "packageTitle");
                  const totals = computePackageTotals(pkg);

                  return (
                    <div
                      key={pkgId || packageName}
                      className="bg-white rounded-xl shadow-sm space-y-3 p-4"
                    >
                      <div className="flex items-center gap-4">
                        {packageMedia && (
                          <img
                            src={packageMedia}
                            alt={packageName}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        )}
                        <div>
                          <h4 className="text-base font-semibold text-gray-800">
                            {packageName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {totals.totalTime ? `${totals.totalTime} • ` : ""}$
                            {totals.totalPrice}
                          </p>
                        </div>
                      </div>

                      {/* Items */}
                      {Array.isArray(pkg.items) &&
                        pkg.items.map((item) => {
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
                            getField(item, "name");
                          const itemQuantity = getField(item, "quantity") || 1;
                          const itemTime = getField(
                            item,
                            "timeRequired",
                            "time_required",
                            "duration"
                          );
                          const itemPrice = getField(item, "price") || 0;

                          return (
                            <div
                              key={itemId || itemName}
                              className="flex gap-4 border-t pt-2 items-start"
                            >
                              {itemMedia && (
                                <img
                                  src={itemMedia}
                                  alt={itemName}
                                  className="w-14 h-14 object-cover rounded border"
                                />
                              )}
                              <div>
                                <p className="text-sm font-medium text-gray-800">
                                  {itemName} ({itemQuantity}x)
                                </p>
                                <p className="text-sm text-gray-500">
                                  {itemTime ? `${itemTime} • ` : ""}$
                                  {parseFloat(itemPrice || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        })}

                      {/* Package-level addons (if any) */}
                      {Array.isArray(pkg.addons) && pkg.addons.length > 0 && (
                        <div className="mt-2 border-t pt-2">
                          <h5 className="text-sm font-medium text-gray-700">
                            Addons
                          </h5>
                          <div className="space-y-2 mt-2">
                            {pkg.addons.map((ad) => (
                              <div
                                key={
                                  getField(ad, "addon_id", "id") ||
                                  getField(ad, "addonName", ad.addonName)
                                }
                                className="flex justify-between items-center"
                              >
                                <div>
                                  <p className="text-sm text-gray-800">
                                    {getField(ad, "addonName", "name")}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {getField(ad, "addonTime", "time")}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-800">
                                  $
                                  {parseFloat(
                                    getField(ad, "price") || 0
                                  ).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Booking-level addons (if any) */}
            {/* {allAddons.length > 0 && (
              <div className="w-full space-y-4 p-6 bg-white rounded-xl shadow-sm border">
                <h4 className="text-sm font-semibold text-gray-500 mb-2">
                  Addons
                </h4>
                {allAddons.map((pkg) => (
                  <div
                    key={
                      getField(pkg, "addon_id", "id") ||
                      getField(pkg, "addonName", pkg.addonName)
                    }
                    className="bg-white rounded-xl shadow-sm space-y-3 p-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="text-base font-semibold text-gray-800">
                          {getField(pkg, "addonName", "name")}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getField(pkg, "addonTime", "time")} • $
                          {parseFloat(getField(pkg, "price") || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )} */}
          </div>

          {/* Notes */}
          {notes && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Notes
              </h4>
              <p className="text-sm text-gray-800">{notes}</p>
            </div>
          )}

          {/* Preferences */}
          {allPreferences?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Preferences
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-800">
                {allPreferences.map((pref) => (
                  <li key={getField(pref, "preference_id", "id")}>
                    {getField(pref, "preferenceValue", "value", "preference")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Consents */}
          {consents?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Consents
              </h4>
              <ul className="list-disc list-inside text-sm text-gray-800">
                {consents.map((c) => (
                  <li key={getField(c, "consent_id", "consentId", "id")}>
                    <strong>{getField(c, "question", "q")}: </strong>
                    {getField(c, "answer", "a")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Booking Media */}
          {bookingMedia && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-2">
                Attached Media
              </h4>
              <img
                src={bookingMedia}
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
              {userName || "—"}
            </p>
            {userEmail && <p className="text-sm text-gray-500">{userEmail}</p>}
            {userPhone && <p className="text-sm text-gray-500">{userPhone}</p>}
            {userAddress && (
              <p className="flex items-center text-sm text-gray-500 mt-1">
                <FiMapPin className="mr-2" />
                {userAddress}
                {userState && `, ${userState}`}
                {userPostalCode && ` - ${userPostalCode}`}
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
              {bookingDate ? formatDate(bookingDate) : "—"}
            </p>
            <p className="flex items-center text-sm text-gray-800 mt-1">
              <FiClock className="mr-2" />
              {bookingTime ? formatTime(bookingTime) : "—"}
            </p>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">
              Payment Info
            </h4>
            <PaymentBadge status={paymentStatus} />
            <p className="text-sm text-gray-800 mt-2">
              ${parseFloat(paymentAmount || 0).toFixed(2)}{" "}
              {paymentCurrency?.toUpperCase()}
            </p>
            {paymentIntentId && (
              <p className="text-xs text-gray-400 mt-1">
                Payment ID: {paymentIntentId}
              </p>
            )}
          </div>

          {/* Vendor Info or Assignment */}
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h4 className="text-sm font-semibold text-gray-500 mb-2">Vendor</h4>
            {vendorName ? (
              <div className="space-y-1">
                <p className="text-sm text-gray-800 font-medium">
                  {vendorName} {vendorType ? `(${vendorType})` : ""}
                </p>
                {vendorContactPerson && (
                  <p className="text-sm text-gray-500">
                    Contact Person: {vendorContactPerson}
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

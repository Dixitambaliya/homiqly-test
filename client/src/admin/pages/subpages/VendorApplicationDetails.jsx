import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../../../shared/components/Button/Button";
import {
  FiArrowLeft,
  FiClock,
  FiDollarSign,
  FiPackage,
  FiUser,
  FiMail,
  FiPhone,
  FiHash,
  FiCheckCircle,
  FiXCircle,
  FiImage,
} from "react-icons/fi";

const StatusBadge = ({ status }) => {
  const map = {
    0: {
      label: "Pending",
      class: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    },
    1: {
      label: "Approved",
      class: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    },
    2: {
      label: "Rejected",
      class: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
    },
  };
  const s = map[status] || map[0];
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${s.class}`}
    >
      {status === 1 ? <FiCheckCircle /> : status === 2 ? <FiXCircle /> : null}
      {s.label}
    </span>
  );
};

const StatChip = ({ icon: Icon, label }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 text-gray-700 text-xs px-2.5 py-1 ring-1 ring-gray-200">
    <Icon className="shrink-0" />
    {label}
  </span>
);

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 text-sm">
    <div className="mt-0.5 text-gray-400">
      <Icon />
    </div>
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value || "—"}</p>
    </div>
  </div>
);

const formatDateTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso || "—";
  }
};

const formatMoney = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return v || "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const optimizeImageUrl = (url) => {
  if (!url) return null;
  // Use lower-resolution preview or lazy load param if CDN supports it
  return `${url}?w=800&auto=format&quality=60`;
};

const VendorApplicationDetails = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const app = state?.application;

  if (!app) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800">
          No data available for #{id}. Open this page from the table so data can
          be passed without another API call.
        </div>
        <Button className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const itemsCount = Array.isArray(app.subPackages)
    ? app.subPackages.length
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft /> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Application #{app.application_id}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={app.status} />

          {/* <StatChip icon={FiDollarSign} label={formatMoney(app.totalPrice)} />
          <StatChip icon={FiClock} label={app.totalTime || "—"} />
          <StatChip icon={FiPackage} label={`${itemsCount} items`} /> */}
        </div>
      </div>

      {/* Enhanced Package Section */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Image section */}
        <div className="relative w-full h-56 md:h-auto md:min-h-[360px] bg-gray-100 overflow-hidden">
          <img
            src={optimizeImageUrl(app.packageMedia || app.serviceImage)}
            alt={app.packageName || "Package"}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 transform hover:scale-105"
            style={{ willChange: "transform" }}
          />

          {/* subtle gradient overlay for better contrast on top-right metadata (optional) */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-transparent via-transparent to-white opacity-30" />
        </div>

        {/* Package details section */}
        <div className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                  Package
                </p>
                <h3 className="text-xl font-semibold text-gray-900 truncate">
                  {app.packageName || "—"}
                </h3>
              </div>

              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Total Price
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(app.totalPrice)}
                </p>
              </div>
            </div>

            {/* Chips and details */}
            <div className="mt-4 flex flex-wrap gap-2">
              <StatChip icon={FiClock} label={app.totalTime || "—"} />
              <StatChip icon={FiPackage} label={`${itemsCount} items`} />
            </div>

            {/* Divider */}
            <div className="my-5 border-t border-gray-100" />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      Vendor
                    </p>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                      {app.vendorType || "—"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <InfoRow
                      icon={FiUser}
                      label="Name"
                      value={app.vendorName || "—"}
                    />
                    <InfoRow
                      icon={FiMail}
                      label="Email"
                      value={app.vendorEmail || "—"}
                    />
                    <InfoRow
                      icon={FiPhone}
                      label="Phone"
                      value={app.vendorPhone || "—"}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">
                    Meta
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    <InfoRow
                      icon={FiHash}
                      label="Application ID"
                      value={app.application_id || "—"}
                    />
                    <InfoRow
                      icon={FiHash}
                      label="Vendor ID"
                      value={app.vendor_id || "—"}
                    />
                    <InfoRow
                      icon={FiHash}
                      label="Package ID"
                      value={app.package_id || "—"}
                    />
                    <InfoRow
                      icon={FiClock}
                      label="Applied At"
                      value={formatDateTime(app.applied_at) || "—"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor & Meta Info */}

      {/* Sub-packages */}
      {Array.isArray(app.subPackages) && app.subPackages.length > 0 && (
        <div className=" p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Sub-packages</p>
            <span className="text-xs text-gray-500">{itemsCount} total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {app.subPackages.map((sp, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-all"
              >
                <img
                  src={optimizeImageUrl(sp.itemMedia)}
                  alt={sp.itemName}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {sp.itemName}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <StatChip icon={FiClock} label={`${sp.timeRequired} Mins` || "—"} />
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMoney(sp.price)}
                    </p>
                  </div>
                </div>
              </div>  
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorApplicationDetails;

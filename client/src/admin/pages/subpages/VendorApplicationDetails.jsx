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
} from "react-icons/fi";

/* --- helpers --- */
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
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.class}`}
    >
      {status === 1 ? <FiCheckCircle /> : status === 2 ? <FiXCircle /> : null}
      {s.label}
    </span>
  );
};

const StatChip = ({ icon: Icon, label }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 text-xs px-2.5 py-1 ring-1 ring-gray-200">
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

/* --- page --- */
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

  const itemsCount = Array.isArray(app.sub_packages)
    ? app.sub_packages.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <FiArrowLeft />
            Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">
            Application #{app.application_id}
          </h2>
          <StatusBadge status={app.status} />
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap items-center gap-2">
          <StatChip icon={FiDollarSign} label={formatMoney(app.totalPrice)} />
          <StatChip icon={FiClock} label={app.totalTime || "—"} />
          <StatChip icon={FiPackage} label={`${itemsCount} items`} />
        </div>
      </div>

      {/* Top grid: Package (hero) + Vendor/Meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package card */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {app.packageMedia ? (
            <div className="aspect-[16/6] w-full overflow-hidden bg-gray-50">
              <img
                src={app.packageMedia}
                alt="Package"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Package
                </p>
                <h3 className="text-xl font-semibold text-gray-900">
                  {app.packageName?.trim() || "—"}
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

            {/* Chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <StatChip icon={FiClock} label={app.totalTime || "—"} />
              <StatChip icon={FiPackage} label={`${itemsCount} items`} />
            </div>

            {/* Preferences */}
            {Array.isArray(app.preferences) && app.preferences.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Preferences
                </p>
                <div className="flex flex-wrap gap-2">
                  {app.preferences.map((p) => (
                    <span
                      key={p.preference_id}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                    >
                      {p.preferenceValue}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Vendor + Meta */}
        <div className="space-y-6">
          {/* Vendor card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Vendor</p>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 ring-1 ring-gray-200">
                {app.vendorType || "—"}
              </span>
            </div>
            <div className="mt-4 space-y-4">
              <InfoRow icon={FiUser} label="Name" value={app.vendorName} />
              <InfoRow icon={FiMail} label="Email" value={app.vendorEmail} />
              <InfoRow icon={FiPhone} label="Phone" value={app.vendorPhone} />
            </div>
          </div>

          {/* Meta card */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Meta</p>
            <div className="grid grid-cols-1 gap-4">
              <InfoRow
                icon={FiHash}
                label="Application ID"
                value={app.application_id}
              />
              <InfoRow icon={FiHash} label="Vendor ID" value={app.vendor_id} />
              <InfoRow
                icon={FiHash}
                label="Package ID"
                value={app.package_id}
              />
              <InfoRow
                icon={FiClock}
                label="Applied At"
                value={formatDateTime(app.applied_at)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-packages */}
      {Array.isArray(app.sub_packages) && app.sub_packages.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Sub-packages</p>
            <span className="text-xs text-gray-500">{itemsCount} total</span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {app.sub_packages.map((sp) => (
              <div
                key={sp.sub_package_id}
                className="rounded-xl border border-gray-200 overflow-hidden bg-white"
              >
                {sp.itemMedia ? (
                  <div className="aspect-[16/10] bg-gray-50">
                    <img
                      src={sp.itemMedia}
                      alt={sp.itemName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {sp.itemName?.trim() || "—"}
                  </p>
                  <div className="mt-2">
                    <StatChip icon={FiClock} label={sp.timeRequired || "—"} />
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

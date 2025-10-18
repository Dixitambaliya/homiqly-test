"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  FileText,
  FileArchive,
  Calendar,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";

const TempVendor = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/vendor/get-temp-vendor");
      setVendors(res.data.data || []);
    } catch (error) {
      toast.error("Failed to fetch vendor data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Temporary Vendors</h2>

      {loading ? (
        <p className="text-center text-gray-500">Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p className="text-center text-gray-500">No vendor data found.</p>
      ) : (
        <div className="overflow-x-auto border rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Service Location
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {vendors.map((vendor) => (
                <tr key={vendor.vendor_id}>
                  <td className="px-4 py-3">{vendor.name}</td>
                  <td className="px-4 py-3">{vendor.email}</td>
                  <td className="px-4 py-3">{vendor.phone}</td>
                  <td className="px-4 py-3">{vendor.serviceLocation}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedVendor(vendor)}
                      className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 overflow-y-auto"
          aria-modal="true"
          role="dialog"
        >
          {" "}
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedVendor(null)}
          />
          {/* Modal panel */}
          <div className="relative z-10 w-full max-w-5xl">
            <div
              className="mx-auto rounded-2xl bg-white shadow-2xl"
              style={{ maxHeight: "90vh" }}
            >
              {" "}
              <div className="flex items-start justify-between gap-4 p-6 border-b">
                <div className="flex items-center gap-4">
                  {/* avatar / placeholder image */}
                  <div className="h-16 w-16 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-lg font-semibold shadow">
                    {selectedVendor.name?.charAt(0)?.toUpperCase() || "V"}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {selectedVendor.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Vendor ID:{" "}
                      <span className="font-medium text-slate-700">
                        {selectedVendor.vendor_id}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <MapPin size={14} />{" "}
                        {selectedVendor.serviceLocation || "—"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <Calendar size={14} />{" "}
                        {selectedVendor.created_at
                          ? new Date(
                              selectedVendor.created_at
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* close */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="rounded-md p-2 hover:bg-slate-100"
                    aria-label="Close"
                    title="Close"
                  >
                    <X size={20} className="text-slate-600" />
                  </button>
                </div>
              </div>
              {/* Content area */}
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Left: Contact + Basic */}
                  <div className="rounded-lg border p-4 bg-white">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Mail size={14} /> Contact
                    </h4>

                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Email</div>
                        <div className="mt-1 text-slate-800 font-medium">
                          {selectedVendor.email || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Phone</div>
                        <div className="mt-1 text-slate-800 font-medium">
                          {selectedVendor.phone || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Experience</div>
                        <div className="mt-1 text-slate-800">
                          {selectedVendor.professionalExperience ||
                            "Not provided"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Documents (with badges + links) */}
                  <div className="rounded-lg border p-4 bg-white">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <FileText size={14} /> Documents
                    </h4>

                    <div className="space-y-3 text-sm">
                      {/* Certification */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-500">
                            Professional Certification
                          </div>
                          <div className="mt-1">
                            {selectedVendor.properCertificationMedia ? (
                              <a
                                href={selectedVendor.properCertificationMedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                              >
                                <FileArchive size={14} /> View Certificate
                              </a>
                            ) : (
                              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                                <AlertTriangle size={14} /> Not provided
                              </div>
                            )}
                          </div>
                        </div>

                        {/* doc status */}
                        <div className="flex-shrink-0">
                          {selectedVendor.properCertificationMedia ? (
                            <span className="inline-flex items-center gap-2 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              <CheckCircle size={14} /> Uploaded
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Business License */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-500">
                            City Business License
                          </div>
                          <div className="mt-1">
                            {selectedVendor.businessLicenseMedia ? (
                              <a
                                href={selectedVendor.businessLicenseMedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                              >
                                <FileArchive size={14} /> View Business License
                              </a>
                            ) : (
                              <div className="text-sm text-slate-700">
                                <span className="text-slate-500">No, but</span>{" "}
                                <span className="font-medium">
                                  I’m willing to obtain it before starting
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {selectedVendor.businessLicenseMedia ? (
                            <span className="inline-flex items-center gap-2 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              <CheckCircle size={14} /> Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                              <AlertTriangle size={14} /> Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Insurance */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs text-slate-500">
                            Liability Insurance
                          </div>
                          <div className="mt-1">
                            {selectedVendor.insuranceProofMedia ? (
                              <a
                                href={selectedVendor.insuranceProofMedia}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
                              >
                                <FileArchive size={14} /> View Insurance Proof
                              </a>
                            ) : (
                              <div className="text-sm text-slate-700">
                                <span className="text-slate-500">No, but</span>{" "}
                                <span className="font-medium">
                                  I’m willing to obtain it before starting
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {selectedVendor.insuranceProofMedia ? (
                            <span className="inline-flex items-center gap-2 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                              <CheckCircle size={14} /> Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700">
                              <AlertTriangle size={14} /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick actions + metadata */}
                  <div className="rounded-lg border p-4 bg-white flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <ImageIcon size={14} /> Quick Info
                      </h4>

                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="text-xs text-slate-500">
                            Registered On
                          </div>
                          <div className="mt-1 font-medium text-slate-800">
                            {selectedVendor.created_at
                              ? new Date(
                                  selectedVendor.created_at
                                ).toLocaleString()
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500">
                            Service Count
                          </div>
                          <div className="mt-1 font-medium text-slate-800">
                            {selectedVendor.packages?.reduce(
                              (acc, p) => acc + (p.sub_packages?.length || 0),
                              0
                            ) || 0}{" "}
                            items
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-slate-500">
                            Last updated
                          </div>
                          <div className="mt-1 text-slate-700">
                            {selectedVendor.packages &&
                            selectedVendor.packages.length > 0
                              ? new Date(
                                  Math.max(
                                    ...selectedVendor.packages.map((p) =>
                                      p.updated_at
                                        ? new Date(p.updated_at).getTime()
                                        : 0
                                    )
                                  )
                                ).toLocaleDateString()
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center gap-3">
                      <a
                        href={`mailto:${selectedVendor.email}`}
                        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
                      >
                        <Mail size={14} /> Email
                      </a>

                      <button
                        onClick={() => {
                          // example action: copy phone
                          navigator.clipboard?.writeText(
                            selectedVendor.phone || ""
                          );
                          toast.success("Phone copied to clipboard");
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700"
                      >
                        <Phone size={14} /> Copy Phone
                      </button>
                    </div>
                  </div>
                </div>

                {/* Packages section */}
                <div className="mt-6 rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-slate-800">
                      Packages & Services
                    </h4>
                    <div className="text-sm text-slate-500">
                      {selectedVendor.packages?.length || 0} package(s)
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {selectedVendor.packages?.length ? (
                      selectedVendor.packages.map((pkg) => (
                        <div
                          key={pkg.package_id}
                          className="rounded-lg border bg-white p-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-20 flex-shrink-0">
                              {pkg.packageMedia ? (
                                <img
                                  src={pkg.packageMedia}
                                  alt={pkg.packageName}
                                  className="h-20 w-full rounded-md object-cover border"
                                />
                              ) : (
                                <div className="flex h-20 w-full items-center justify-center rounded-md border bg-slate-50 text-sm text-slate-500">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {pkg.packageName}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    Created:{" "}
                                    {pkg.created_at
                                      ? new Date(
                                          pkg.created_at
                                        ).toLocaleDateString()
                                      : "—"}
                                  </div>
                                </div>

                                <div className="text-xs text-slate-500">
                                  {pkg.sub_packages?.length || 0} items
                                </div>
                              </div>

                              {/* sub packages */}
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {pkg.sub_packages?.map((item) => (
                                  <div
                                    key={item.item_id}
                                    className="flex items-start gap-3 rounded-md border p-3 bg-white"
                                  >
                                    <div className="w-16 flex-shrink-0">
                                      {item.itemMedia ? (
                                        <img
                                          src={item.itemMedia}
                                          alt={item.itemName}
                                          className="h-12 w-12 rounded-md object-cover border"
                                        />
                                      ) : (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-slate-50 text-xs text-slate-500">
                                          <ImageIcon size={14} />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 text-sm">
                                      <div className="font-medium text-slate-900">
                                        {item.itemName}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-1 whitespace-pre-line">
                                        {item.description}
                                      </div>
                                      <div className="mt-2 flex items-center gap-3 text-xs">
                                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                          💰 ${item.price}
                                        </div>
                                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                          ⏱{" "}
                                          {item.timeRequired
                                            ?.toString()
                                            .trim() || "—"}{" "}
                                          mins
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-500">
                        No packages available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-white">
                <button
                  onClick={() => setSelectedVendor(null)}
                  className="rounded-md px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TempVendor;

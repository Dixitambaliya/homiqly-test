import React, { useState } from "react";
import api from "../../lib/axiosConfig";
import { toast } from "react-toastify";
import DataTable from "../../../shared/components/Table/DataTable";

const PackagesTable = ({ services, onEdit, fetchData }) => {
  const [expandedPackages, setExpandedPackages] = useState({});
  const [expandedServices, setExpandedServices] = useState({});
  const [deleting, setDeleting] = useState(null);

  const togglePackageExpand = (pkgId) => {
    setExpandedPackages((prev) => ({
      ...prev,
      [pkgId]: !prev[pkgId],
    }));
  };

  const toggleServiceExpand = (serviceId) => {
    setExpandedServices((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }));
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm("Are you sure you want to delete this package?"))
      return;
    try {
      setDeleting(id);
      await axios.delete(`/api/vendor/deletepackages/${id}`);
      toast.success("Package deleted successfully");
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete package");
    } finally {
      setDeleting(null);
    }
  };

  const flattenedData = [];

  services.forEach((service) => {
    flattenedData.push({
      _rowType: "service",
      service_type_id: service.service_type_id,
      serviceType: service.serviceType,
      serviceTypeMedia: service.serviceTypeMedia,
      categoryName: service.categoryName,
      serviceLocation: service.serviceLocation,
      serviceDescription: service.serviceDescription,
      is_approved: service.is_approved,
    });

    if (expandedServices[service.service_type_id]) {
      service.packages.forEach((pkg) => {
        flattenedData.push({
          ...pkg,
          _rowType: "package",
          parentService: service,
        });

        const isExpanded = expandedPackages[pkg.package_id];
        if (isExpanded && pkg.sub_packages?.length > 0) {
          pkg.sub_packages.forEach((sub) =>
            flattenedData.push({
              ...sub,
              _rowType: "sub_package",
              parentPackage: pkg,
            })
          );
        }
      });
    }
  });

  const columns = [
    {
      title: "ID",
      key: "service_type_id",
      render: (row) =>
        row._rowType === "service" ? (
          <span className="font-medium text-gray-700">
            {row.service_type_id}
          </span>
        ) : null,
    },
    {
      title: "Title",
      render: (row) => {
        if (row._rowType === "service") {
          return (
            <div
              onClick={() => toggleServiceExpand(row.service_type_id)}
              className="cursor-pointer text-lg font-bold text-gray-800 py-2 flex items-center gap-3"
            >
              <img
                src={row.serviceTypeMedia}
                alt={row.serviceType}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                {row.serviceType}
                <div className="text-sm text-gray-500 font-normal">
                  ({row.categoryName} • {row.serviceLocation})
                </div>
              </div>
            </div>
          );
        } else if (row._rowType === "package") {
          return (
            <div className="flex items-center gap-3">
              <img
                src={row.package_media}
                alt={row.title}
                className="h-9 w-9 rounded object-cover"
              />
              <span className="font-medium text-gray-800">{row.title}</span>
            </div>
          );
        } else if (row._rowType === "sub_package") {
          return (
            <div className="flex items-center gap-2 pl-12">
              <img
                src={row.item_images}
                alt={row.title}
                className="h-6 w-6 rounded object-cover"
              />
              <span className="text-sm text-gray-700">↳ {row.title}</span>
            </div>
          );
        }
      },
    },
    {
      title: "Price",
      render: (row) => {
        if (row._rowType === "package" || row._rowType === "sub_package") {
          return (
            <span
              className={
                row._rowType === "package"
                  ? "text-green-600 font-medium"
                  : "text-gray-600"
              }
            >
              ${row.price}
            </span>
          );
        }
        return null;
      },
    },
    {
      title: "Duration",
      render: (row) => {
        if (row._rowType === "package" || row._rowType === "sub_package") {
          return (
            <span className="text-sm text-gray-500">{row.time_required}</span>
          );
        }
        return null;
      },
    },
    {
      title: "Status",
      render: (row) => {
        if (row._rowType === "service") {
          const status = row.is_approved;
          const className =
            status === 1
              ? "bg-green-100 text-green-800"
              : status === 2
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800";
          const label =
            status === 1 ? "Approved" : status === 2 ? "Rejected" : "Pending";
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}
            >
              {label}
            </span>
          );
        }
        return null;
      },
    },
    {
      title: "Actions",
      render: (row) => {
        if (row._rowType === "package") {
          return (
            <div className="flex gap-3">
              <button
                onClick={() => togglePackageExpand(row.package_id)}
                className="text-primary hover:underline text-sm"
              >
                {expandedPackages[row.package_id] ? "Hide" : "View"}
              </button>
              <button
                onClick={() => onEdit(row)}
                className="text-blue-600 hover:underline text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeletePackage(row.package_id)}
                disabled={deleting === row.package_id}
                className="text-red-500 hover:underline text-sm"
              >
                {deleting === row.package_id ? "Deleting..." : "Delete"}
              </button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={flattenedData}
      pagination={false}
      emptyMessage="No services found"
    />
  );
};

export default PackagesTable;

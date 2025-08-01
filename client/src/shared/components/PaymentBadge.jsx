import React from "react";

const PaymentBadge = ({ status }) => {
  let badgeText = "Unknown";
  let badgeClass = "bg-gray-50 text-gray-700 border border-gray-200";

  switch (status?.toLowerCase()) {
    case "pending":
      badgeText = "Pending";
      badgeClass = "bg-amber-100 text-amber-700 border border-amber-200/50";
      break;
    case "completed":
    case "success":
      badgeText = "Completed";
      badgeClass = "bg-blue-100 text-blue-700 border border-blue-200/50";
      break;
    case "rejected":
    case "failed":
      badgeText = "Rejected";
      badgeClass = "bg-red-100 text-red-700 border border-red-200/50";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded-[6px] ${badgeClass}`}
    >
      {badgeText}
    </span>
  );
};

export default PaymentBadge;

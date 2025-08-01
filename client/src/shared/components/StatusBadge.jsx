const StatusBadge = ({ status, text }) => {
  let statusClass = "";
  let statusText = text;

  if (!statusText) {
    switch (status) {
      case 0:
      case "pending":
        statusText = "Pending";
        break;
      case 1:
      case "approved":
        statusText = "Approved";
        break;
      case 2:
      case "rejected":
      case "cancelled":
        statusText = "Rejected";
        break;
      case 3:
        statusText = "Started";
        break;
      case 4:
        statusText = "Completed";
        break;
      default:
        statusText = "Unknown";
    }
  }

  switch (status) {
    case 0:
    case "pending":
      statusClass = "bg-amber-100 text-amber-700 border border-amber-200/50";
      break;
    case 1:
    case "approved":
      statusClass = "bg-blue-100 text-blue-700 border border-blue-200/50";
      break;
    case 2:
    case "rejected":
    case "cancelled":
      statusClass = "bg-red-100 text-red-700 border border-red-200/50";
      break;
    case 3:
      statusClass = "bg-purple-100 text-purple-700 border border-purple-200/50";
      break;
    case 4:
      statusClass = "bg-green-100 text-green-700 border border-green-200/50";
      break;
    default:
      statusClass = "bg-gray-100 text-gray-700 border border-gray-200/50";
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded-[6px] ${statusClass}`}
    >
      {statusText}
    </span>
  );
};

export default StatusBadge;

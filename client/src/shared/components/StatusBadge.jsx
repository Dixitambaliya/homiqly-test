import React from 'react';

const StatusBadge = ({ status, text }) => {
  let statusClass = '';
  let statusText = text;
  
  if (!statusText) {
    switch (status) {
      case 0:
      case 'pending':
        statusText = 'Pending';
        break;
      case 1:
      case 'approved':
      case 'completed':
        statusText = 'Approved';
        break;
      case 2:
      case 'rejected':
      case 'cancelled':
        statusText = 'Rejected';
        break;
      default:
        statusText = 'Unknown';
    }
  }
  
  switch (status) {
    case 0:
    case 'pending':
      statusClass = 'bg-yellow-100 text-yellow-800';
      break;
    case 1:
    case 'approved':
    case 'completed':
      statusClass = 'bg-green-100 text-green-800';
      break;
    case 2:
    case 'rejected':
    case 'cancelled':
      statusClass = 'bg-red-100 text-red-800';
      break;
    default:
      statusClass = 'bg-gray-100 text-gray-800';
  }
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
      {statusText}
    </span>
  );
};

export default StatusBadge;
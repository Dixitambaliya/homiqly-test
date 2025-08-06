import React from "react";
import { FiDelete, FiEye, FiTrash } from "react-icons/fi";
import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";

// ✅ Merged StatusBadge component (move this above TicketsTable)
const StatusBadge = ({ status }) => {
  const color =
    {
      open: "bg-yellow-100 text-yellow-800",
      closed: "bg-green-100 text-green-800",
      pending: "bg-blue-100 text-blue-800",
    }[status] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${color}`}>
      {status}
    </span>
  );
};

// ✅ TicketsTable component
const TicketsTable = ({ tickets, isLoading, onViewTicket, onDeleteTicket }) => {
  const columns = [
    {
      title: "ID",
      key: "ticket_id",
      render: (row) => (
        <div className="text-sm text-gray-900">#{row.ticket_id}</div>
      ),
    },
    {
      title: "User",
      render: (row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.user_name}
          </div>
          <div className="text-sm text-gray-900">{row.vendor_email}</div>
        </div>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.subject}</div>
      ),
    },
    {
      title: "Message",
      render: (row) => (
        <div className="text-sm text-gray-600 truncate max-w-xs">
          {row.message}
        </div>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      title: "Date",
      render: (row) =>
        new Date(row.created_at).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <IconButton
            icon={<FiEye className="h-4 w-4" />}
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewTicket(row);
            }}
            tooltip="View Ticket"
          />
          <IconButton
            icon={<FiTrash className="h-4 w-4" />}
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (
                window.confirm("Are you sure you want to delete this ticket?")
              ) {
                onDeleteTicket(row.ticket_id);
              }
            }}
            tooltip="Delete Ticket"
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={tickets}
      isLoading={isLoading}
      emptyMessage="No tickets found."
      onRowClick={onViewTicket}
    />
  );
};

export default TicketsTable;

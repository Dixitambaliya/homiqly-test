import React from "react";
import { FiEye, FiEdit } from "react-icons/fi";
import { MdDelete, MdEdit } from "react-icons/md";

import DataTable from "../../../shared/components/Table/DataTable";
import { IconButton } from "../../../shared/components/Button";
import { formatDate } from "../../../shared/utils/dateUtils";
import { Trash2 } from "lucide-react";

const UsersTable = ({ users, isLoading, onViewUser, onEditUser, onDelete }) => {
  const columns = [
    {
      title: "ID",
      key: "user_id",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.user_id}</div>
      ),
    },
    {
      title: "Name",
      render: (row) => (
        <div className="flex items-center">
          {row.profileImage ? (
            <img
              src={row.profileImage}
              alt={`${row.firstName} ${row.lastName}`}
              className="h-8 w-8 rounded-full mr-3 object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              <span className="text-gray-500 text-sm">
                {row.firstName?.charAt(0) || ""}
                {row.lastName?.charAt(0) || ""}
              </span>
            </div>
          )}
          <div className="text-sm font-medium text-gray-900">
            {row.firstName} {row.lastName}
          </div>
        </div>
      ),
    },
    {
      title: "Email",
      key: "email",
      render: (row) => <div className="text-sm text-gray-900">{row.email}</div>,
    },
    {
      title: "Phone",
      key: "phone",
      render: (row) => (
        <div className="text-sm text-gray-900">{row.phone || "N/A"}</div>
      ),
    },
    {
      title: "Joined",
      key: "created_at",
      render: (row) => (
        <div className="text-sm text-gray-900">
          {formatDate(row.created_at)}
        </div>
      ),
    },
    {
      title: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <IconButton
            icon={<FiEye />}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onViewUser(row);
            }}
            tooltip="View details"
          />
          <IconButton
            icon={<MdEdit />}
            onClick={(e) => {
              e.stopPropagation();
              onEditUser(row);
            }}
            tooltip="Edit user"
          />
          <IconButton
            icon={<MdDelete />}
            variant="lightDanger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.user_id);
            }}
            tooltip="Delete user"
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      emptyMessage="No users found."
      onRowClick={onViewUser}
    />
  );
};

export default UsersTable;

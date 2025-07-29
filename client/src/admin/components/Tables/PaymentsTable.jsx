import React from 'react';
import { FiCheck } from 'react-icons/fi';
import DataTable from '../../../shared/components/Table/DataTable';
import { IconButton } from '../../../shared/components/Button';
import { formatCurrency } from '../../../shared/utils/formatUtils';
import { formatDate } from '../../../shared/utils/dateUtils';

const PaymentsTable = ({ 
  payouts, 
  isLoading, 
  onApprovePayment,
  processingPayment
}) => {
  const columns = [
    {
      title: 'ID',
      key: 'id',
      render: (row) => <div className="text-sm text-gray-900">#{row.id}</div>
    },
    {
      title: 'Provider',
      key: 'provider_name',
      render: (row) => <div className="text-sm font-medium text-gray-900">{row.provider_name}</div>
    },
    {
      title: 'Type',
      key: 'payout_type',
      render: (row) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          row.payout_type === 'vendor' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {row.payout_type === 'vendor' ? 'Vendor' : 'Contractor'}
        </span>
      )
    },
    {
      title: 'Amount',
      key: 'net_amount',
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">{formatCurrency(row.net_amount)}</div>
      )
    },
    {
      title: 'Service',
      key: 'serviceName',
      render: (row) => <div className="text-sm text-gray-900">{row.serviceName}</div>
    },
    {
      title: 'Date',
      key: 'payment_date',
      render: (row) => (
        <div className="text-sm text-gray-900">{formatDate(row.payment_date)}</div>
      )
    },
    {
      title: 'Actions',
      align: 'right',
      render: (row) => (
        <IconButton
          icon={<FiCheck className="h-4 w-4" />}
          variant="success"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApprovePayment(row.id, row.payout_type);
          }}
          disabled={processingPayment === row.id}
          isLoading={processingPayment === row.id}
          tooltip="Approve payment"
        />
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={payouts}
      isLoading={isLoading}
      emptyMessage="No pending payouts found."
    />
  );
};

export default PaymentsTable;
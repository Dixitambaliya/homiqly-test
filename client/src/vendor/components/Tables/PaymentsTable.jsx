import React from 'react';
import DataTable from '../../../shared/components/Table/DataTable';
import { formatCurrency } from '../../../shared/utils/formatUtils';
import { formatDate } from '../../../shared/utils/dateUtils';

const PaymentsTable = ({ 
  payments, 
  isLoading,
  filter
}) => {
  const columns = [
    {
      title: 'Payment ID',
      key: 'payment_id',
      render: (row) => <div className="text-sm font-medium text-gray-900">#{row.payment_id}</div>
    },
    {
      title: 'Service',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{row.serviceName}</div>
          <div className="text-xs text-gray-500">{row.serviceCategory}</div>
        </div>
      )
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (row) => (
        <div className="text-sm font-medium text-gray-900">{formatCurrency(row.amount)}</div>
      )
    },
    {
      title: 'Commission',
      render: (row) => (
        <div>
          <div className="text-sm text-gray-900">{formatCurrency(row.commission_amount)}</div>
          <div className="text-xs text-gray-500">{row.commission_rate}%</div>
        </div>
      )
    },
    {
      title: 'Net Amount',
      key: 'net_amount',
      render: (row) => (
        <div className="text-sm font-medium text-green-600">{formatCurrency(row.net_amount)}</div>
      )
    },
    {
      title: 'Status',
      key: 'payment_status',
      render: (row) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          row.payment_status === 'completed' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.payment_status.charAt(0).toUpperCase() + row.payment_status.slice(1)}
        </span>
      )
    },
    {
      title: 'Date',
      key: 'payment_date',
      render: (row) => (
        <div className="text-sm text-gray-900">{formatDate(row.payment_date)}</div>
      )
    }
  ];

  // Filter payments by status if needed
  const filteredPayments = filter !== 'all'
    ? payments.filter(payment => payment.payment_status === filter)
    : payments;

  return (
    <DataTable
      columns={columns}
      data={filteredPayments}
      isLoading={isLoading}
      emptyMessage="No payment records found."
    />
  );
};

export default PaymentsTable;
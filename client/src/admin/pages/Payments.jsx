import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiRefreshCw, FiCheck, FiDownload } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { formatCurrency } from '../../shared/utils/formatUtils';
import { formatDate } from '../../shared/utils/dateUtils';

const Payments = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, vendor, contractor
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    fetchPayouts();
  }, []);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/payment/pending');
      setPayouts(response.data.payouts || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payouts:', error);
      setError('Failed to load pending payouts');
      setLoading(false);
    }
  };

  const handleApprovePayment = async (paymentId, payoutType) => {
    try {
      setProcessingPayment(paymentId);
      
      const response = await axios.put('/api/payment/approve', {
        payment_id: paymentId,
        payout_type: payoutType
      });
      
      if (response.status === 200) {
        toast.success('Payment approved successfully');
        
        // Update local state
        setPayouts(payouts.filter(payout => 
          !(payout.id === paymentId && payout.payout_type === payoutType)
        ));
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const filteredPayouts = payouts.filter(payout => {
    if (filter === 'all') return true;
    return payout.payout_type === filter;
  });

  const exportToCSV = () => {
    // Create CSV content
    const headers = ['ID', 'Provider', 'Type', 'Amount', 'Service', 'Date'];
    const rows = filteredPayouts.map(payout => [
      payout.id,
      payout.provider_name,
      payout.payout_type,
      payout.net_amount,
      payout.serviceName,
      new Date(payout.payment_date).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pending_payouts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payment Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark flex items-center"
          >
            <FiDownload className="mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchPayouts}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Pending Payouts</h3>
          
          <div>
            <select
              value={filter}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
            >
              <option value="all">All Types</option>
              <option value="vendor">Vendors Only</option>
              <option value="contractor">Contractors Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      {payouts.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts.map(payout => (
                  <tr key={`${payout.payout_type}-${payout.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">#{payout.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payout.provider_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payout.payout_type === 'vendor' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {payout.payout_type === 'vendor' ? 'Vendor' : 'Contractor'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(payout.net_amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payout.serviceName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payout.payment_date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleApprovePayment(payout.id, payout.payout_type)}
                        disabled={processingPayment === payout.id}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center ml-auto disabled:opacity-50"
                      >
                        {processingPayment === payout.id ? (
                          <LoadingSpinner size="sm" color="green" />
                        ) : (
                          <FiCheck className="mr-1" />
                        )}
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No pending payouts found.</p>
        </div>
      )}
    </div>
  );
};

export default Payments;
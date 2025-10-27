import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { formatCurrency } from '../../shared/utils/formatUtils';
import { formatDate } from '../../shared/utils/dateUtils';
import { Check, ShoppingCart, X } from 'lucide-react';

const SupplyKits = () => {
  const [supplyKits, setSupplyKits] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all supply kits
      const kitsResponse = await axios.get('/api/supplykit/all');
      setSupplyKits(kitsResponse.data.supply_kits || []);
      
      // Fetch vendor's orders
      const ordersResponse = await axios.get('/api/supplykit/vendor/orders');
      setMyOrders(ordersResponse.data.orders || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching supply kits data:', error);
      setError('Failed to load supply kits');
      setLoading(false);
    }
  };

  const handleOrderKit = (kit) => {
    setSelectedKit(kit);
    setQuantity(1);
    setShowOrderModal(true);
  };

  const calculateTotal = () => {
    if (!selectedKit) return 0;
    return selectedKit.kit_price * quantity;
  };

  const handleSubmitOrder = async () => {
    if (!selectedKit || quantity < 1) {
      toast.error('Please select a valid kit and quantity');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/supplykit/order', {
        kit_id: selectedKit.kit_id,
        quantity_ordered: quantity
      });
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Supply kit ordered successfully');
        setShowOrderModal(false);
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Error ordering supply kit:', error);
      toast.error(error.response?.data?.message || 'Failed to order supply kit');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
        <h2 className="text-2xl font-bold text-gray-800">Supply Kits</h2>
        <button
          onClick={fetchData}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Available Supply Kits */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Supply Kits</h3>
        
        {supplyKits.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supplyKits.map(kit => (
              <div key={kit.kit_id} className="bg-white rounded-lg shadow overflow-hidden">
                {kit.kit_image && (
                  <img 
                    src={kit.kit_image} 
                    alt={kit.kit_name} 
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h4 className="text-lg font-semibold mb-2">{kit.kit_name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{kit.kit_description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-green-600">{formatCurrency(kit.kit_price)}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-1">
                      {kit.serviceCategory}
                    </span>
                  </div>
                  
                  {kit.items && kit.items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Kit Contents:</h5>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {kit.items.slice(0, 3).map(item => (
                          <li key={item.item_id} className="truncate">
                            {item.item_name} ({item.quantity}x)
                          </li>
                        ))}
                        {kit.items.length > 3 && (
                          <li className="text-gray-500">+{kit.items.length - 3} more items</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleOrderKit(kit)}
                    className="w-full flex items-center justify-center px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark"
                  >
                    <ShoppingCart className="mr-2" />
                    Order Kit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No supply kits available at the moment.</p>
          </div>
        )}
      </div>

      {/* My Orders */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">My Orders</h3>
        
        {myOrders.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kit
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {myOrders.map(order => (
                    <tr key={order.vendor_kit_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">#{order.vendor_kit_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.kit_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.quantity_ordered}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(order.total_amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.order_status)}`}>
                          {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(order.order_date)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">You haven't ordered any supply kits yet.</p>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && selectedKit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Order Supply Kit</h3>
              <button 
                onClick={() => setShowOrderModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex items-start mb-4">
                {selectedKit.kit_image && (
                  <img 
                    src={selectedKit.kit_image} 
                    alt={selectedKit.kit_name} 
                    className="w-20 h-20 object-cover rounded-md mr-4"
                  />
                )}
                <div>
                  <h4 className="text-lg font-semibold">{selectedKit.kit_name}</h4>
                  <p className="text-sm text-gray-600">{selectedKit.kit_description}</p>
                  <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(selectedKit.kit_price)}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Total:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span className="ml-2">Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="mr-2" />
                      Confirm Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyKits;
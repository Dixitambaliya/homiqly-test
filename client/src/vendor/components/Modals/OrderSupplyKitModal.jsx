import React, { useState, useEffect } from 'react';
import Modal from '../../../shared/components/Modal/Modal';
import { Button } from '../../../shared/components/Button';
import { FormSelect, FormInput } from '../../../shared/components/Form';
import { Card } from '../../../shared/components/Card';
import { formatCurrency } from '../../../shared/utils/formatUtils';
import axios from 'axios';

const OrderSupplyKitModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting
}) => {
  const [supplyKits, setSupplyKits] = useState([]);
  const [selectedKit, setSelectedKit] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      loadAvailableSupplyKits();
    }
  }, [isOpen]);
  
  const loadAvailableSupplyKits = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/supplykit/all');
      setSupplyKits(response.data.supply_kits || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading supply kits:', error);
      setLoading(false);
    }
  };
  
  const handleKitChange = (e) => {
    const kitId = e.target.value;
    const kit = supplyKits.find(k => k.kit_id.toString() === kitId);
    setSelectedKit(kit || null);
  };
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    setQuantity(value > 0 ? value : 1);
  };
  
  const calculateTotal = () => {
    if (!selectedKit) return 0;
    return selectedKit.kit_price * quantity;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedKit) return;
    
    onSubmit({
      kit_id: selectedKit.kit_id,
      quantity_ordered: quantity
    });
  };
  
  const resetForm = () => {
    setSelectedKit(null);
    setQuantity(1);
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title="Order Supply Kit"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <FormSelect
          label="Supply Kit"
          name="kit_id"
          value={selectedKit?.kit_id || ''}
          onChange={handleKitChange}
          options={supplyKits.map(kit => ({
            value: kit.kit_id.toString(),
            label: `${kit.kit_name} - ${formatCurrency(kit.kit_price)}`
          }))}
          placeholder="Select a supply kit"
          required
          disabled={loading}
        />
        
        {selectedKit && (
          <Card className="my-4">
            <h4 className="font-medium text-gray-900 mb-2">{selectedKit.kit_name}</h4>
            <p className="text-sm text-gray-600 mb-3">{selectedKit.kit_description || 'No description available'}</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(selectedKit.kit_price)}</p>
            
            {selectedKit.items && selectedKit.items.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Kit Contents:</h5>
                <ul className="text-sm text-gray-600 space-y-1">
                  {selectedKit.items.map(item => (
                    <li key={item.item_id} className="flex justify-between">
                      <span>{item.item_name} ({item.quantity}x)</span>
                      <span className="text-gray-500">{formatCurrency(item.unit_price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}
        
        <FormInput
          label="Quantity"
          name="quantity_ordered"
          type="number"
          value={quantity}
          onChange={handleQuantityChange}
          min="1"
          required
          disabled={!selectedKit}
        />
        
        <div className="bg-gray-50 p-4 rounded-md my-4 text-center">
          <h4 className="text-lg font-bold text-gray-900">
            Total: {formatCurrency(calculateTotal())}
          </h4>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedKit}
            isLoading={isSubmitting}
          >
            Order Kit
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderSupplyKitModal;
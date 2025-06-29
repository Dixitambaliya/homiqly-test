import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiSend, FiX } from 'react-icons/fi';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const Notifications = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    user_type: '',
    title: '',
    body: '',
    data: {}
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.user_type || !formData.title || !formData.body) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await axios.post('/api/notification/send', formData);
      
      if (response.status === 200) {
        toast.success(`Notification sent to ${response.data.success_count} recipients`);
        resetForm();
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      user_type: '',
      title: '',
      body: '',
      data: {}
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Send Notifications</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Compose Notification</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Type*
                </label>
                <select
                  id="user_type"
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                >
                  <option value="">Select Recipient Type</option>
                  <option value="users">All Users</option>
                  <option value="vendors">All Vendors</option>
                  <option value="admin">All Admins</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Title*
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  placeholder="Enter notification title"
                />
              </div>
              
              <div>
                <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Message*
                </label>
                <textarea
                  id="body"
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  placeholder="Enter notification message"
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Sending...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2" />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Notification Guidelines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Guidelines</h3>
          
          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Best Practices</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Keep notification titles short and clear</li>
                <li>Provide specific and actionable information in the message</li>
                <li>Avoid sending too many notifications in a short period</li>
                <li>Use notifications for important updates only</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Notification Types</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Users</strong> - Sent to all registered customers</li>
                <li><strong>Vendors</strong> - Sent to all registered service providers</li>
                <li><strong>Admins</strong> - Sent to all admin users</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Example Use Cases</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>New feature announcements</li>
                <li>Maintenance notifications</li>
                <li>Special promotions or offers</li>
                <li>Important policy updates</li>
                <li>Service disruption alerts</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <h4 className="font-medium text-blue-700 mb-1">Note</h4>
              <p className="text-sm text-blue-600">
                Notifications are sent via Firebase Cloud Messaging (FCM). Recipients must have a registered FCM token to receive push notifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
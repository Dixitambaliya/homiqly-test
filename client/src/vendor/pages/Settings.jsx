import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiLock, FiBell } from 'react-icons/fi';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormInput, FormSelect, FormCheckbox } from '../../shared/components/Form';
import { useVendorAuth } from '../contexts/VendorAuthContext';

const Settings = () => {
  const { currentUser } = useVendorAuth();
  const [generalSettings, setGeneralSettings] = useState({
    theme: 'light',
    language: 'en',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const saveGeneralSettings = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      toast.success('Settings saved successfully');
      setIsSubmitting(false);
    }, 1000);
  };
  
  const changePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      
      {/* <Card title="General Settings" icon={<FiSave className="w-5 h-5" />}>
        <form onSubmit={saveGeneralSettings}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormSelect
              label="Theme"
              name="theme"
              value={generalSettings.theme}
              onChange={handleGeneralChange}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System Default' }
              ]}
            />
            
            <FormSelect
              label="Language"
              name="language"
              value={generalSettings.language}
              onChange={handleGeneralChange}
              options={[
                { value: 'en', label: 'English' },
                { value: 'hi', label: 'Hindi' },
                { value: 'ta', label: 'Tamil' }
              ]}
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Card> */}
      
      <Card title="Notification Preferences" icon={<FiBell className="w-5 h-5" />}>
        <form>
          <div className="space-y-3">
            <FormCheckbox
              label="Email Notifications"
              name="emailNotifications"
              checked={generalSettings.emailNotifications}
              onChange={handleGeneralChange}
            />
            
            <FormCheckbox
              label="SMS Notifications"
              name="smsNotifications"
              checked={generalSettings.smsNotifications}
              onChange={handleGeneralChange}
            />
            
            <FormCheckbox
              label="Push Notifications"
              name="pushNotifications"
              checked={generalSettings.pushNotifications}
              onChange={handleGeneralChange}
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>
      
      <Card title="Change Password" icon={<FiLock className="w-5 h-5" />}>
        <form onSubmit={changePassword}>
          <div className="space-y-4">
            <FormInput
              label="Current Password"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            
            <FormInput
              label="New Password"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
            />
            
            <FormInput
              label="Confirm New Password"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              required
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Change Password
            </Button>
          </div>
        </form>
      </Card>
      
      <Card title="Account Information">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-1 text-sm font-medium text-gray-500">Name</h4>
            <p className="text-gray-900">{currentUser?.name || 'Vendor User'}</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-gray-500">Account Type</h4>
            <p className="text-gray-900 capitalize">{currentUser?.vendor_type || 'vendor'}</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-gray-500">Email</h4>
            <p className="text-gray-900">{currentUser?.email || 'vendor@example.com'}</p>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-gray-500">Member Since</h4>
            <p className="text-gray-900">January 1, 2025</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit, FiSave } from 'react-icons/fi';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormInput, FormTextarea, FormFileInput } from '../../shared/components/Form';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const Profile = () => {
  const { currentUser } = useVendorAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyAddress: '',
    contactPerson: '',
    googleBusinessProfileLink: '',
    otherInfo: ''
  });
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    fetchVendorProfile();
  }, []);

  const fetchVendorProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/vendor/getprofile');
      
      if (response.data && response.data.profile) {
        const profileData = response.data.profile;
        setProfile(profileData);
        
        // Initialize form data
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          phone: profileData.phone || '',
          companyAddress: profileData.companyAddress || '',
          contactPerson: profileData.contactPerson || '',
          googleBusinessProfileLink: profileData.googleBusinessProfileLink || '',
          otherInfo: profileData.otherInfo || ''
        });
      }
    } catch (error) {
      console.error('Error fetching vendor profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setUpdating(true);
      
      const formDataToSend = new FormData();
      
      // Append text fields
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          formDataToSend.append(key, formData[key]);
        }
      });
      
      // Append image if selected
      if (profileImage) {
        formDataToSend.append('profileImageVendor', profileImage);
      }
      
      const response = await axios.put('/api/vendor/updateprofile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.status === 200) {
        toast.success('Profile updated successfully');
        setEditing(false);
        fetchVendorProfile(); // Refresh profile data
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const toggleEdit = () => {
    setEditing(!editing);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Vendor Profile</h2>
        {!editing ? (
          <Button
            onClick={toggleEdit}
            variant="primary"
            icon={<FiEdit className="mr-2" />}
          >
            Edit Profile
          </Button>
        ) : (
          <Button
            onClick={toggleEdit}
            variant="outline"
            icon={<FiX className="mr-2" />}
          >
            Cancel
          </Button>
        )}
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="h-40 w-40 rounded-full overflow-hidden border-2 border-primary">
                  <img 
                    src={profile?.profileImage || 'https://via.placeholder.com/150?text=No+Image'} 
                    alt="Profile" 
                    className="h-full w-full object-cover"
                  />
                </div>
                {editing && (
                  <FormFileInput
                    name="profileImageVendor"
                    accept="image/*"
                    onChange={handleImageChange}
                    showPreview={false}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{profile?.name || 'Vendor Name'}</h3>
                <p className="text-gray-500 capitalize">{profile?.vendorType || 'Vendor'}</p>
              </div>
            </div>

            {/* Profile Details Section */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label={profile?.vendorType === 'company' ? 'Company Name' : 'Full Name'}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiUser className="h-5 w-5 text-gray-400" />}
                />

                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiMail className="h-5 w-5 text-gray-400" />}
                />

                <FormInput
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editing}
                  icon={<FiPhone className="h-5 w-5 text-gray-400" />}
                />

                {/* Company-specific fields */}
                {profile?.vendorType === 'company' && (
                  <>
                    <FormInput
                      label="Contact Person"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleInputChange}
                      disabled={!editing}
                      icon={<FiUser className="h-5 w-5 text-gray-400" />}
                    />

                    <div className="md:col-span-2">
                      <FormTextarea
                        label="Company Address"
                        name="companyAddress"
                        value={formData.companyAddress}
                        onChange={handleInputChange}
                        disabled={!editing}
                        rows={3}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormInput
                        label="Google Business Profile Link"
                        name="googleBusinessProfileLink"
                        type="url"
                        value={formData.googleBusinessProfileLink}
                        onChange={handleInputChange}
                        disabled={!editing}
                      />
                    </div>
                  </>
                )}

                {/* Individual-specific fields */}
                {profile?.vendorType === 'individual' && (
                  <div className="md:col-span-2">
                    <FormTextarea
                      label="Other Information"
                      name="otherInfo"
                      value={formData.otherInfo}
                      onChange={handleInputChange}
                      disabled={!editing}
                      rows={3}
                    />
                  </div>
                )}
              </div>

              {editing && (
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updating}
                    isLoading={updating}
                    icon={<FiSave className="mr-2" />}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Account Information */}
      <Card title="Account Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Account Type</p>
            <p className="mt-1 text-gray-800 capitalize">{profile?.vendorType || 'Vendor'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Account Status</p>
            <p className="mt-1">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Member Since</p>
            <p className="mt-1 text-gray-800">
              {profile?.created_at 
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Not available'}
            </p>
          </div>
          {profile?.vendorType === 'individual' && profile?.resume && (
            <div>
              <p className="text-sm font-medium text-gray-500">Resume</p>
              <p className="mt-1">
                <a 
                  href={profile.resume} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark"
                >
                  View Resume
                </a>
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Profile;
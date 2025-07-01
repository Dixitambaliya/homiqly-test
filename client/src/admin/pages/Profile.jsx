import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit, FiSave } from 'react-icons/fi';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormInput, FormTextarea, FormFileInput } from '../../shared/components/Form';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

const Profile = () => {
  const { currentUser } = useAdminAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    state: '',
    city: '',
    zip_code: '',
    about: ''
  });
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    // Simulate fetching profile data
    setLoading(true);
    setTimeout(() => {
      const profileData = {
        name: currentUser?.name || 'Admin User',
        email: currentUser?.email || 'admin@example.com',
        phone: currentUser?.phone || '+1 234 567 890',
        country: currentUser?.country || 'India',
        address: currentUser?.address || '123 Admin Street',
        state: currentUser?.state || 'Maharashtra',
        city: currentUser?.city || 'Mumbai',
        zip_code: currentUser?.zip_code || '400001',
        about: currentUser?.about || 'Administrator for the Homiqly platform.',
        profileImage: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg'
      };
      
      setProfile(profileData);
      setFormData(profileData);
      setLoading(false);
    }, 500);
  }, [currentUser]);

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
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update profile with form data
      setProfile({
        ...profile,
        ...formData
      });
      
      toast.success('Profile updated successfully');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
        <h2 className="text-2xl font-bold text-gray-800">Admin Profile</h2>
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
                    name="profileImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    showPreview={false}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold">{profile?.name || 'Admin User'}</h3>
                <p className="text-gray-500 capitalize">{currentUser?.role || 'admin'}</p>
              </div>
            </div>

            {/* Profile Details Section */}
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Full Name"
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

                <FormInput
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  disabled={!editing}
                />

                <FormInput
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  disabled={!editing}
                />

                <FormInput
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  disabled={!editing}
                />

                <FormInput
                  label="Zip Code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleInputChange}
                  disabled={!editing}
                />

                <div className="md:col-span-2">
                  <FormTextarea
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!editing}
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <FormTextarea
                    label="About"
                    name="about"
                    value={formData.about}
                    onChange={handleInputChange}
                    disabled={!editing}
                    rows={3}
                  />
                </div>
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
    </div>
  );
};

export default Profile;
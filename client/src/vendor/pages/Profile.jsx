import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit, FiSave, FiX } from 'react-icons/fi';
import { useVendorAuth } from '../contexts/VendorAuthContext';
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
  const [imagePreview, setImagePreview] = useState(null);

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
        
        // Set image preview if available
        if (profileData.profileImage) {
          setImagePreview(profileData.profileImage);
        }
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
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
    
    // Reset form data if canceling edit
    if (editing && profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        companyAddress: profile.companyAddress || '',
        contactPerson: profile.contactPerson || '',
        googleBusinessProfileLink: profile.googleBusinessProfileLink || '',
        otherInfo: profile.otherInfo || ''
      });
      
      // Reset image preview
      if (profile.profileImage) {
        setImagePreview(profile.profileImage);
      }
      setProfileImage(null);
    }
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
        <button
          onClick={toggleEdit}
          className={`flex items-center px-4 py-2 rounded-md ${
            editing 
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
              : 'bg-primary-light text-white hover:bg-primary-dark'
          }`}
        >
          {editing ? (
            <>
              <FiX className="mr-2" /> Cancel
            </>
          ) : (
            <>
              <FiEdit className="mr-2" /> Edit Profile
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row gap-8">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-primary-light">
                    <img 
                      src={imagePreview || 'https://via.placeholder.com/150?text=No+Image'} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {editing && (
                    <label 
                      htmlFor="profile-image" 
                      className="absolute bottom-0 right-0 bg-primary-light text-white p-2 rounded-full cursor-pointer hover:bg-primary-dark"
                    >
                      <FiEdit className="h-5 w-5" />
                      <input 
                        type="file" 
                        id="profile-image" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {profile?.vendorType === 'company' ? 'Company Name' : 'Full Name'}
                    </label>
                    {editing ? (
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiUser className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-800">{profile?.name || 'Not provided'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    {editing ? (
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FiMail className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-800">{profile?.email || 'Not provided'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    {editing ? (
                      <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiPhone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <FiPhone className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-gray-800">{profile?.phone || 'Not provided'}</p>
                      </div>
                    )}
                  </div>

                  {/* Company-specific fields */}
                  {profile?.vendorType === 'company' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person
                        </label>
                        {editing ? (
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FiUser className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                              type="text"
                              name="contactPerson"
                              value={formData.contactPerson}
                              onChange={handleInputChange}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <FiUser className="h-5 w-5 text-gray-400 mr-2" />
                            <p className="text-gray-800">{profile?.contactPerson || 'Not provided'}</p>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Address
                        </label>
                        {editing ? (
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FiMapPin className="h-5 w-5 text-gray-400" />
                            </div>
                            <textarea
                              name="companyAddress"
                              value={formData.companyAddress}
                              onChange={handleInputChange}
                              rows="3"
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                            ></textarea>
                          </div>
                        ) : (
                          <div className="flex">
                            <FiMapPin className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-1" />
                            <p className="text-gray-800">{profile?.companyAddress || 'Not provided'}</p>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Google Business Profile Link
                        </label>
                        {editing ? (
                          <input
                            type="url"
                            name="googleBusinessProfileLink"
                            value={formData.googleBusinessProfileLink}
                            onChange={handleInputChange}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                          />
                        ) : (
                          <div>
                            {profile?.googleBusinessProfileLink ? (
                              <a 
                                href={profile.googleBusinessProfileLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary-light hover:text-primary-dark"
                              >
                                {profile.googleBusinessProfileLink}
                              </a>
                            ) : (
                              <p className="text-gray-500">Not provided</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Individual-specific fields */}
                  {profile?.vendorType === 'individual' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Other Information
                      </label>
                      {editing ? (
                        <textarea
                          name="otherInfo"
                          value={formData.otherInfo}
                          onChange={handleInputChange}
                          rows="3"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                        ></textarea>
                      ) : (
                        <p className="text-gray-800">{profile?.otherInfo || 'Not provided'}</p>
                      )}
                    </div>
                  )}
                </div>

                {editing && (
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex items-center px-4 py-2 bg-primary-light text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
                    >
                      {updating ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span className="ml-2">Updating...</span>
                        </>
                      ) : (
                        <>
                          <FiSave className="mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-800">Account Information</h3>
        </div>
        <div className="p-6">
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
                    className="text-primary-light hover:text-primary-dark"
                  >
                    View Resume
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
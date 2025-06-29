"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ProtectedRoutes from "@/components/ProtectedRoutes";
import axios from "axios";
import Link from "next/link";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    state: "",
    postalcode: "",
    profileImage: null
  });

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    }
  }, [session]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getdata`,
        {
          headers: {
            Authorization: `Bearer ${session.user.token}`
          }
        }
      );
      
      if (response.data && response.data.data) {
        setUserData({
          firstName: response.data.data.firstName || "",
          lastName: response.data.data.lastName || "",
          email: response.data.data.email || "",
          phone: response.data.data.phone || "",
          address: response.data.data.address || "",
          state: response.data.data.state || "",
          postalcode: response.data.data.postalcode || "",
          profileImage: response.data.data.profileImage || null
        });
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to load your profile data. Please try again.");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUserData(prev => ({
        ...prev,
        profileImage: file
      }));
      
      // Preview image
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('profileImagePreview').src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const formData = new FormData();
      formData.append('firstName', userData.firstName);
      formData.append('lastName', userData.lastName);
      formData.append('email', userData.email);
      formData.append('phone', userData.phone);
      formData.append('address', userData.address);
      formData.append('state', userData.state);
      formData.append('postalcode', userData.postalcode);
      
      if (userData.profileImage && typeof userData.profileImage !== 'string') {
        formData.append('profileImage', userData.profileImage);
      }
      
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/updatedata`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${session.user.token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      setSuccess("Profile updated successfully!");
      setSaving(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.error || "Failed to update profile. Please try again.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoutes>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </ProtectedRoutes>
    );
  }

  return (
    <ProtectedRoutes>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
              Back to Dashboard
            </Link>
          </div>
        </header>
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
                  {success}
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <img
                        id="profileImagePreview"
                        src={typeof userData.profileImage === 'string' ? userData.profileImage : "https://via.placeholder.com/150"}
                        alt="Profile"
                        className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-md"
                      />
                      <label htmlFor="profileImage" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <input
                          type="file"
                          id="profileImage"
                          name="profileImage"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                        First name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        value={userData.firstName}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                        Last name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        value={userData.lastName}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={userData.email}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        readOnly
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={userData.phone}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={userData.address}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        name="state"
                        id="state"
                        value={userData.state}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="postalcode" className="block text-sm font-medium text-gray-700">
                        Postal code
                      </label>
                      <input
                        type="text"
                        name="postalcode"
                        id="postalcode"
                        value={userData.postalcode}
                        onChange={handleChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoutes>
  );
}
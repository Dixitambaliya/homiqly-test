import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { toast } from 'react-toastify';
import { FiUser, FiMail, FiPhone, FiLock, FiLoader, FiChevronRight, FiChevronLeft, FiCheck } from 'react-icons/fi';
import axios from 'axios';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useVendorAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  
  // Form data
  const [vendorType, setVendorType] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [googleBusinessLink, setGoogleBusinessLink] = useState('');
  const [resume, setResume] = useState(null);
  
  // Services data
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  
  // Load service categories and services
  const loadServices = async () => {
    try {
      setServiceLoading(true);
      const response = await axios.get('/api/user/servicesbycategories');
      setServiceCategories(response.data.services || []);
      setServiceLoading(false);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
      setServiceLoading(false);
    }
  };
  
  const handleNextStep = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      loadServices();
    } else if (step === 2) {
      if (!validateStep2()) return;
    }
    
    setStep(step + 1);
  };
  
  const handlePrevStep = () => {
    setStep(step - 1);
  };
  
  const validateStep1 = () => {
    if (!vendorType) {
      toast.error('Please select vendor type');
      return false;
    }
    
    if (vendorType === 'individual') {
      if (!name || !email || !phone || !password) {
        toast.error('Please fill all required fields');
        return false;
      }
    } else if (vendorType === 'company') {
      if (!companyName || !contactPerson || !companyEmail || !companyPhone || !companyAddress) {
        toast.error('Please fill all required fields');
        return false;
      }
    }
    
    return true;
  };
  
  const validateStep2 = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return false;
    }
    
    return true;
  };
  
  const toggleService = (serviceId, categoryId) => {
    const exists = selectedServices.some(s => s.serviceId === serviceId);
    
    if (exists) {
      setSelectedServices(selectedServices.filter(s => s.serviceId !== serviceId));
    } else {
      setSelectedServices([
        ...selectedServices,
        {
          serviceId,
          serviceCategoryId: categoryId,
          serviceLocation: ''
        }
      ]);
    }
  };
  
  const updateServiceLocation = (serviceId, location) => {
    setSelectedServices(
      selectedServices.map(service => 
        service.serviceId === serviceId 
          ? { ...service, serviceLocation: location }
          : service
      )
    );
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    const formData = new FormData();
    formData.append('vendorType', vendorType);
    formData.append('confirmation', 'true');
    
    if (vendorType === 'individual') {
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      if (resume) formData.append('resume', resume);
    } else {
      formData.append('companyName', companyName);
      formData.append('contactPerson', contactPerson);
      formData.append('companyEmail', companyEmail);
      formData.append('companyPhone', companyPhone);
      formData.append('companyAddress', companyAddress);
      formData.append('googleBusinessProfileLink', googleBusinessLink);
    }
    
    formData.append('services', JSON.stringify(selectedServices));
    
    setLoading(true);
    
    try {
      const result = await register(formData);
      
      if (result.success) {
        toast.success('Registration successful! Please wait for admin approval.');
        navigate('/vendor/login');
      } else {
        toast.error(result.error || 'Registration failed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className={`flex-1 ${step >= 1 ? 'text-primary-light' : 'text-gray-300'}`}>
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 1 ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Basic Info</span>
            </div>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 2 ? 'bg-primary-light' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 ${step >= 2 ? 'text-primary-light' : 'text-gray-300'}`}>
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 2 ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Services</span>
            </div>
          </div>
          <div className={`h-1 flex-1 mx-2 ${step >= 3 ? 'bg-primary-light' : 'bg-gray-200'}`}></div>
          <div className={`flex-1 ${step >= 3 ? 'text-primary-light' : 'text-gray-300'}`}>
            <div className="flex items-center">
              <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${step >= 3 ? 'border-primary-light bg-primary-light text-white' : 'border-gray-300'}`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Confirm</span>
            </div>
          </div>
        </div>
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Basic Information</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="vendorType" className="block text-sm font-medium text-gray-700">
                Vendor Type*
              </label>
              <select
                id="vendorType"
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-primary-light focus:border-primary-light rounded-md"
              >
                <option value="">Select Vendor Type</option>
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>

            {vendorType === 'individual' && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiPhone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-light focus:border-primary-light"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="resume" className="block text-sm font-medium text-gray-700">
                    Resume (PDF)
                  </label>
                  <input
                    id="resume"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setResume(e.target.files[0])}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                  />
                </div>
              </>
            )}

            {vendorType === 'company' && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name*
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="ABC Company"
                  />
                </div>

                <div>
                  <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
                    Contact Person*
                  </label>
                  <input
                    id="contactPerson"
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
                    Company Email*
                  </label>
                  <input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="info@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                    Company Phone*
                  </label>
                  <input
                    id="companyPhone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
                    Company Address*
                  </label>
                  <textarea
                    id="companyAddress"
                    rows="3"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="123 Business Street, City, State, Zip"
                  ></textarea>
                </div>

                <div>
                  <label htmlFor="googleBusinessLink" className="block text-sm font-medium text-gray-700">
                    Google Business Profile Link
                  </label>
                  <input
                    id="googleBusinessLink"
                    type="url"
                    value={googleBusinessLink}
                    onChange={(e) => setGoogleBusinessLink(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                    placeholder="https://business.google.com/..."
                  />
                </div>
              </>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-light hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
              >
                Next
                <FiChevronRight className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Select Services</h2>
          
          {serviceLoading ? (
            <div className="flex justify-center py-8">
              <FiLoader className="animate-spin h-8 w-8 text-primary-light" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                {serviceCategories.map(category => (
                  <div key={category.serviceCategoryId} className="mb-6">
                    <h3 className="font-medium text-gray-800 mb-2 bg-gray-100 p-2 rounded">
                      {category.categoryName}
                    </h3>
                    <div className="space-y-2 pl-2">
                      {category.services.map(service => {
                        const isSelected = selectedServices.some(s => s.serviceId === service.serviceId);
                        return (
                          <div key={service.serviceId}>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`service_${service.serviceId}`}
                                checked={isSelected}
                                onChange={() => toggleService(service.serviceId, category.serviceCategoryId)}
                                className="h-4 w-4 text-primary-light focus:ring-primary-light border-gray-300 rounded"
                              />
                              <label htmlFor={`service_${service.serviceId}`} className="ml-2 text-sm text-gray-700">
                                {service.title}
                              </label>
                            </div>
                            
                            {isSelected && (
                              <div className="mt-2 ml-6">
                                <label htmlFor={`location_${service.serviceId}`} className="block text-xs font-medium text-gray-500">
                                  Service Location
                                </label>
                                <input
                                  type="text"
                                  id={`location_${service.serviceId}`}
                                  value={selectedServices.find(s => s.serviceId === service.serviceId)?.serviceLocation || ''}
                                  onChange={(e) => updateServiceLocation(service.serviceId, e.target.value)}
                                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-light focus:border-primary-light"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
                >
                  <FiChevronLeft className="mr-2" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-light hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
                >
                  Next
                  <FiChevronRight className="ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Confirm Registration</h2>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-gray-800 mb-2">Vendor Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Vendor Type:</span> {vendorType === 'individual' ? 'Individual' : 'Company'}</p>
              
              {vendorType === 'individual' ? (
                <>
                  <p><span className="font-medium">Name:</span> {name}</p>
                  <p><span className="font-medium">Email:</span> {email}</p>
                  <p><span className="font-medium">Phone:</span> {phone}</p>
                  <p><span className="font-medium">Resume:</span> {resume ? resume.name : 'Not provided'}</p>
                </>
              ) : (
                <>
                  <p><span className="font-medium">Company Name:</span> {companyName}</p>
                  <p><span className="font-medium">Contact Person:</span> {contactPerson}</p>
                  <p><span className="font-medium">Company Email:</span> {companyEmail}</p>
                  <p><span className="font-medium">Company Phone:</span> {companyPhone}</p>
                  <p><span className="font-medium">Company Address:</span> {companyAddress}</p>
                </>
              )}
            </div>
            
            <h3 className="font-medium text-gray-800 mt-4 mb-2">Selected Services</h3>
            <div className="space-y-2">
              {selectedServices.map(service => {
                const category = serviceCategories.find(c => c.serviceCategoryId === service.serviceCategoryId);
                const serviceItem = category?.services.find(s => s.serviceId === service.serviceId);
                
                return (
                  <div key={service.serviceId} className="flex items-start">
                    <FiCheck className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <div>
                      <p className="font-medium">{serviceItem?.title}</p>
                      <p className="text-sm text-gray-500">
                        Category: {category?.categoryName}
                        {service.serviceLocation && ` • Location: ${service.serviceLocation}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-light focus:ring-primary-light border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                I confirm that all the information provided is accurate and I agree to the terms and conditions.
              </label>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light"
            >
              <FiChevronLeft className="mr-2" />
              Previous
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-light hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Registering...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/vendor/login" className="font-medium text-primary-light hover:text-primary-dark">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
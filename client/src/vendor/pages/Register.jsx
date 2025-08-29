import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useVendorAuth } from "../contexts/VendorAuthContext";
import { toast } from "react-toastify";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiLoader,
  FiChevronRight,
  FiChevronLeft,
  FiCheck,
} from "react-icons/fi";
import axios from "axios";
// ❌ Remove custom Button import because we’ll use local buttons for consistency
// import Button from "../../shared/components/Button/Button";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useVendorAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Form data
  const [vendorType, setVendorType] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [googleBusinessLink, setGoogleBusinessLink] = useState("");
  const [resume, setResume] = useState(null);

  // Services data
  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  // Load service categories
  useEffect(() => {
    if (step === 2 || step === 3) {
      loadServices();
    }
  }, [step]);

  const loadServices = async () => {
    try {
      setServiceLoading(true);
      const response = await axios.get("/api/user/servicesbycategories");
      setServiceCategories(response.data.services || []);
      setServiceLoading(false);
    } catch (error) {
      toast.error("Failed to load services");
      setServiceLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(step + 1);
  };

  const handlePrevStep = () => setStep(step - 1);

  const validateStep1 = () => {
    if (!vendorType) {
      toast.error("Please select vendor type");
      return false;
    }
    if (vendorType === "individual") {
      if (!name || !email || !phone || !password) {
        toast.error("Please fill all required fields");
        return false;
      }
    } else if (vendorType === "company") {
      if (
        !companyName ||
        !contactPerson ||
        !companyEmail ||
        !companyPhone ||
        !companyAddress
      ) {
        toast.error("Please fill all required fields");
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return false;
    }
    return true;
  };

  const toggleService = (serviceId, categoryId) => {
    const exists = selectedServices.some((s) => s.serviceId === serviceId);
    if (exists) {
      setSelectedServices(
        selectedServices.filter((s) => s.serviceId !== serviceId)
      );
    } else {
      setSelectedServices([
        ...selectedServices,
        { serviceId, serviceCategoryId: categoryId, serviceLocation: "" },
      ]);
    }
  };

  const updateServiceLocation = (serviceId, location) => {
    setSelectedServices(
      selectedServices.map((service) =>
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
    formData.append("vendorType", vendorType);
    formData.append("confirmation", "true");

    if (vendorType === "individual") {
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("password", password);
      if (resume) formData.append("resume", resume);
    } else {
      formData.append("companyName", companyName);
      formData.append("contactPerson", contactPerson);
      formData.append("companyEmail", companyEmail);
      formData.append("companyPhone", companyPhone);
      formData.append("companyAddress", companyAddress);
      formData.append("googleBusinessProfileLink", googleBusinessLink);
    }

    formData.append("services", JSON.stringify(selectedServices));

    setLoading(true);
    try {
      const result = await register(formData);
      if (result.success) {
        toast.success(
          "Registration successful! Please wait for admin approval."
        );
        navigate("/vendor/login");
      } else {
        toast.error(result.error || "Registration failed");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto p-4">
      <div className="text-center">
        <img
          className="w-full h-10 object-contain"
          src="/homiqly-logo.png"
          alt="logo"
        />
      </div>
      <p className="text-center text-gray-600 font-semibold">
        Vendor Panel Registration
      </p>

      <div className="flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-3xl  rounded-2xl p-8 bg-white">
          {/* Stepper */}
          <div className="flex justify-between mb-8">
            {["Basic Info", "Services", "Confirm"].map((label, index) => {
              const stepNum = index + 1;
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 flex items-center justify-center rounded-full border-2 ${
                      step >= stepNum
                        ? "bg-primary border-primary text-white"
                        : "border-gray-300 text-gray-400"
                    }`}
                  >
                    {stepNum}
                  </div>
                  <p
                    className={`mt-2 text-sm ${
                      step >= stepNum
                        ? "text-primary font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Vendor Type*
                  </label>
                  <select
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-primary focus:border-primary"
                  >
                    <option value="">Select Vendor Type</option>
                    <option value="individual">Individual</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                {vendorType === "individual" && (
                  <>
                    <InputField
                      id="name"
                      icon={<FiUser />}
                      label="Full Name*"
                      value={name}
                      onChange={setName}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    <InputField
                      id="email"
                      icon={<FiMail />}
                      label="Email*"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="john@example.com"
                      autoComplete="email"
                    />
                    <InputField
                      id="phone"
                      icon={<FiPhone />}
                      label="Phone*"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+91 9876543210"
                      autoComplete="tel"
                    />
                    <InputField
                      id="password"
                      icon={<FiLock />}
                      label="Password*"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <div className="md:col-span-2">
                      <label
                        htmlFor="resume"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Resume (PDF)
                      </label>
                      <input
                        id="resume"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setResume(e.target.files?.[0] || null)}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </>
                )}

                {vendorType === "company" && (
                  <>
                    <InputField
                      id="companyName"
                      label="Company Name*"
                      value={companyName}
                      onChange={setCompanyName}
                      placeholder="ABC Company"
                    />
                    <InputField
                      id="contactPerson"
                      label="Contact Person*"
                      value={contactPerson}
                      onChange={setContactPerson}
                      placeholder="John Doe"
                    />
                    <InputField
                      id="companyEmail"
                      label="Company Email*"
                      type="email"
                      value={companyEmail}
                      onChange={setCompanyEmail}
                      placeholder="info@company.com"
                    />
                    <InputField
                      id="companyPhone"
                      label="Company Phone*"
                      type="tel"
                      value={companyPhone}
                      onChange={setCompanyPhone}
                      placeholder="+91 9876543210"
                    />
                    <div className="md:col-span-2">
                      <label
                        htmlFor="companyAddress"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Company Address*
                      </label>
                      <textarea
                        id="companyAddress"
                        rows={3}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-primary focus:border-primary"
                        placeholder="123 Business Street, City, State, Zip"
                      ></textarea>
                    </div>
                    <InputField
                      id="googleBusinessLink"
                      label="Google Business Profile Link"
                      value={googleBusinessLink}
                      onChange={setGoogleBusinessLink}
                      placeholder="https://business.google.com/..."
                    />
                  </>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <PrimaryButton onClick={handleNextStep}>
                  Next <FiChevronRight className="ml-2" />
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Select Services
              </h2>
              {serviceLoading ? (
                <div className="flex justify-center py-8">
                  <FiLoader className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {serviceCategories.map((category) => (
                    <div
                      key={category.serviceCategoryId}
                      className="bg-gray-50 p-4 rounded-lg"
                    >
                      <h3 className="font-medium text-gray-800 mb-3">
                        {category.categoryName}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.services.map((service) => {
                          const isSelected = selectedServices.some(
                            (s) => s.serviceId === service.serviceId
                          );
                          return (
                            <div
                              key={service.serviceId}
                              className="flex flex-col"
                            >
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleService(
                                      service.serviceId,
                                      category.serviceCategoryId
                                    )
                                  }
                                  className="h-4 w-4 text-primary border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm">
                                  {service.title}
                                </span>
                              </label>
                              {isSelected && (
                                <input
                                  type="text"
                                  placeholder="Service Location"
                                  value={
                                    selectedServices.find(
                                      (s) => s.serviceId === service.serviceId
                                    )?.serviceLocation || ""
                                  }
                                  onChange={(e) =>
                                    updateServiceLocation(
                                      service.serviceId,
                                      e.target.value
                                    )
                                  }
                                  className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-primary focus:border-primary"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <SecondaryButton onClick={handlePrevStep}>
                  <FiChevronLeft className="mr-2" /> Previous
                </SecondaryButton>
                <PrimaryButton onClick={handleNextStep}>
                  Next <FiChevronRight className="ml-2" />
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Confirm Registration
              </h2>
              <div className="bg-gray-50 p-4 rounded-lg mb-6 space-y-4">
                <h3 className="font-medium text-gray-800">
                  Vendor Information
                </h3>
                {vendorType === "individual" ? (
                  <ul className="text-sm space-y-1">
                    <li>
                      <b>Name:</b> {name}
                    </li>
                    <li>
                      <b>Email:</b> {email}
                    </li>
                    <li>
                      <b>Phone:</b> {phone}
                    </li>
                    <li>
                      <b>Resume:</b> {resume ? resume.name : "Not provided"}
                    </li>
                  </ul>
                ) : (
                  <ul className="text-sm space-y-1">
                    <li>
                      <b>Company Name:</b> {companyName}
                    </li>
                    <li>
                      <b>Contact Person:</b> {contactPerson}
                    </li>
                    <li>
                      <b>Email:</b> {companyEmail}
                    </li>
                    <li>
                      <b>Phone:</b> {companyPhone}
                    </li>
                    <li>
                      <b>Address:</b> {companyAddress}
                    </li>
                  </ul>
                )}
                <h3 className="font-medium text-gray-800">Selected Services</h3>
                <div className="space-y-2">
                  {selectedServices.map((service) => {
                    const category = serviceCategories.find(
                      (c) => c.serviceCategoryId === service.serviceCategoryId
                    );
                    const serviceItem = category?.services.find(
                      (s) => s.serviceId === service.serviceId
                    );
                    return (
                      <div key={service.serviceId} className="flex items-start">
                        <FiCheck className="text-green-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium text-sm">
                            {serviceItem?.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {category?.categoryName}
                            {service.serviceLocation
                              ? ` • ${service.serviceLocation}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between">
                <SecondaryButton onClick={handlePrevStep}>
                  <FiChevronLeft className="mr-2" /> Previous
                </SecondaryButton>
                <PrimaryButton onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin mr-2" /> Registering...
                    </>
                  ) : (
                    "Complete Registration"
                  )}
                </PrimaryButton>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/vendor/login"
              className="text-primary font-medium hover:underline"
            >
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

/* Reusable Input Field – fixed padding (no dynamic Tailwind class) */
const InputField = ({
  id,
  icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) => {
  const paddingClass = icon ? "pl-10" : "pl-3";
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative mt-1">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-gray-400">
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full ${paddingClass} pr-3 py-2 rounded-md border border-gray-300 bg-white shadow-sm focus:ring-primary focus:border-primary`}
        />
      </div>
    </div>
  );
};

/* Local button components – consistent styles & behavior */
const PrimaryButton = ({ className = "", children, ...props }) => (
  <button
    className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition disabled:opacity-50 ${className}`}
    {...props}
  >
    {children}
  </button>
);

const SecondaryButton = ({ className = "", children, ...props }) => (
  <button
    className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Register;

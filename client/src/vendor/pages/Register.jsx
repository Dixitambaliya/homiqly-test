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

  // Services data (new API shape)
  const [serviceCategories, setServiceCategories] = useState([]);
  /**
   * selectedServices structure (per package)
   * [
   *   {
   *     package_id: 103,
   *     serviceLocation: "rajkot",
   *     sub_packages: [{ item_id: 167 }, { item_id: 168 }]
   *   },
   *   ...
   * ]
   */
  const [selectedServices, setSelectedServices] = useState([]);
  // useful debug
  // console.log("selectedServices", selectedServices);

  // Load service categories when entering step 2 or 3
  useEffect(() => {
    if (step === 2 || step === 3) {
      loadServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // --- New API loader (vendor services with packages) ---
  const loadServices = async () => {
    try {
      setServiceLoading(true);
      const response = await axios.get("/api/vendor/serviceswithpackages");
      // expected: { services: [ { serviceCategoryId, categoryName, services: [ { serviceId, title, packages: [ { package_id, packageName, sub_packages:[{item_id,itemName}] } ] } ] } ] }
      setServiceCategories(response.data.services || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load services");
    } finally {
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
    // Make sure at least one sub-package is selected
    if (!selectedServices || selectedServices.length === 0) {
      toast.error("Please select at least one item from packages");
      return false;
    }

    // Ensure each selected package has at least one sub_package and a location
    for (const pkg of selectedServices) {
      if (!pkg.sub_packages || pkg.sub_packages.length === 0) {
        toast.error(
          "Each selected package must have at least one sub-package selected"
        );
        return false;
      }
      if (!pkg.serviceLocation || pkg.serviceLocation.trim() === "") {
        toast.error(
          "Please provide service location for each selected package"
        );
        return false;
      }
    }
    return true;
  };

  // If package entry doesn't exist, create it.
  const toggleSubPackage = (packageId, itemId) => {
    setSelectedServices((prev) => {
      const next = JSON.parse(JSON.stringify(prev || []));
      const pkgIndex = next.findIndex((p) => p.package_id === packageId);

      if (pkgIndex === -1) {
        // add new package with the selected sub_package and empty location
        return [
          ...next,
          {
            package_id: packageId,
            serviceLocation: "",
            sub_packages: [{ item_id: itemId }],
          },
        ];
      } else {
        const pkg = next[pkgIndex];
        const subIndex = pkg.sub_packages.findIndex(
          (s) => s.item_id === itemId
        );
        if (subIndex === -1) {
          // add sub-package
          pkg.sub_packages.push({ item_id: itemId });
        } else {
          pkg.sub_packages.splice(subIndex, 1);
          // if no more sub_packages, remove the package entirely
          if (pkg.sub_packages.length === 0) {
            next.splice(pkgIndex, 1);
          }
        }
        return next;
      }
    });
  };

  // Update serviceLocation for a package
  const updatePackageLocation = (packageId, location) => {
    setSelectedServices((prev) =>
      (prev || []).map((p) =>
        p.package_id === packageId ? { ...p, serviceLocation: location } : p
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

    formData.append("packages", JSON.stringify(selectedServices));

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
      console.error(error);
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
          {/* Stepper (unchanged) */}
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

          {/* Step 1 (unchanged) */}
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

          {/* --- Step 2: SHOW CATEGORY -> SERVICE -> PACKAGE -> SUB_PACKAGES + per-package serviceLocation --- */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Select Packages & Sub-Packages
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
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {category.categoryName}
                      </h3>

                      {category.services.map((service) => (
                        <div key={service.serviceId} className="ml-4 mb-4">
                          <h4 className="font-medium text-gray-700">
                            {service.title}
                          </h4>

                          {Array.isArray(service.packages) &&
                            service.packages.map((pkg) => {
                              // is any sub-package selected for this package?
                              const pkgSelected = selectedServices.find(
                                (p) => p.package_id === pkg.package_id
                              );
                              return (
                                <div
                                  key={pkg.package_id}
                                  className="ml-6 mt-2 border-l pl-4 border-gray-300"
                                >
                                  <p className="font-medium text-gray-600">
                                    {pkg.packageName}
                                  </p>

                                  {/* sub-packages checkboxes */}
                                  {Array.isArray(pkg.sub_packages) &&
                                    pkg.sub_packages.map((sub) => {
                                      const isChecked = !!(
                                        pkgSelected &&
                                        pkgSelected.sub_packages.some(
                                          (s) => s.item_id === sub.item_id
                                        )
                                      );
                                      return (
                                        <label
                                          key={sub.item_id}
                                          className="flex items-center mt-1"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              toggleSubPackage(
                                                pkg.package_id,
                                                sub.item_id
                                              )
                                            }
                                            className="h-4 w-4 text-primary border-gray-300 rounded"
                                          />
                                          <span className="ml-2 text-sm">
                                            {sub.itemName}
                                          </span>
                                        </label>
                                      );
                                    })}

                                  {/* serviceLocation input - visible when package has any selection, or always (here we show if selected; it's clearer) */}
                                  {pkgSelected ? (
                                    <div className="mt-2">
                                      <input
                                        type="text"
                                        value={pkgSelected.serviceLocation}
                                        onChange={(e) =>
                                          updatePackageLocation(
                                            pkg.package_id,
                                            e.target.value
                                          )
                                        }
                                        placeholder="Service Location (e.g., rajkot)"
                                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:ring-primary focus:border-primary"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                        </div>
                      ))}
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

          {/* Step 3: Confirmation (updated to display packages with their serviceLocation + selected sub-packages) */}
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

                <h3 className="font-medium text-gray-800">Selected Packages</h3>
                <div className="space-y-2">
                  {selectedServices.map((pkg) => {
                    // find full details for display
                    const pkgDetails = serviceCategories
                      .flatMap((c) => c.services || [])
                      .flatMap((s) => s.packages || [])
                      .find((p) => p.package_id === pkg.package_id);

                    return (
                      <div key={pkg.package_id} className="flex items-start">
                        <FiCheck className="text-green-500 mt-1 mr-2" />
                        <div>
                          <p className="font-medium text-sm">
                            {pkgDetails?.packageName ||
                              `Package ID: ${pkg.package_id}`}
                          </p>
                          <p className="text-xs text-gray-500 mb-1">
                            <b>Location:</b>{" "}
                            {pkg.serviceLocation || "Not provided"}
                          </p>
                          <ul className="ml-4 list-disc text-xs text-gray-500">
                            {pkg.sub_packages.map((sub) => {
                              const subDetails = pkgDetails?.sub_packages?.find(
                                (s) => s.item_id === sub.item_id
                              );
                              return (
                                <li key={sub.item_id}>
                                  {subDetails?.itemName ||
                                    `Item ID: ${sub.item_id}`}
                                </li>
                              );
                            })}
                          </ul>
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

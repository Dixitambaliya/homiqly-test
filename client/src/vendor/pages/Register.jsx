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
import Button from "../../shared/components/Button/Button";
import { FormInput, FormSelect } from "../../shared/components/Form";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useVendorAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);

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

  const [serviceCategories, setServiceCategories] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);

  // City selection (global for this vendor)
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState("");

  // Load service categories when entering step 2 or 3
  useEffect(() => {
    if (step === 2 || step === 3) {
      loadServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Load cities when entering step 2
  useEffect(() => {
    if (step === 2) {
      loadCities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // --- New API loader (vendor services with packages) ---
  const loadServices = async () => {
    try {
      setServiceLoading(true);
      const response = await axios.get("/api/vendor/serviceswithpackages");
      setServiceCategories(response.data.services || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load services");
    } finally {
      setServiceLoading(false);
    }
  };

  // --- Load cities for selection ---
  const loadCities = async () => {
    try {
      setCitiesLoading(true);
      // adjust endpoint as your backend provides
      const response = await axios.get("/api/service/getcity");
      console.log(response.data.city);
      // Expecting response.data.cities = [{ id, name }] or similar
      setCities(response.data.city || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load cities");
    } finally {
      setCitiesLoading(false);
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

    // Ensure city is selected
    if (!selectedCity || selectedCity.toString().trim() === "") {
      toast.error("Please select your service city");
      return false;
    }

    // Ensure each selected package has at least one sub_package
    for (const pkg of selectedServices) {
      if (!pkg.sub_packages || pkg.sub_packages.length === 0) {
        toast.error(
          "Each selected package must have at least one sub-package selected"
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
        // add new package with the selected sub_package
        return [
          ...next,
          {
            package_id: packageId,
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

    // include selected city (global)
    formData.append("serviceLocation", selectedCity);

    // append selected packages (no serviceLocation)
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
    <div className="bg-white rounded-lg shadow-xl max-w-4xl mx-auto p-4 max-h-[800px] overflow-y-auto">
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
                    className={`w-7 h-7 flex items-center justify-center rounded-full border-2 ${
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
                  <FormSelect
                    label="Vendor Type"
                    value={vendorType}
                    onChange={(e) => setVendorType(e.target.value)}
                    placeholder="Select Vendor Type"
                    options={[
                      {
                        value: "individual",
                        label: "Individual",
                      },
                      {
                        value: "company",
                        label: "Company",
                      },
                    ]}
                  />
                </div>

                {vendorType === "individual" && (
                  <>
                    <FormInput
                      id="name"
                      icon={<FiUser />}
                      label="Full Name*"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                    <FormInput
                      id="email"
                      icon={<FiMail />}
                      label="Email*"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      autoComplete="email"
                    />
                    <FormInput
                      id="phone"
                      icon={<FiPhone />}
                      label="Phone*"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      autoComplete="tel"
                    />
                    <FormInput
                      id="password"
                      icon={<FiLock />}
                      label="Password*"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <div className="md:col-span-2">
                      <FormInput
                        id="resume"
                        label="Resume (PDF)"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setResume(e.target.files?.[0] || null)}
                      />
                    </div>
                  </>
                )}

                {vendorType === "company" && (
                  <>
                    <FormInput
                      id="companyName"
                      label="Company Name*"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="ABC Company"
                    />
                    <FormInput
                      id="contactPerson"
                      label="Contact Person*"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="John Doe"
                    />
                    <FormInput
                      id="companyEmail"
                      label="Company Email*"
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="info@company.com"
                    />
                    <FormInput
                      id="companyPhone"
                      label="Company Phone*"
                      type="tel"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                    <div className="md:col-span-2">
                      <FormSelect
                        label="Company Address*"
                        id="companyAddress"
                        rows={3}
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="123 Business Street, City, State, Zip"
                      ></FormSelect>
                    </div>
                    <FormInput
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
                <Button onClick={handleNextStep}>
                  Next <FiChevronRight className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Services + Global City selection */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Select Packages & City
              </h2>

              <div className="mb-4">
                {citiesLoading ? (
                  <div className="flex items-center">
                    <FiLoader className="animate-spin h-5 w-5 text-primary mr-2" />
                    <span>Loading cities...</span>
                  </div>
                ) : (
                  <FormSelect
                    label="Service City"
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    placeholder="Select your city"
                    options={
                      cities.map((c) => ({
                        value: c.serviceCity,
                        label: c.serviceCity,
                      })) || []
                    }
                  />
                )}
              </div>

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
                <Button variant="ghost" onClick={handlePrevStep}>
                  <FiChevronLeft className="mr-2" /> Previous
                </Button>
                <Button onClick={handleNextStep}>
                  Next <FiChevronRight className="ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Confirm Registration
              </h2>

              <div className="grid grid-cols-1 gap-6">
                {/* left: Vendor basic info card */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-800">
                        Vendor Information
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Check your details before submitting. You can go back to
                        edit.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                        {vendorType === "individual" ? "Individual" : "Company"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vendorType === "individual" ? (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Full name</p>
                          <p className="text-sm font-medium text-gray-800">
                            {name}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-800">
                            {email}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-800">
                            {phone}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Resume</p>
                          <div className="flex items-center gap-3">
                            <p className="text-sm text-gray-700">
                              {resume ? resume.name : "Not provided"}
                            </p>
                            {resume ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-gray-50"
                                // if you have a resume URL you can set it here
                                onClick={() => {
                                  // optional: implement download behavior if resume URL exists
                                  toast.info(
                                    "Resume preview/download not implemented"
                                  );
                                }}
                              >
                                View
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Company</p>
                          <p className="text-sm font-medium text-gray-800">
                            {companyName}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">
                            Contact Person
                          </p>
                          <p className="text-sm font-medium text-gray-800">
                            {contactPerson}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Company Email</p>
                          <p className="text-sm font-medium text-gray-800">
                            {companyEmail}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500">Company Phone</p>
                          <p className="text-sm font-medium text-gray-800">
                            {companyPhone}
                          </p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs text-gray-500">Address</p>
                          <p className="text-sm text-gray-700">
                            {companyAddress}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Selected City */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">
                      Service City
                    </h4>
                    <div className="inline-flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5s-3 1.343-3 3 1.343 3 3 3z"
                        />
                        <path
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {(() => {
                            const cityObj =
                              cities.find(
                                (c) =>
                                  (c.service_city_id ??
                                    c.serviceCity ??
                                    c.id ??
                                    c.name) === selectedCity ||
                                  c.service_city_id === selectedCity
                              ) || null;
                            return cityObj
                              ? cityObj.serviceCity ??
                                  cityObj.name ??
                                  cityObj.cityName ??
                                  selectedCity
                              : selectedCity || "Not selected";
                          })()}
                        </p>
                        <p className="text-xs text-gray-500">
                          City where you'll provide services
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Packages summary */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-800 mb-3">
                      Selected Packages
                    </h4>
                    <div className="space-y-3">
                      {selectedServices.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          No packages selected
                        </p>
                      ) : (
                        selectedServices.map((pkg) => {
                          const pkgDetails = serviceCategories
                            .flatMap((c) => c.services || [])
                            .flatMap((s) => s.packages || [])
                            .find((p) => p.package_id === pkg.package_id);

                          return (
                            <div
                              key={pkg.package_id}
                              className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">
                                    {pkgDetails?.packageName ||
                                      `Package ID: ${pkg.package_id}`}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {pkgDetails?.description ||
                                    pkgDetails?.packageName
                                      ? ""
                                      : "No description available"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-primary/10 text-primary">
                                    {pkg.sub_packages.length} items
                                  </span>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {pkg.sub_packages.map((sub) => {
                                  const subDetails =
                                    pkgDetails?.sub_packages?.find(
                                      (s) => s.item_id === sub.item_id
                                    );
                                  return (
                                    <span
                                      key={sub.item_id}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                                    >
                                      {subDetails?.itemName ||
                                        `Item ${sub.item_id}`}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* right: Summary & actions card */}
                <div className=" flex flex-col items-center space-y-4">
                  <p className=" text-xs text-gray-500 text-center max-w-md">
                    By completing registration, you agree to our terms and
                    conditions. <br />
                    Admin will verify your details before activation.
                  </p>
                  {/* Action buttons */}
                  <div className="flex flex-wrap justify-center items-center gap-4 w-full">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={handlePrevStep}
                    >
                      <FiChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <FiLoader className="animate-spin h-4 w-4" />{" "}
                          Registering...
                        </>
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </div>

                  {/* Note */}
                </div>
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

export default Register;

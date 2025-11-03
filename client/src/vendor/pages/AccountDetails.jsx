import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig";
import Card from "../../shared/components/Card/Card";
import Input from "../../shared/components/Form/FormInput";
import Button from "../../shared/components/Button/Button";
import {
  Loader2,
  Building2,
  User,
  Mail,
  Shield,
  BanknoteIcon,
} from "lucide-react";
import { toast } from "react-toastify";

const AccountDetails = () => {
  const vendorData = localStorage.getItem("vendorData")
    ? JSON.parse(localStorage.getItem("vendorData"))
    : null;
  const vendorType = vendorData?.vendor_type;

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [formData, setFormData] = useState({
    account_holder_name: "",
    bank_name: "",
    institution_number: "",
    transit_number: "",
    account_number: "",
    bank_address: "",
    email: "",
    legal_name: "",
    dob: "",
    business_name: "",
    government_id: "",
    preferred_transfer_type: "",
    interac_email: "",
    interac_phone: "",
  });

  const [governmentIdFile, setGovernmentIdFile] = useState(null);

  const transferTypes = [
    { value: "e_transfer", label: "Interac E-Transfer" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  const canadianBanks = [
    { value: "RBC", label: "Royal Bank of Canada (RBC)" },
    { value: "TD", label: "Toronto-Dominion Bank (TD)" },
    { value: "Scotiabank", label: "Scotiabank" },
  ];

  // Fetch account details
  const fetchAccount = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/payment/get-bank-details");
      if (res.data) {
        setAccount(res.data);
        setFormData({
          ...res.data,
          dob: res.data.dob ? res.data.dob.split("T")[0] : "",
        });
        setEditing(false);
      } else {
        setAccount(null);
        setEditing(true);
      }
    } catch (err) {
      console.error("Error fetching account:", err);
      setAccount(null);
      setEditing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Numeric restrictions
    if (["institution_number", "transit_number", "account_number", "interac_phone"].includes(name)) {
      let filtered = value.replace(/\D/g, ""); // only digits

      // length restrictions
      if (name === "institution_number") filtered = filtered.slice(0, 3);
      if (name === "transit_number") filtered = filtered.slice(0, 5);
      if (name === "account_number") filtered = filtered.slice(0, 12);
      if (name === "interac_phone") filtered = filtered.slice(0, 15);

      setFormData({ ...formData, [name]: filtered });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setGovernmentIdFile(e.target.files[0]);
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }
      if (governmentIdFile) {
        formDataToSend.append("government_id", governmentIdFile);
      }
      await api.post("/api/payment/register-bank", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Bank account created successfully!");
      await fetchAccount();
    } catch (err) {
      console.error("Error creating account:", err);
      toast.error("Failed to create bank account.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }
      if (governmentIdFile) {
        formDataToSend.append("government_id", governmentIdFile);
      }
      await api.patch("/api/payment/edit-bank-details", formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Bank account updated successfully!");
      await fetchAccount();
    } catch (err) {
      console.error("Error updating account:", err);
      toast.error("Failed to update bank account.");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (label, name, type = "text", placeholder = "") => (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <Input
        type={type}
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        disabled={!editing}
        placeholder={placeholder}
        className="w-full"
        inputMode={["institution_number", "transit_number", "account_number", "interac_phone"].includes(name) ? "numeric" : "text"}
        pattern={["institution_number", "transit_number", "account_number", "interac_phone"].includes(name) ? "[0-9]*" : undefined}
      />
    </div>
  );

  const renderDropdown = (label, name, options) => (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <select
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        disabled={!editing}
        className="w-full p-3 border border-gray-300 rounded-lg disabled:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderVendorSpecificFields = () => {
    if (vendorType === "individual") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField("Full Legal Name", "legal_name", "text", "Name as on ID")}
          {renderField("Date of Birth", "dob", "date")}
        </div>
      );
    } else if (vendorType === "company") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {renderField("Business Name", "business_name", "text", "Registered business name")}
          {renderField("Legal Entity Name", "legal_name", "text", "Legal name")}
        </div>
      );
    }
    return null;
  };

  const renderFileUpload = () => (
    <div className="space-y-1">
      <label className="text-sm font-semibold text-gray-700">
        Government ID (Upload)
      </label>
      <input
        type="file"
        name="government_id"
        onChange={handleFileChange}
        disabled={!editing}
        accept=".jpg,.jpeg,.png,.pdf"
        className="w-full p-2 bg-white border border-gray-300 rounded-lg file:mr-3 file:py-2 file:px-4 file:border-0 file:rounded-md file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 disabled:opacity-70"
      />
      {formData.government_id && !governmentIdFile && (
        <p className="text-xs text-gray-600">
          Current file: {formData.government_id.split("/").pop()}
        </p>
      )}
    </div>
  );

  const renderTransferType = () => (
    <div className="space-y-4">
      {renderDropdown("Preferred Transfer Type", "preferred_transfer_type", transferTypes)}
      {formData.preferred_transfer_type === "e_transfer" && (
        <div className="grid grid-cols-1 gap-4 p-4 rounded-lg md:grid-cols-2 bg-blue-50">
          {renderField("Interac Email", "interac_email", "email", "email@example.com")}
          {renderField("Interac Phone (Numbers Only)", "interac_phone", "tel", "e.g. 4165551234")}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-5xl p-6 mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
          <p className="mt-1 text-gray-600">
            Manage your payout details and KYC verification.
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <div className="p-6 space-y-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BanknoteIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Bank Account Details</h2>
                  <p className="text-sm text-gray-600">
                    {account
                      ? "Your bank account is verified and ready for payouts."
                      : "Add your bank details to start receiving payments."}
                  </p>
                </div>
              </div>
              {account && !editing && (
                <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700">
                  Edit Details
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-blue-600 animate-spin" size={32} />
                <span className="ml-3 text-gray-600">Loading account details...</span>
              </div>
            ) : (
              <>
                {/* Bank Info */}
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Bank Information</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderField("Account Holder Name", "account_holder_name", "text", "Legal name on bank account")}
                    {renderDropdown("Bank Name", "bank_name", canadianBanks)}
                    {renderField("Institution Number (3 digits)", "institution_number", "text", "e.g. 004")}
                    {renderField("Transit Number (5 digits)", "transit_number", "text", "e.g. 12345")}
                    {renderField("Account Number (7–12 digits)", "account_number", "text", "e.g. 1234567")}
                    {renderField("Bank Address (optional)", "bank_address", "text", "Branch address")}
                  </div>
                </section>

                {/* Contact Info */}
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {renderField("Email Address", "email", "email", "vendor@example.com")}
                  </div>
                </section>

                {/* Vendor Info */}
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vendorType === "individual"
                        ? "Individual Details"
                        : "Business Details"}
                    </h3>
                  </div>
                  {renderVendorSpecificFields()}
                </section>

                {/* KYC Verification */}
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Identity Verification</h3>
                  </div>
                  {renderFileUpload()}
                </section>

                {/* Transfer Preferences */}
                <section className="space-y-4">
                  <div className="flex items-center mb-2 space-x-2">
                    <BanknoteIcon className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Transfer Preferences</h3>
                  </div>
                  {renderTransferType()}
                </section>

                {/* Buttons */}
                {editing && (
                  <div className="flex justify-end pt-6 space-x-3 border-t">
                    <Button
                      variant="lightInherit"
                      onClick={() => {
                        fetchAccount();
                        setEditing(false);
                      }}
                      className="border border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={account ? handleUpdate : handleCreate}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={loading}
                    >
                      {loading
                        ? account
                          ? "Saving..."
                          : "Registering..."
                        : account
                        ? "Save Changes"
                        : "Register Bank Account"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccountDetails;

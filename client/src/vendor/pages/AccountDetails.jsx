import React, { useEffect, useState } from "react";
import api from "../../lib/axiosConfig"; // your axios instance
import Card from "../../shared/components/Card/Card";
import Input from "../../shared/components/Form/FormInput";
import Button from "../../shared/components/Button/Button";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";

const AccountDetails = () => {
  const vendorType =
    localStorage.getItem("vendor") &&
    JSON.parse(localStorage.getItem("vendor")).vendor_type;

  const [account, setAccount] = useState(null);
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
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const transferTypes = [
    { value: "e_transfer", label: "E-Transfer" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ];

  // Fetch account details (GET API)
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      await api.post("/api/payment/register-bank", formData);
      await fetchAccount();
      toast.success("Bank account created successfully!");
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
      await api.patch("/api/payment/edit-bank-details", formData);
      await fetchAccount();
      toast.success("Bank account updated successfully!");
    } catch (err) {
      toast.error("Failed to update bank account.");
      console.error("Error updating account:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render text field
  const renderField = (label, name, type = "text") => (
    <div>
      <p className="font-semibold mb-1">{label}</p>
      <Input
        type={type}
        name={name}
        value={formData[name] || ""}
        onChange={handleChange}
        disabled={!editing}
      />
    </div>
  );

  // Render dropdown for transfer type
  const renderTransferType = () => (
    <div>
      <p className="font-semibold mb-1">Preferred Transfer Type</p>
      <select
        name="preferred_transfer_type"
        value={formData.preferred_transfer_type || ""}
        onChange={handleChange}
        disabled={!editing}
        className="w-full border rounded-md p-2 disabled:bg-gray-100"
      >
        <option value="">Select Transfer Type</option>
        {transferTypes.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Conditional fields based on vendor type
  const renderVendorSpecificFields = () => {
    if (vendorType === "individual") {
      return (
        <>
          {renderField("Legal Name", "legal_name")}
          {renderField("Date of Birth", "dob", "date")}
        </>
      );
    } else if (vendorType === "company") {
      return <>{renderField("Business Name", "business_name")}</>;
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Card className="shadow-lg p-4">
        <h2 className="text-xl font-bold mb-4">Bank Account Details</h2>
        {loading ? (
          <div className="flex justify-center items-center">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : account ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {renderField("Account Holder Name", "account_holder_name")}
              {renderField("Bank Name", "bank_name")}
              {renderField("Institution Number", "institution_number")}
              {renderField("Transit Number", "transit_number")}
              {renderField("Account Number", "account_number")}
              {renderField("Bank Address", "bank_address")}
              {renderField("Email", "email")}
              {renderVendorSpecificFields()}
              {renderField("Government ID", "government_id")}
              {renderTransferType()}
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              {editing ? (
                <>
                  <Button variant="lightInherit" onClick={() => fetchAccount()}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate}>Save Changes</Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>Edit</Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p>No bank account found. Please register one:</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {renderField("Account Holder Name", "account_holder_name")}
              {renderField("Bank Name", "bank_name")}
              {renderField("Institution Number", "institution_number")}
              {renderField("Transit Number", "transit_number")}
              {renderField("Account Number", "account_number")}
              {renderField("Bank Address", "bank_address")}
              {renderField("Email", "email")}
              {renderVendorSpecificFields()}
              {renderField("Government ID", "government_id")}
              {renderTransferType()}
            </div>
            <Button className="mt-4" onClick={handleCreate}>
              Register Bank Account
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountDetails;

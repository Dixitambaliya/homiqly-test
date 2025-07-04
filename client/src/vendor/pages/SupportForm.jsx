import React, { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FormInput, FormTextarea } from "../../shared/components/Form";
import { Button } from "../../shared/components/Button";
import { toast } from "react-toastify";

const SupportForm = () => {
  const [form, setForm] = useState({
    name: "",
    // email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);

  // Decode token and set email on mount
//   useEffect(() => {
//     const token = localStorage.getItem("vendorToken");
//     if (token) {
//       try {
//         const decoded = jwtDecode(token); // new
//         console.log("Decoded token:", decoded);
//         if (decoded && decoded.email) {
//           setForm((prev) => ({ ...prev, email: decoded.email }));
//         }
//       } catch (err) {
//         console.error("Invalid token", err);
//       }
//     }
//   }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post("/api/contact", form);
      toast.success("Ticket sent successfully!");
      setForm({ name: "", subject: "", message: "" }); // keep email intact
    } catch (error) {
      toast.error("Failed to send ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-4">
      <FormInput
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Your Name"
        required
      />
      {/* <FormInput
        type="email"
        name="email"
        value={form.email}
        onChange={handleChange}
        placeholder="Your Email"
        required
        disabled // prevent user from changing auto-filled email
      /> */}
      <FormInput
        name="subject"
        value={form.subject}
        onChange={handleChange}
        placeholder="Subject"
        required
      />
      <FormTextarea
        name="message"
        value={form.message}
        onChange={handleChange}
        placeholder="Describe your issue"
        required
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Submit Ticket"}
        </Button>
      </div>
    </form>
  );
};

export default SupportForm;

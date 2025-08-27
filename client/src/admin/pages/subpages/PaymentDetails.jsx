import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const location = useLocation();
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("Payment ID from route:", paymentId);
    if (!payment) fetchPayment();
  }, [paymentId, payment]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/getpayments");

      const found = res.data.payments.find(
        (p) => p.payment_id === Number(paymentId)
      );

      if (found) {
        setPayment(found);
      } else {
        setError("Payment not found.");
      }
    } catch (error) {
      console.error("Failed to fetch payment:", error);
      setError("Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   fetchPayment();
  // }, [paymentId]);

  useEffect(() => {
    fetchPayment();
  }, [!paymentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="bg-red-50 p-4 rounded-md mt-6 text-center text-red-500">
        {error || "Payment not found"}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <Breadcrumb
        links={[
          { label: "Admin", to: "/admin" },
          { label: "Payments", to: "/admin/payments" },
          { label: `Payment #${payment.payment_id}`, to: "#" },
        ]}
      />
      <h1 className="text-2xl font-bold text-gray-800">Payment Details</h1>

      {/* Payment Info */}
      <div className="bg-white rounded-lg shadow border p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Payment ID</p>
          <p className=" text-gray-900">#{payment.payment_id}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Amount</p>
          <p className=" text-green-600">
            {formatCurrency(payment.amount, "CAD")}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Status</p>
          <p className=" capitalize text-gray-800">{payment.status}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className=" text-gray-900">{payment.paidAt}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Card</p>
          <p className=" text-gray-800">
            {payment.cardBrand?.toUpperCase()} •••• {payment.last4}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Receipt</p>
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline "
          >
            View Receipt
          </a>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">User Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Name</p>
            <p className=" text-gray-900">
              {payment.user_firstname} {payment.user_lastname}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Email</p>
            <p className=" text-gray-900">{payment.user_email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Phone</p>
            <p className=" text-gray-900">{payment.user_phone}</p>
          </div>
        </div>
      </div>

      {/* Vendor Info */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Vendor Info ({payment.vendorType})
        </h2>
        <div className="flex items-center space-x-4 mb-4">
          <img
            src={
              payment.individual_profile_image || payment.company_profile_image
            }
            alt="Vendor"
            className="h-16 w-16 rounded-full object-cover border"
          />
          <div>
            <p className="text-lg  text-gray-900">
              {payment.individual_name || payment.companyName}
            </p>
            <p className="text-sm text-gray-500">
              {payment.individual_email || payment.email}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-1">Phone</p>
        <p className=" text-gray-900">
          {payment.individual_phone || payment.contactPerson}
        </p>
      </div>

      {/* Package Info */}
      <div className="bg-white rounded-lg shadow border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Package</h2>
        <div className="flex items-start space-x-4">
          <img
            src={payment.packageMedia}
            alt="Package"
            className="w-32 h-20 object-cover rounded-md border"
          />
          <div>
            <p className=" text-gray-900">{payment.packageName}</p>
            <p className="text-sm text-gray-500">{payment.totalTime}</p>
            <p className="text-sm text-gray-500">
              {formatCurrency(payment.totalPrice)}{" "}
              {payment.currency?.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;

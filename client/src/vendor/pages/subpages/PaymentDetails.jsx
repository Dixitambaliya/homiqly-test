"use client";

import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(location.state?.payment || null);

  useEffect(() => {
    if (!payment) {
      // fallback logic (if location.state is not present)
      console.warn("Payment not found in state");
    }
  }, [paymentId]);

  if (!payment) {
    return (
      <div className="p-6 text-center text-gray-500">
        Payment details not available.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payment Details</h2>
        <button
          className="flex items-center text-sm text-primary hover:underline"
          onClick={() => navigate(-1)}
        >
          <FiArrowLeft className="mr-1" /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded shadow">
        <div>
          <p className="text-sm text-gray-500 mb-1">Payment ID</p>
          <p className="text-gray-800 font-medium">#{payment.payment_id}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Status</p>
          <p
            className={`text-sm font-semibold px-2 py-1 inline-block rounded-full ${
              payment.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {payment.status}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className="text-gray-800 font-medium">
            {formatDate(payment.created_at)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Amount</p>
          <p className="text-gray-800 font-medium">
            {formatCurrency(payment.amount)} {payment.currency?.toUpperCase()}
          </p>
        </div>

        <div className="md:col-span-2 border-t pt-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            Package Details
          </h4>
          <p className="text-gray-900 font-medium">
            {payment.packageName} - {payment.totalTime}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            Price: {formatCurrency(parseFloat(payment.totalPrice))}
          </p>
          <img
            src={payment.packageMedia}
            alt="Package"
            className="w-40 h-28 object-cover rounded"
          />
        </div>

        <div className="md:col-span-2 border-t pt-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            Vendor Details
          </h4>
          <div className="flex items-center space-x-4">
            <img
              src={payment.company_profile_image}
              alt="Vendor"
              className="w-16 h-16 rounded-full object-cover border"
            />
            <div>
              <p className="text-gray-900 font-medium">
                {payment.companyName} ({payment.vendorType})
              </p>
              <p className="text-sm text-gray-500">{payment.email}</p>
              <p className="text-sm text-gray-500">{payment.phone}</p>
              <p className="text-sm text-gray-500">
                Contact Person: {payment.contactPerson}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 border-t pt-4">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            User Details
          </h4>
          <p className="text-gray-900 font-medium">
            {payment.user_firstname} {payment.user_lastname}
          </p>
          <p className="text-sm text-gray-500">{payment.user_email}</p>
          <p className="text-sm text-gray-500">{payment.user_phone}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;

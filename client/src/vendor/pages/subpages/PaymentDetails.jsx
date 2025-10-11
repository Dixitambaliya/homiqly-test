import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import Breadcrumb from "../../../shared/components/Breadcrumb";

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(location.state?.payment || null);

  useEffect(() => {
    if (!payment) {
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
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          
          <Breadcrumb
            links={[
              { label: "Dashboard", to: "/vendor" },
              { label: "Payments", to: "/vendor/payments" },
              { label: "Payment Details" },
            ]}
          />
        </div>
      </div>

      {/* Payment Summary Card */}
      <div className="bg-white shadow-md rounded-2xl p-6 mb-5">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Payment Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="text-gray-900 font-medium">#{payment.booking_id}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Payment Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                payment.payment_status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {payment.payment_status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Payout Amount</p>
            <p className="text-gray-900 font-medium">
              {formatCurrency(payment.payoutAmount)}{" "}
              {payment.payment_currency?.toUpperCase()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Booking Date</p>
            <p className="text-gray-900 font-medium">
              {formatDate(payment.bookingDate)} at {payment.bookingTime}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Created On</p>
            <p className="text-gray-900 font-medium">
              {formatDate(payment.created_at)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Service ID</p>
            <p className="text-gray-900 font-medium">#{payment.service_id}</p>
          </div>
        </div>
      </div>

      {/* Package Section */}
      <div className="bg-white shadow-md rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Package Details
        </h3>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <img
            src={payment.packageMedia || payment.bookingMedia}
            alt="Package"
            className="w-48 h-32 object-cover rounded-lg shadow"
          />
          <div>
            <p className="text-gray-900 font-medium text-lg">
              {payment.packageName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Service ID: #{payment.service_id}
            </p>
            <p className="text-sm text-gray-500">
              Price: {formatCurrency(payment.payoutAmount)}{" "}
              {payment.payment_currency?.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="bg-white shadow-md rounded-2xl p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          User Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="text-gray-900 font-medium">{payment.user_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-gray-900 font-medium">{payment.user_email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="text-gray-900 font-medium">{payment.user_phone}</p>
          </div>
        </div>
      </div>

      {/* Vendor Section */}
      {payment.vendor_name && (
        <div className="bg-white shadow-md rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Vendor Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Vendor Name</p>
              <p className="text-gray-900 font-medium">{payment.vendor_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-gray-900 font-medium">
                {payment.vendor_email}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="text-gray-900 font-medium">
                {payment.vendor_phone}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {payment.notes && (
        <div className="bg-white shadow-md rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Notes</h3>
          <p className="text-gray-700">{payment.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentDetails;

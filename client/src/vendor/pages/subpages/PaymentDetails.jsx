// pages/vendor/components/PaymentDetails.jsx
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { formatDate } from "../../../shared/utils/dateUtils";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { ArrowLeft } from "lucide-react";

const PaymentDetails = () => {
  const { paymentId } = useParams(); // route param (booking_id passed earlier)
  const location = useLocation();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // try to fetch individual payment if not passed via location.state
  useEffect(() => {
    const fetchPayment = async (id) => {
      try {
        setLoading(true);
        // attempt an endpoint - if your backend has a different path update it
        const res = await axios.get(`/api/vendor/getpayment/${id}`);
        const data = res.data || null;
        if (data) {
          // If API returns wrapper like { payout: {...} } adapt here.
          setPayment(data);
        } else {
          setError("Payment not found");
        }
      } catch (err) {
        console.warn("Could not fetch payment details", err);
        setError("Payment details unavailable");
      } finally {
        setLoading(false);
      }
    };

    if (!payment && paymentId) {
      // paymentId may be booking_id — try fetch
      fetchPayment(paymentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-b-2 border-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6 text-center text-gray-500">
        Payment details not available.
      </div>
    );
  }

  // Normalize fields from the API shape you provided
  const bookingId = payment.booking_id ?? payment.payout_id ?? payment.id;
  const payoutAmount = Number(payment.payout_amount ?? payment.payoutAmount ?? payment.gross_amount ?? 0);
  const currencyRaw = (payment.currency ?? payment.payment_currency ?? "cad").toString();
  const currencyLabel = (currencyRaw || "CAD").toUpperCase();
  const statusRaw = (payment.payout_status ?? payment.payment_status ?? payment.bookingStatus ?? "").toString().toLowerCase();

  const statusLabel =
    statusRaw === "pending"
      ? "Pending"
      : statusRaw === "paid"
      ? "Paid"
      : statusRaw === "completed"
      ? "Completed"
      : statusRaw === "rejected" || statusRaw === "cancelled"
      ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
      : statusRaw
      ? statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
      : "Unknown";

  const statusClasses =
    statusLabel === "Pending"
      ? "bg-yellow-100 text-yellow-700"
      : statusLabel === "Paid"
      ? "bg-blue-100 text-blue-800"
      : statusLabel === "Completed"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-700";

  // Try to format via formatCurrency utility if available; otherwise fallback
  const formattedPayout = (() => {
    try {
      // many formatCurrency implementations accept (amount, currency)
      const fc = formatCurrency(payoutAmount, currencyLabel);
      if (fc && typeof fc === "string") return fc;
    } catch (e) {
      // ignore and fallback
    }
    // fallback basic formatting
    const prefix = currencyLabel === "CAD" || currencyLabel === "C$" ? "C$" : currencyLabel + " ";
    return `${prefix}${payoutAmount.toFixed(2)}`;
  })();

  return (
    <div className="max-w-5xl p-6 mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
      <div className="p-6 bg-white shadow-md rounded-2xl">
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          Payment Summary
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Booking ID</p>
            <p className="font-medium text-gray-900">#{bookingId}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Payment Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}>
              {statusLabel}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Payout Amount</p>
            <p className="font-medium text-gray-900">
              {formattedPayout}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Booking Date</p>
            <p className="font-medium text-gray-900">
              {payment.bookingDate ? formatDate(payment.bookingDate) : "-"}{" "}
              {payment.bookingTime ? `at ${payment.bookingTime}` : ""}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Created On</p>
            <p className="font-medium text-gray-900">
              {payment.created_at ? formatDate(payment.created_at) : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Service ID</p>
            <p className="font-medium text-gray-900">#{payment.package_id ?? payment.service_id ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Package Section */}
      <div className="p-6 bg-white shadow-md rounded-2xl">
        <h3 className="mb-4 text-xl font-semibold text-gray-800">
          Package Details
        </h3>
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <img
            src={payment.packageMedia ?? payment.bookingMedia}
            alt={payment.packageName ?? "Package"}
            className="object-cover w-48 h-32 rounded-lg shadow"
          />
          <div>
            <p className="text-lg font-medium text-gray-900">
              {payment.packageName ?? "—"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Service ID: #{payment.package_id ?? payment.service_id ?? "—"}
            </p>
            <p className="text-sm text-gray-500">
              Price: {formattedPayout}
            </p>
            {payment.platform_fee_percentage && (
              <p className="mt-1 text-sm text-gray-500">
                Platform Fee: {payment.platform_fee_percentage}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-6 bg-white shadow-md rounded-2xl">
        <h3 className="mb-4 text-xl font-semibold text-gray-800">
          User Information
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium text-gray-900">{payment.user_name ?? payment.user_fullname ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{payment.user_email ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">{payment.user_phone ?? "-"}</p>
          </div>
        </div>
      </div>

      {/* Vendor Section */}
      {(payment.vendor_name || payment.vendor_email || payment.vendor_phone) && (
        <div className="p-6 bg-white shadow-md rounded-2xl">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">
            Vendor Information
          </h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Vendor Name</p>
              <p className="font-medium text-gray-900">{payment.vendor_name ?? "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">
                {payment.vendor_email ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-900">
                {payment.vendor_phone ?? "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {payment.notes && (
        <div className="p-6 bg-white shadow-md rounded-2xl">
          <h3 className="mb-4 text-xl font-semibold text-gray-800">Notes</h3>
          <p className="text-gray-700">{payment.notes}</p>
        </div>
      )}
    </div>
  );
};

export default PaymentDetails;

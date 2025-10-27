import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import { formatCurrency } from "../../../shared/utils/formatUtils";
import api from "../../../lib/axiosConfig";
import Breadcrumb from "../../../shared/components/Breadcrumb";
import { Button } from "../../../shared/components/Button";
import {
  Briefcase,
  CheckCircle,
  Clipboard,
  Clock,
  ExternalLink,
  User,
} from "lucide-react";

const PaymentDetails = () => {
  const { paymentId } = useParams();
  const location = useLocation();
  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only fetch when we don't have initial payment from location.state
    if (payment) {
      fetchPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/getpayments");
      const found = res.data.payments.find(
        (p) => Number(p.payment_id) === Number(paymentId)
      );

      if (found) {
        setPayment(found);
        setError(null);
      } else {
        setError("Payment not found.");
      }
    } catch (err) {
      console.error("Failed to fetch payment:", err);
      setError("Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error("copy failed", err);
    }
  };

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

  // Derived values
  const paidAtFormatted =
    payment.paidAt || new Date(payment.created_at).toLocaleString();
  const currency =
    (payment.currency || payment.currency === "cad"
      ? payment.currency
      : payment.currency
    )?.toUpperCase() ||
    (payment.currency && payment.currency.toUpperCase()) ||
    "CAD";
  const amount = formatCurrency(payment.amount, currency);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        links={[
          { label: "Admin", to: "/admin" },
          { label: "Payments", to: "/admin/payments" },
          { label: `Payment #${payment.payment_id}`, to: "#" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Payment #{payment.payment_id}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />• {paidAtFormatted}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-md shadow-sm text-sm hover:bg-gray-50"
            title="Open receipt in new tab"
          >
            <ExternalLink className="w-4 h-4" />
            View Receipt
          </a>

          <Button
            onClick={() => copyToClipboard(payment.receiptUrl)}
            title="Copy receipt link"
          >
            <Clipboard className="w-4 h-4" />
            {copied ? "Copied" : "Copy Link"}
          </Button>

          {/* <a
            href={payment.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 px-3 py-2 bg-primary-light text-white rounded-md text-sm hover:bg-primary-dark"
            title="Download receipt"
          >
            <FiDownload />
            Download
          </a> */}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border p-4">
          <p className="text-sm text-gray-500">Amount</p>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {amount}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Paid via {payment.cardBrand?.toUpperCase()} •••• {payment.last4}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow border p-4">
          <p className="text-sm text-gray-500">Status</p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                payment.status === "completed"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {payment.status}
            </span>
          </div>

          <p className="text-sm text-gray-500 mt-4">Payment intent</p>
          <div className="mt-1 text-sm text-gray-800 break-all">
            {payment.payment_intent_id || payment.paymentIntentId}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-500">Receipt</p>
            <a
              href={payment.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm font-medium text-blue-600 hover:underline break-all"
            >
              View Receipt
            </a>
            <p className="text-xs text-gray-400 mt-2">
              Receipt sent to {payment.receiptEmail || payment.user_email}
            </p>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <div>
              Charge ID:{" "}
              <span className="font-mono text-gray-700">
                {payment.chargeId}
              </span>
            </div>
            <div className="mt-1">
              Created:{" "}
              <span className="text-gray-700">
                {new Date(payment.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column detail area */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Invoice / Package */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex items-start gap-4">
            <img
              src={payment.packageMedia}
              alt={payment.packageName}
              className="w-28 h-20 object-cover rounded-md border"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {payment.packageName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {payment.totalTime || "—"} •{" "}
                    {payment.package_id ? `Package #${payment.package_id}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(
                      payment.totalPrice ?? payment.amount,
                      currency
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {(payment.currency || currency).toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice metadata */}
          <div className="mt-6 border-t pt-4 text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />{" "}
              <span className="font-medium">Customer:</span>{" "}
              <span className="ml-1">
                {payment.user_firstname} {payment.user_lastname}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />{" "}
              <span className="font-medium">Vendor:</span>{" "}
              <span className="ml-1">
                {payment.companyName || payment.individual_name || "—"}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-medium">Notes:</span>
              <span className="ml-1 text-gray-500">{payment.notes || "—"}</span>
            </div>
          </div>
        </div>

        {/* Right: User and Vendor cards */}
        <div className="space-y-6">
          {/* User */}
          <div className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-700">
                {payment.user_firstname
                  ? payment.user_firstname[0].toUpperCase()
                  : "U"}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Customer</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {payment.user_firstname} {payment.user_lastname}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  <div>
                    Email:{" "}
                    <span className="text-gray-800">{payment.user_email}</span>
                  </div>
                  <div>
                    Phone:{" "}
                    <span className="text-gray-800">{payment.user_phone}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vendor */}
          <div className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-start gap-4">
              <img
                src={
                  payment.individual_profile_image ||
                  payment.company_profile_image ||
                  payment.packageMedia
                }
                alt="vendor"
                className="h-14 w-14 rounded-md object-cover border"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Vendor</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {payment.vendorType === "company"
                        ? payment.companyName || "Company"
                        : payment.individual_name || "Vendor"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600 space-y-1">
                  <div>
                    Contact:{" "}
                    <span className="text-gray-800">
                      {payment.contactPerson || payment.individual_name || "-"}
                    </span>
                  </div>
                  <div>
                    Email:{" "}
                    <span className="text-gray-800">
                      {payment.email || payment.individual_email || "-"}
                    </span>
                  </div>
                  <div>
                    Phone:{" "}
                    <span className="text-gray-800">
                      {payment.phone || payment.individual_phone || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Meta / small actions */}
          <div className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">Payment meta</div>
              <div className="text-sm text-gray-700 font-medium">
                {payment.payment_id}
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <div>Paid at</div>
                <div className="text-gray-800">{paidAtFormatted}</div>
              </div>

              <div className="flex items-center justify-between">
                <div>Currency</div>
                <div className="text-gray-800">
                  {(payment.currency || currency).toUpperCase()}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>Receipt</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(payment.receiptUrl)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                    title="Copy receipt URL"
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>

                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              <div>
                Payment Intent:{" "}
                <span className="font-mono text-gray-700">
                  {payment.payment_intent_id || payment.paymentIntentId}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;

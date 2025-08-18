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

  console.log(payment);

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
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center">
          <Breadcrumb
            links={[
              { label: "Dashboard", to: "/vendor" },
              { label: "Payments", to: "/vendor/payments" },
              { label: "Payment Details" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded shadow">
          {/* Booking / Payment Info */}
          <div>
            <p className="text-sm text-gray-500 mb-1">Booking ID</p>
            <p className="text-gray-800 font-medium">#{payment.booking_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Payment Intent</p>
            <p className="text-gray-800 font-medium truncate">
              {payment.payment_intent_id || "Not Created"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Booking Date</p>
            <p className="text-gray-800 font-medium">
              {formatDate(payment.bookingDate)} at {payment.bookingTime}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Created</p>
            <p className="text-gray-800 font-medium">
              {formatDate(payment.created_at)}
            </p>
          </div>

          {/* Package Info */}
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
            {payment.bookingMedia && (
              <img
                src={payment.bookingMedia}
                alt="Package"
                className="w-40 h-28 object-cover rounded"
              />
            )}
          </div>

          {/* Vendor Info */}
          <div className="md:col-span-2 border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">
              Vendor Details
            </h4>
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-gray-900 font-medium">
                  {payment.vendor_name} ({payment.vendorType})
                </p>
                <p className="text-sm text-gray-500">{payment.vendor_email}</p>
                <p className="text-sm text-gray-500">{payment.vendor_phone}</p>
                {payment.contactPerson && (
                  <p className="text-sm text-gray-500">
                    Contact Person: {payment.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="md:col-span-2 border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-700 mb-3">
              User Details
            </h4>
            <p className="text-gray-900 font-medium">{payment.user_name}</p>
            <p className="text-sm text-gray-500">{payment.user_email}</p>
            <p className="text-sm text-gray-500">{payment.user_phone}</p>
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="md:col-span-2 border-t pt-4">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">
                Notes
              </h4>
              <p className="text-gray-600">{payment.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentDetails;

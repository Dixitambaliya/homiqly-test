const paymentPostQueries = {
    createVendorPayment: `
        INSERT INTO vendor_payments (
            vendor_id,
            booking_id,
            amount,
            commission_rate,
            commission_amount,
            net_amount,
            payment_status,
            payment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `,

    createContractorPayout: `
        INSERT INTO contractor_payouts (
            contractor_id,
            booking_id,
            amount,
            commission_rate,
            commission_amount,
            net_amount,
            payout_status,
            payout_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `,

    recordPaymentTransaction: `
        INSERT INTO payment_transactions (
            transaction_type,
            reference_id,
            amount,
            payment_method,
            transaction_status,
            transaction_date,
            gateway_response
        ) VALUES (?, ?, ?, ?, ?, NOW(), ?)
    `
};

module.exports = paymentPostQueries;
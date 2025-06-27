const { db } = require('../config/db');
const asyncHandler = require('express-async-handler');
const paymentGetQueries = require('../config/paymentQueries/paymentGetQueries');
const paymentPostQueries = require('../config/paymentQueries/paymentPostQueries');

const processVendorPayment = asyncHandler(async (req, res) => {
    const { booking_id, vendor_id, amount, commission_rate } = req.body;

    if (!booking_id || !vendor_id || !amount || !commission_rate) {
        return res.status(400).json({ message: "All payment details are required" });
    }

    try {
        const commission_amount = (amount * commission_rate) / 100;
        const net_amount = amount - commission_amount;

        // Create vendor payment record
        await db.query(paymentPostQueries.createVendorPayment, [
            vendor_id,
            booking_id,
            amount,
            commission_rate,
            commission_amount,
            net_amount,
            'pending' // payment_status
        ]);

        res.status(201).json({
            message: "Vendor payment processed successfully",
            net_amount,
            commission_amount
        });

    } catch (error) {
        console.error("Error processing vendor payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getVendorPayments = asyncHandler(async (req, res) => {
    const vendor_id = req.user.vendor_id;

    try {
        const [payments] = await db.query(paymentGetQueries.getVendorPayments, [vendor_id]);

        res.status(200).json({
            message: "Vendor payments fetched successfully",
            payments
        });

    } catch (error) {
        console.error("Error fetching vendor payments:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const getPendingPayouts = asyncHandler(async (req, res) => {
    try {
        const [payouts] = await db.query(paymentGetQueries.getPendingPayouts);

        res.status(200).json({
            message: "Pending payouts fetched successfully",
            payouts
        });

    } catch (error) {
        console.error("Error fetching pending payouts:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

const approvePayment = asyncHandler(async (req, res) => {
    const { payment_id, payout_type } = req.body;

    if (!payment_id || !payout_type) {
        return res.status(400).json({ message: "Payment ID and payout type are required" });
    }

    try {
        let updateQuery;
        if (payout_type === 'vendor') {
            updateQuery = `
                UPDATE vendor_payments 
                SET payment_status = 'completed', payout_date = NOW() 
                WHERE payment_id = ?
            `;
        } else if (payout_type === 'contractor') {
            updateQuery = `
                UPDATE contractor_payouts 
                SET payout_status = 'completed', payout_date = NOW() 
                WHERE payout_id = ?
            `;
        } else {
            return res.status(400).json({ message: "Invalid payout type" });
        }

        await db.query(updateQuery, [payment_id]);

        res.status(200).json({
            message: "Payment approved successfully"
        });

    } catch (error) {
        console.error("Error approving payment:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
});

module.exports = {
    processVendorPayment,
    getVendorPayments,
    getPendingPayouts,
    approvePayment
};
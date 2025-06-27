const paymentGetQueries = {
    getVendorPayments: `
        SELECT 
            vp.payment_id,
            vp.vendor_id,
            vp.booking_id,
            vp.amount,
            vp.commission_rate,
            vp.commission_amount,
            vp.net_amount,
            vp.payment_status,
            vp.payment_date,
            vp.payout_date,
            
            sb.bookingDate,
            sb.bookingTime,
            s.serviceName,
            sc.serviceCategory
            
        FROM vendor_payments vp
        JOIN service_booking sb ON vp.booking_id = sb.booking_id
        JOIN services s ON sb.service_id = s.service_id
        JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        WHERE vp.vendor_id = ?
        ORDER BY vp.payment_date DESC
    `,

    getContractorPayments: `
        SELECT 
            cp.payout_id,
            cp.contractor_id,
            cp.booking_id,
            cp.amount,
            cp.commission_rate,
            cp.commission_amount,
            cp.net_amount,
            cp.payout_status,
            cp.payout_date,
            
            sb.bookingDate,
            sb.bookingTime,
            s.serviceName,
            sc.serviceCategory
            
        FROM contractor_payouts cp
        JOIN service_booking sb ON cp.booking_id = sb.booking_id
        JOIN services s ON sb.service_id = s.service_id
        JOIN service_categories sc ON sb.service_categories_id = sc.service_categories_id
        WHERE cp.contractor_id = ?
        ORDER BY cp.payout_date DESC
    `,

    getPendingPayouts: `
        SELECT 
            'vendor' as payout_type,
            vp.payment_id as id,
            vp.vendor_id as provider_id,
            CASE 
                WHEN v.vendorType = 'individual' THEN ind.name
                WHEN v.vendorType = 'company' THEN comp.companyName
            END as provider_name,
            vp.net_amount,
            vp.payment_date,
            s.serviceName
        FROM vendor_payments vp
        JOIN vendors v ON vp.vendor_id = v.vendor_id
        LEFT JOIN individual_details ind ON v.vendor_id = ind.vendor_id
        LEFT JOIN company_details comp ON v.vendor_id = comp.vendor_id
        JOIN service_booking sb ON vp.booking_id = sb.booking_id
        JOIN services s ON sb.service_id = s.service_id
        WHERE vp.payment_status = 'pending'
        
        UNION ALL
        
        SELECT 
            'contractor' as payout_type,
            cp.payout_id as id,
            cp.contractor_id as provider_id,
            c.company_name as provider_name,
            cp.net_amount,
            cp.payout_date,
            s.serviceName
        FROM contractor_payouts cp
        JOIN contractors c ON cp.contractor_id = c.contractor_id
        JOIN service_booking sb ON cp.booking_id = sb.booking_id
        JOIN services s ON sb.service_id = s.service_id
        WHERE cp.payout_status = 'pending'
        
        ORDER BY payment_date DESC
    `
};

module.exports = paymentGetQueries;
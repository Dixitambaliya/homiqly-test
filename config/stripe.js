// utils/stripe.js
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // store key in .env
module.exports = stripe;

/**
 * Format a currency amount
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: INR)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "INR") => {
  if (amount === null || amount === undefined) {
    return "";
  }

  // Use different locale for CAD to avoid "CA$"
  const locale = currency === "CAD" ? "en-CA" : "en-IN";

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  let formatted = formatter.format(amount);

  // For CAD → replace $ with C$
  if (currency === "CAD") {
    formatted = formatted.replace("$", "C$");
  }

  return formatted;
};

/**
 * Truncate a string if it exceeds a certain length
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength = 50) => {
  if (!str) return "";

  if (str.length <= maxLength) {
    return str;
  }

  return str.substring(0, maxLength) + "...";
};

/**
 * Convert a string to title case
 * @param {string} str - The string to convert
 * @returns {string} Title cased string
 */
export const toTitleCase = (str) => {
  if (!str) return "";

  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Format a phone number to a readable format
 * @param {string} phone - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Format for Indian phone numbers
  if (cleaned.length === 10) {
    return `+91 ${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
  }

  // If it's already formatted with country code
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return `+${cleaned.substring(0, 2)} ${cleaned.substring(
      2,
      7
    )}-${cleaned.substring(7)}`;
  }

  // Return as is if we can't format it
  return phone;
};

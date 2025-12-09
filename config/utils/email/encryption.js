const crypto = require("crypto");

const ALGO = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.RESPONSE_ENCRYPTION_KEY, "hex");
const IV = crypto.randomBytes(16);

const encryptResponse = (data) => {
    const jsonString = JSON.stringify(data);

    const cipher = crypto.createCipheriv(ALGO, Buffer.from(SECRET_KEY), IV);
    let encrypted = cipher.update(jsonString, "utf8", "base64");
    encrypted += cipher.final("base64");

    return {
        iv: IV.toString("base64"),
        payload: encrypted
    };
};

module.exports = {
    encryptResponse
};
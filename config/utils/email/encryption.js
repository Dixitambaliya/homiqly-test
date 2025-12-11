const crypto = require("crypto");

const ALGO = "aes-256-cbc";
const SECRET_KEY = Buffer.from(process.env.RESPONSE_ENCRYPTION_KEY, "hex");

const encryptResponse = (data) => {
    const IV = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(ALGO, SECRET_KEY, IV);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
    encrypted += cipher.final("base64");

    return {
        iv: IV.toString("base64"),
        payload: encrypted
    };
};

const decryptRequest = (payload, iv) => {
    const decipher = crypto.createDecipheriv(
        ALGO,
        SECRET_KEY,
        Buffer.from(iv, "base64")
    );

    let decrypted = decipher.update(payload, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
};

module.exports = {
    encryptResponse,
    decryptRequest
};

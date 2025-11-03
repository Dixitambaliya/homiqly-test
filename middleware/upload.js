const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const admin = require("../config/firebaseConfig");
const bucket = admin.storage().bucket();

// Setup Multer (memory storage)
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
        "image/svg+xml",
        "image/webp",
        "video/mp4"
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type"), false);
    }
};
const upload = multer({ storage, fileFilter });

// Upload file to Firebase
const uploadToFirebase = async (fileBuffer, originalname, folder) => {
    const fileName = `${folder}/${uuidv4()}_${originalname}`;
    const file = bucket.file(fileName);

    await file.save(fileBuffer, {
        metadata: {
            contentType: file.mimetype,
        },
    });

    // Make file publicly accessible
    await file.makePublic();

    return {
        url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
        fileName,
    };
};

// Handle uploads to Firebase
const handleUploads = async (req, res, next) => {
    try {
        const files = req.files || [];
        const folderBase = "vendor_uploads";

        req.uploadedFiles = {};

        // Group files by fieldname manually (because multer.any() gives flat array)
        for (const file of files) {
            const fieldName = file.fieldname;

            if (!req.uploadedFiles[fieldName]) {
                req.uploadedFiles[fieldName] = [];
            }

            let folder = `${folderBase}/misc`;
            if (fieldName === "serviceMedia") folder = `${folderBase}/services`;
            if (fieldName === "resume") folder = `${folderBase}/resume`;
            if (fieldName.startsWith("profileImage")) folder = `${folderBase}/profileImage`;
            if (fieldName === "bookingMedia") folder = `${folderBase}/bookingMedia`;
            if (fieldName === "certificateFiles") folder = `${folderBase}/certificateFiles`;
            if (fieldName === "payoutMedia") folder = `${folderBase}/payoutMedia`;
            if (fieldName === "government_id") folder = `${folderBase}/government_id`;
            if (fieldName === "policeClearance") folder = `${folderBase}/policeClearance`;
            if (fieldName === "CertificateOfExpertise") folder = `${folderBase}/CertificateOfExpertise`;
            if (fieldName === "BusinessLicense") folder = `${folderBase}/BusinessLicense`;

            const uploaded = await uploadToFirebase(file.buffer, file.originalname, folder);
            req.uploadedFiles[fieldName].push(uploaded);
        }

        next();
    } catch (err) {
        console.error("Firebase Upload Error:", err);
        res.status(500).json({ error: "Firebase upload failed", message: err.message });
    }
};


module.exports = {
    upload,
    handleUploads,
};

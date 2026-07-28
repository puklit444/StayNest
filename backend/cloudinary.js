const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// 1. Log into your Cloudinary account using your .env keys
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Set up the storage engine (where to put the files and what types are allowed)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'staynest_listings', // This will create a folder in your Cloudinary account
    allowedFormats: ['jpeg', 'png', 'jpg'],
  },
});

// 3. Create the multer middleware to handle the actual uploading
const upload = multer({ storage: storage });

module.exports = upload;
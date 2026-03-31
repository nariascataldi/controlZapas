const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloudinary_url: process.env.CLOUDINARY_URL
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'controlzapas',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ]
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo JPEG, PNG, WebP y GIF.'), false);
    }
  }
});

async function uploadImage(filePath, options = {}) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'controlzapas',
    transformation: [
      { width: 1200, height: 1200, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    ...options
  });
  return result;
}

async function deleteImage(publicId) {
  const result = await cloudinary.uploader.destroy(publicId);
  return result;
}

async function getImages(folder = 'controlzapas') {
  const result = await cloudinary.api.resources({
    type: 'upload',
    prefix: folder
  });
  return result.resources;
}

function getPublicIdFromUrl(url) {
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  
  const pathParts = parts.slice(uploadIndex + 1);
  let publicId = pathParts.join('/');
  
  publicId = publicId.replace(/^v\d+\//, '');
  publicId = publicId.replace(/\.[^.]+$/, '');
  
  return publicId;
}

module.exports = {
  cloudinary,
  upload,
  uploadImage,
  deleteImage,
  getImages,
  getPublicIdFromUrl
};

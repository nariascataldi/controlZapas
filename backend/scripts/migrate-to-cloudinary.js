require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

console.log('=== Debug ===');
console.log('CLOUDINARY_URL:', process.env.CLOUDINARY_URL ? 'SET' : 'NOT SET');

const parts = process.env.CLOUDINARY_URL?.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
if (parts) {
  console.log('Cloud name:', parts[3]);
  console.log('API Key:', parts[1]);
}

cloudinary.config({
  cloud_name: 'dwphlgsr2',
  api_key: '682292957669389',
  api_secret: 'ljeKS-wl97C-9Po6AWUC74twYcY'
});

console.log('Cloudinary config:', cloudinary.config().cloud_name);

const uploadsDir = path.join(__dirname, '..', 'uploads');

async function migrateImages() {
  const files = fs.readdirSync(uploadsDir).filter(f => 
    !f.startsWith('.') && 
    (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.gif'))
  );
  
  console.log(`\nFound ${files.length} images to migrate\n`);
  
  const results = [];
  
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    console.log(`Migrating: ${file}`);
    
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'controlzapas',
        public_id: file.replace(/\.[^.]+$/, ''),
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      });
      
      console.log(`  ✓ Cloudinary URL: ${result.secure_url}`);
      console.log(`  ✓ Public ID: ${result.public_id}`);
      
      results.push({
        filename: file,
        url: result.secure_url,
        publicId: result.public_id
      });
      
    } catch (err) {
      console.error(`  ✗ Error: ${err.message || err}`);
    }
    
    console.log('');
  }
  
  console.log('\n=== Migration Results ===');
  results.forEach(r => {
    console.log(`${r.filename} -> ${r.url}`);
  });
}

migrateImages();

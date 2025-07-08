const fs = require('fs');
const path = require('path');

// Cloudinary configuration - UPDATE THESE VALUES
const CLOUDINARY_CONFIG = {
  cloudName: "YOUR_CLOUD_NAME",        // Replace with your cloud name
  uploadPreset: "audioguide_upload",   // Replace with your upload preset
  apiKey: "YOUR_API_KEY"              // Optional, for deletion
};

// Audio files to upload
const AUDIO_FILES = [
  { id: "point_1", name: "שער האשפות", category: "tourism" },
  { id: "point_2", name: "סינמה סיטי גלילות", category: "culture" },
  { id: "point_3", name: "ירדנית", category: "religious" },
  { id: "point_4", name: "העיר העתיקה קיסריה", category: "historical" },
  { id: "point_5", name: "סינמה פארק רעננה", category: "culture" },
  { id: "point_6", name: "הר חרמון", category: "nature" }
];

/**
 * Upload audio file to Cloudinary
 */
async function uploadAudioFile(audioFile) {
  try {
    console.log(`☁️ Uploading: ${audioFile.name} (${audioFile.id}.mp3)`);

    const localPath = path.join(__dirname, '../assets/audio', `${audioFile.id}.mp3`);
    
    // Check if file exists
    if (!fs.existsSync(localPath)) {
      console.log(`❌ File not found: ${localPath}`);
      return null;
    }

    // Create form data
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', fs.createReadStream(localPath));
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio
    formData.append('folder', 'audioguide');
    formData.append('public_id', audioFile.id);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/video/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Uploaded: ${result.secure_url}`);
    
    return {
      id: audioFile.id,
      name: audioFile.name,
      category: audioFile.category,
      cloudUrl: result.secure_url,
      publicId: result.public_id
    };

  } catch (error) {
    console.error(`❌ Error uploading ${audioFile.name}:`, error.message);
    return null;
  }
}

/**
 * Upload all audio files
 */
async function uploadAllAudioFiles() {
  console.log('🚀 Starting audio upload to Cloudinary...\n');
  
  // Check configuration
  if (CLOUDINARY_CONFIG.cloudName === "YOUR_CLOUD_NAME") {
    console.error('❌ Please update CLOUDINARY_CONFIG in the script with your credentials');
    console.log('📖 See CDN_SETUP_GUIDE.md for setup instructions');
    return;
  }

  const results = [];
  
  for (const audioFile of AUDIO_FILES) {
    const result = await uploadAudioFile(audioFile);
    if (result) {
      results.push(result);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Save results
  const outputPath = path.join(__dirname, '../src/data/processed/cdn-audio-mapping.json');
  const output = {
    metadata: {
      uploadedAt: new Date().toISOString(),
      totalFiles: AUDIO_FILES.length,
      successfulUploads: results.length,
      cloudinaryConfig: {
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset
      }
    },
    audioFiles: results
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successfully uploaded: ${results.length}/${AUDIO_FILES.length} files`);
  console.log(`📁 Results saved to: ${outputPath}`);
  
  if (results.length > 0) {
    console.log('\n🔗 CDN URLs:');
    results.forEach(result => {
      console.log(`  ${result.id}: ${result.cloudUrl}`);
    });
  }

  return results;
}

/**
 * Generate updated points data with CDN URLs
 */
function generateUpdatedPointsData(uploadResults) {
  console.log('\n🔄 Generating updated points data...');
  
  const pointsDataPath = path.join(__dirname, '../src/data/processed/names-categories-with-descriptions.json');
  const points = JSON.parse(fs.readFileSync(pointsDataPath, 'utf8'));
  
  // Create mapping of uploaded files
  const cdnMapping = {};
  uploadResults.forEach(result => {
    cdnMapping[result.id] = result.cloudUrl;
  });
  
  // Update points with CDN URLs
  const updatedPoints = points.map(point => {
    const cdnUrl = cdnMapping[point.id];
    return {
      ...point,
      audioUrl: cdnUrl || null, // Add CDN URL if available
      audioSource: cdnUrl ? 'cdn' : 'local' // Track audio source
    };
  });
  
  // Save updated data
  const updatedDataPath = path.join(__dirname, '../src/data/processed/points-with-cdn-audio.json');
  fs.writeFileSync(updatedDataPath, JSON.stringify(updatedPoints, null, 2));
  
  console.log(`✅ Updated points data saved to: ${updatedDataPath}`);
  console.log(`📊 Points with CDN audio: ${uploadResults.length}`);
  console.log(`📊 Total points: ${points.length}`);
  
  return updatedPoints;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Upload audio files
    const uploadResults = await uploadAllAudioFiles();
    
    if (uploadResults.length > 0) {
      // Generate updated points data
      generateUpdatedPointsData(uploadResults);
      
      console.log('\n🎉 Upload completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Update your app to use CDN URLs');
      console.log('2. Test audio playback from CDN');
      console.log('3. Monitor Cloudinary usage');
    } else {
      console.log('\n❌ No files were uploaded successfully');
    }
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { uploadAllAudioFiles, uploadAudioFile }; 
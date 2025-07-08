# CDN Audio Setup Guide for AudioGuideApp

## What is a CDN?

A **Content Delivery Network (CDN)** stores your audio files on servers worldwide, making them:
- ⚡ **Faster** - Files load from the nearest server
- 🌍 **Global** - Accessible from anywhere
- 💾 **Scalable** - No device storage limits
- 🔒 **Reliable** - 99.9% uptime

## Step 1: Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up For Free"
3. Create account with email
4. **Free tier includes:**
   - 25GB storage
   - 25GB bandwidth/month
   - Perfect for starting

## Step 2: Get Your Cloudinary Credentials

After signing up, you'll get:

```javascript
// Your Cloudinary Dashboard → Settings → Access Keys
const cloudinaryConfig = {
  cloudName: "your_cloud_name",     // e.g., "myapp123"
  uploadPreset: "your_preset",      // Create this in Settings
  apiKey: "your_api_key"           // Optional, for deletion
};
```

### Create Upload Preset:
1. Go to **Settings** → **Upload**
2. Scroll to **Upload presets**
3. Click **Add upload preset**
4. Set:
   - **Preset name**: `audioguide_upload`
   - **Signing Mode**: `Unsigned`
   - **Folder**: `audioguide`
5. Save

## Step 3: Install Dependencies

```bash
npm install expo-file-system
```

## Step 4: Configure Your App

### Create config file:
```javascript
// src/config/cloudinary.js
export const cloudinaryConfig = {
  cloudName: "your_cloud_name",
  uploadPreset: "audioguide_upload",
  apiKey: "your_api_key" // Optional
};
```

### Initialize service:
```javascript
// src/services/audioService.js
import CloudinaryAudioService from './CloudinaryAudioService';
import { cloudinaryConfig } from '../config/cloudinary';

export const cloudAudioService = new CloudinaryAudioService(cloudinaryConfig);
```

## Step 5: Upload Your Audio Files

### Option A: Upload via Script (Recommended)

```bash
node scripts/upload-audio-to-cdn.js
```

### Option B: Upload via App

```javascript
// In your app
const audioFile = {
  id: "point_1",
  name: "שער האשפות",
  category: "tourism",
  localPath: "assets/audio/point_1.mp3"
};

const cloudUrl = await cloudAudioService.uploadAudioFile(audioFile);
console.log("Audio uploaded:", cloudUrl);
```

## Step 6: Play Audio from CDN

```javascript
// Play audio from CDN URL
const success = await cloudAudioService.playAudioFromUrl(cloudUrl);

// Or generate URL and play
const url = cloudAudioService.generateAudioUrl("point_1");
await cloudAudioService.playAudioFromUrl(url);
```

## Step 7: Update Your Data

After uploading, update your points data with CDN URLs:

```javascript
// Update points with CDN URLs
const updatedPoints = points.map(point => ({
  ...point,
  audioUrl: cloudAudioService.generateAudioUrl(point.id)
}));
```

## Benefits of CDN Audio:

### ✅ **Advantages:**
- **No device storage** - Files stream from cloud
- **Faster loading** - CDN optimization
- **Global access** - Works everywhere
- **Automatic scaling** - Handles any number of users
- **Backup** - Files safe in cloud

### ⚠️ **Considerations:**
- **Internet required** - No offline playback
- **Bandwidth usage** - Data consumption
- **Cost** - Free tier limits
- **Latency** - Initial load time

## Cost Estimation:

### Cloudinary Free Tier:
- **Storage**: 25GB (≈ 500 hours of audio)
- **Bandwidth**: 25GB/month (≈ 500 hours of streaming)
- **Perfect for**: Small to medium apps

### Paid Plans:
- **Plus**: $89/month - 225GB storage, 225GB bandwidth
- **Advanced**: $224/month - 675GB storage, 675GB bandwidth

## Alternative CDN Options:

### 1. **AWS S3 + CloudFront**
- More complex setup
- Very scalable
- Pay-as-you-go

### 2. **Firebase Storage**
- Google's solution
- Good free tier
- Easy React Native integration

### 3. **Azure Blob Storage**
- Microsoft's solution
- Good for enterprise

## Testing Your Setup:

```javascript
// Test script
const testAudio = {
  id: "test_audio",
  name: "Test Audio",
  category: "test",
  localPath: "assets/audio/point_1.mp3"
};

// Upload test
const url = await cloudAudioService.uploadAudioFile(testAudio);
console.log("Upload successful:", url);

// Play test
const played = await cloudAudioService.playAudioFromUrl(url);
console.log("Playback successful:", played);
```

## Next Steps:

1. **Upload existing audio files**
2. **Update app to use CDN URLs**
3. **Test playback from different locations**
4. **Monitor usage and costs**
5. **Implement caching for offline support**

## Support:

- **Cloudinary Docs**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **React Native Audio**: [expo.dev/versions/latest/sdk/av](https://expo.dev/versions/latest/sdk/av)
- **File Upload**: [expo.dev/versions/latest/sdk/file-system](https://expo.dev/versions/latest/sdk/file-system) 
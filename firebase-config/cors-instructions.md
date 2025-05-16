# Firebase Storage CORS Setup Instructions

To fix the CORS error with Firebase Storage, follow these steps:

## Prerequisites
1. Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install
2. Make sure `gsutil` is available in your PATH

## Steps to Configure CORS

1. **Login to Google Cloud:**
   ```
   gcloud auth login
   ```

2. **Set your project:**
   ```
   gcloud config set project noteskeeping-30144
   ```

3. **Apply CORS configuration using gsutil:**
   ```
   gsutil cors set firebase-config/cors.json gs://noteskeeping-30144.firebasestorage.app
   ```

4. **Verify the CORS settings:**
   ```
   gsutil cors get gs://noteskeeping-30144.firebasestorage.app
   ```

## Immediate Workaround in Code

While waiting for CORS configuration to propagate, use one of these approaches:

1. **Use the FirebaseImage component:**
   Import and use the `FirebaseImage` component in your React Native app for any Firebase Storage images.

   ```jsx
   import FirebaseImage from '../components/FirebaseImage';
   
   // In your render method:
   <FirebaseImage 
     path="profiles/S2D6zlMsHrT5Gblkyijf3WT0aRe2/1747338795837.jpg" 
     style={styles.profileImage} 
   />
   ```

2. **Use the getFileUrl method:**
   For direct URL access, use the `getFileUrl` method from FirebaseService:

   ```jsx
   import { firebaseService } from '../services/FirebaseService';
   
   // In an async function:
   const imageUrl = await firebaseService.getFileUrl('profiles/S2D6zlMsHrT5Gblkyijf3WT0aRe2/1747338795837.jpg');
   ```

These code solutions will add cache-busting parameters to prevent CORS issues, even before the server-side CORS configuration is applied. 
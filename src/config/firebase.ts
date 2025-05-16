import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDBrruLHVVpao5uIeZYmDXkTKgcusGigv8",
  authDomain: "noteskeeping-30144.firebaseapp.com",
  projectId: "noteskeeping-30144",
  storageBucket: "noteskeeping-30144.firebasestorage.app",
  messagingSenderId: "306645366653",
  appId: "1:306645366653:android:1ba75d8749f4142a2ffe14",
  databaseURL: "https://noteskeeping-30144-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const firebaseAuth = getAuth(firebaseApp);

// Enable persistent authentication
setPersistence(firebaseAuth, browserLocalPersistence)
  .then(() => {
    console.log('Firebase auth persistence enabled');
  })
  .catch((error) => {
    console.error('Error enabling auth persistence:', error);
  });

const firestoreDB = getFirestore(firebaseApp);
const firebaseStorage = getStorage(firebaseApp);

// Export Firebase modules
export {
  firebaseApp,
  firebaseAuth,
  firestoreDB,
  firebaseStorage
};

export default firebaseApp; 
import { firestoreDB, firebaseStorage, firebaseAuth } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes, UploadResult } from 'firebase/storage';
import { Note } from '../../App';
import { onAuthStateChanged } from 'firebase/auth';

// Collection names
const NOTES_COLLECTION = 'notes';
const PRIVATE_NOTES_COLLECTION = 'privateNotes';
const USERS_COLLECTION = 'users';

// Firebase project constants
const PROJECT_ID = 'noteskeeping-30144';
const DATABASE_NAME = 'notesdb'; // Using the correct database name

class FirebaseService {
  // User related methods
  getCurrentUser = () => {
    return firebaseAuth.currentUser;
  };

  isUserSignedIn = () => {
    return !!firebaseAuth.currentUser;
  };

  // REST API methods (non-streaming)
  storeDataViaREST = async (collectionId: string, data: any, documentId?: string): Promise<boolean> => {
    try {
      // Generate the Firestore REST endpoint URL
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_NAME}/documents/${collectionId}`;
      
      // If document ID is provided, append it to the URL for a specific document
      if (documentId) {
        url += `/${documentId}`;
      }
      
      // Transform data into Firestore REST API format
      const documentData = {
        fields: {}
      };
      
      // Convert JS objects to Firestore field types
      for (const key in data) {
        if (data[key] === undefined || data[key] === null) {
          documentData.fields[key] = { nullValue: null };
        } else if (typeof data[key] === 'string') {
          documentData.fields[key] = { stringValue: data[key] };
        } else if (typeof data[key] === 'number') {
          documentData.fields[key] = { doubleValue: data[key] };
        } else if (typeof data[key] === 'boolean') {
          documentData.fields[key] = { booleanValue: data[key] };
        } else if (data[key] instanceof Date) {
          documentData.fields[key] = { timestampValue: data[key].toISOString() };
        } else if (Array.isArray(data[key])) {
          documentData.fields[key] = { 
            arrayValue: { 
              values: data[key].map(item => this.convertToFirestoreValue(item)) 
            } 
          };
        } else if (typeof data[key] === 'object') {
          documentData.fields[key] = { 
            mapValue: { 
              fields: this.convertObjectToFirestoreFields(data[key]) 
            } 
          };
        }
      }
      
      // Add timestamp using the server time for consistency
      if (!data.createdAt) {
        documentData.fields['createdAt'] = { timestampValue: new Date().toISOString() };
      }
      
      // Get Firebase auth token for authenticated requests
      const user = this.getCurrentUser();
      let idToken = '';
      
      if (user) {
        try {
          idToken = await user.getIdToken();
        } catch (error) {
          console.log('Error getting ID token:', error);
        }
      }
      
      // Set request method based on whether we're updating or creating
      const method = documentId ? 'PATCH' : 'POST';
      
      // Make the REST API request
      const requestOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify(documentData)
      };
      
      // Use fetch API to make the request
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Firestore REST API error:', errorData);
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Error using Firestore REST API:', error);
      return false;
    }
  };
  
  // Helper to convert a single value to Firestore format
  private convertToFirestoreValue = (value: any) => {
    if (value === null || value === undefined) {
      return { nullValue: null };
    } else if (typeof value === 'string') {
      return { stringValue: value };
    } else if (typeof value === 'number') {
      return { doubleValue: value };
    } else if (typeof value === 'boolean') {
      return { booleanValue: value };
    } else if (value instanceof Date) {
      return { timestampValue: value.toISOString() };
    } else if (Array.isArray(value)) {
      return { 
        arrayValue: { 
          values: value.map(item => this.convertToFirestoreValue(item)) 
        } 
      };
    } else if (typeof value === 'object') {
      return { 
        mapValue: { 
          fields: this.convertObjectToFirestoreFields(value) 
        } 
      };
    }
    
    // Default fallback
    return { stringValue: String(value) };
  };
  
  // Helper to convert object to Firestore fields format
  private convertObjectToFirestoreFields = (obj: any) => {
    const fields: any = {};
    
    for (const key in obj) {
      fields[key] = this.convertToFirestoreValue(obj[key]);
    }
    
    return fields;
  };
  
  // User-specific methods using REST
  storeUserData = async (userId: string, userData: any): Promise<boolean> => {
    try {
      // Add userId to the data
      const dataWithUserId = {
        userId,
        ...userData,
        createdAt: new Date()
      };
      
      return await this.storeDataViaREST(USERS_COLLECTION, dataWithUserId);
    } catch (error) {
      console.log('Error storing user data:', error);
      return false;
    }
  };

  // Storage methods
  uploadFile = async (uri: string, fileName: string, folderPath: string): Promise<string> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) throw new Error('User not authenticated');

      // Create a storage reference with a unique path
      const storagePath = `${folderPath}/${userId}/${fileName}`;
      const storageRef = ref(firebaseStorage, storagePath);
      
      // Fetch the file
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const uploadResult: UploadResult = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  getFileUrl = async (path: string): Promise<string> => {
    try {
      const storageRef = ref(firebaseStorage, path);
      const url = await getDownloadURL(storageRef);
      
      // Add a cache control parameter to help with CORS
      return `${url}&alt=media&token=${Date.now()}`;
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  };

  // Notes methods
  getNotes = async (): Promise<Note[]> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      
      // If not signed in, return empty array
      if (!userId) return [];

      const notesRef = collection(firestoreDB, NOTES_COLLECTION);
      const q = query(
        notesRef,
        where('userId', '==', userId),
        where('isPrivate', '==', false),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Note, 'id'>
      }));
    } catch (error) {
      console.error('Error getting notes:', error);
      return []; // Return empty array instead of throwing to improve app stability
    }
  };

  getPrivateNotes = async (): Promise<Note[]> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      
      // If not signed in, return empty array
      if (!userId) return [];

      const privateNotesRef = collection(firestoreDB, PRIVATE_NOTES_COLLECTION);
      const q = query(
        privateNotesRef,
        where('userId', '==', userId),
        where('isPrivate', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Note, 'id'>
      }));
    } catch (error) {
      console.error('Error getting private notes:', error);
      return []; // Return empty array instead of throwing to improve app stability
    }
  };

  addNote = async (note: Note): Promise<Note> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      
      // If not signed in, throw error
      if (!userId) throw new Error('User not authenticated');

      const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
      const colRef = collection(firestoreDB, collectionName);
      
      const noteData = {
        ...note,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(colRef, noteData);
      
      return {
        ...note,
        id: docRef.id
      };
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  };

  updateNote = async (note: Note): Promise<Note> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      
      // If not signed in, throw error
      if (!userId) throw new Error('User not authenticated');

      const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
      const docRef = doc(firestoreDB, collectionName, note.id);
      
      await updateDoc(docRef, {
        ...note,
        updatedAt: serverTimestamp()
      });
      
      return note;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  deleteNote = async (noteId: string, isPrivate: boolean): Promise<void> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      
      // If not signed in, throw error
      if (!userId) throw new Error('User not authenticated');

      const collectionName = isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
      const docRef = doc(firestoreDB, collectionName, noteId);
      
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  // Batch operations for sync
  batchSyncNotes = async (notes: Note[]): Promise<void> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) throw new Error('User not authenticated');

      const batch = writeBatch(firestoreDB);
      
      for (const note of notes) {
        const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
        const docRef = doc(firestoreDB, collectionName, note.id);
        
        batch.set(docRef, {
          ...note,
          userId,
          updatedAt: serverTimestamp()
        });
      }
      
      await batch.commit();
    } catch (error) {
      console.error('Error batch syncing notes:', error);
      throw error;
    }
  };
}

// Export singleton instance
export const firebaseService = new FirebaseService();

export default FirebaseService; 
import { firebaseAuth } from '../config/firebase';
import { Note } from '../../App';

// Firebase project constants
const PROJECT_ID = 'noteskeeping-30144';
const DATABASE_NAME = 'notesdb';

// Collection names
const NOTES_COLLECTION = 'notes';
const PRIVATE_NOTES_COLLECTION = 'privateNotes';
const USERS_COLLECTION = 'users';

/**
 * FirestoreRESTService: Handles all Firestore operations via REST API
 * to avoid streaming connections
 */
class FirestoreRESTService {
  // Helper function to get the current Firebase user
  getCurrentUser = () => {
    return firebaseAuth.currentUser;
  };

  // Helper to get Firebase auth token
  private getAuthToken = async (): Promise<string> => {
    try {
      const user = this.getCurrentUser();
      if (user) {
        return await user.getIdToken();
      }
    } catch (error) {
      console.log('Error getting auth token:', error);
    }
    return '';
  };

  // Convert JS value to Firestore value format
  private convertToFirestoreValue = (value: any): any => {
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
  
  // Convert object to Firestore fields format
  private convertObjectToFirestoreFields = (obj: any): any => {
    const fields: any = {};
    
    for (const key in obj) {
      if (obj[key] !== undefined) {
        fields[key] = this.convertToFirestoreValue(obj[key]);
      }
    }
    
    return fields;
  };

  // Convert Firestore document to JS object
  private convertFirestoreDocToObject = (doc: any): any => {
    if (!doc || !doc.fields) return null;
    
    const result: any = { id: doc.name.split('/').pop() };
    
    for (const key in doc.fields) {
      result[key] = this.extractValueFromFirestoreField(doc.fields[key]);
    }
    
    return result;
  };
  
  // Extract value from Firestore field based on type
  private extractValueFromFirestoreField = (field: any): any => {
    if (field.nullValue !== undefined) return null;
    if (field.stringValue !== undefined) return field.stringValue;
    if (field.doubleValue !== undefined) return field.doubleValue;
    if (field.integerValue !== undefined) return Number(field.integerValue);
    if (field.booleanValue !== undefined) return field.booleanValue;
    if (field.timestampValue !== undefined) return new Date(field.timestampValue);
    if (field.arrayValue !== undefined) {
      return field.arrayValue.values 
        ? field.arrayValue.values.map((v: any) => this.extractValueFromFirestoreField(v))
        : [];
    }
    if (field.mapValue !== undefined) {
      const obj: any = {};
      const fields = field.mapValue.fields || {};
      
      for (const key in fields) {
        obj[key] = this.extractValueFromFirestoreField(fields[key]);
      }
      
      return obj;
    }
    
    return null;
  };

  // Base method to store data via REST
  storeDataViaREST = async (collectionId: string, data: any, documentId?: string): Promise<{success: boolean, id?: string}> => {
    try {
      // Generate the Firestore REST endpoint URL
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_NAME}/documents/${collectionId}`;
      
      // If document ID is provided, append it to URL for update
      if (documentId) {
        url += `/${documentId}`;
      }
      
      // Transform data into Firestore REST API format
      const documentData = {
        fields: {}
      };
      
      // Add all fields
      for (const key in data) {
        if (data[key] !== undefined) {
          documentData.fields[key] = this.convertToFirestoreValue(data[key]);
        }
      }
      
      // Add timestamp if not provided
      if (!data.createdAt) {
        documentData.fields['createdAt'] = { timestampValue: new Date().toISOString() };
      }
      
      // Get Firebase auth token
      const idToken = await this.getAuthToken();
      
      // Set method based on operation
      const method = documentId ? 'PATCH' : 'POST';
      
      // Make REST API request
      const requestOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        },
        body: JSON.stringify(documentData)
      };
      
      console.log('Sending to Firestore:', JSON.stringify(documentData, null, 2));
      
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        console.log('Firestore REST API error:', await response.json());
        return { success: false };
      }
      
      const responseData = await response.json();
      const newId = responseData.name?.split('/').pop();
      
      return { 
        success: true,
        id: newId
      };
    } catch (error) {
      console.log('Error using Firestore REST API:', error);
      return { success: false };
    }
  };

  // Fetch documents from collection
  fetchCollectionViaREST = async (collectionId: string, filters?: any): Promise<any[]> => {
    try {
      const userId = this.getCurrentUser()?.uid;
      if (!userId) return [];
      
      // Base URL
      let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_NAME}/documents/${collectionId}`;
      
      // Add auth token
      const idToken = await this.getAuthToken();
      
      // Make request
      const response = await fetch(url, {
        headers: {
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        }
      });
      
      if (!response.ok) {
        console.log('Firestore REST API fetch error:', response.status);
        return [];
      }
      
      const data = await response.json();
      
      if (!data.documents) {
        return [];
      }
      
      // Convert documents to objects and apply any filters
      let results = data.documents.map((doc: any) => this.convertFirestoreDocToObject(doc));
      
      // Filter by userId (we need to do client-side filtering)
      results = results.filter((doc: any) => doc.userId === userId);
      
      // Apply additional filters if provided
      if (filters) {
        for (const key in filters) {
          results = results.filter((doc: any) => doc[key] === filters[key]);
        }
      }
      
      return results;
    } catch (error) {
      console.log('Error fetching via Firestore REST API:', error);
      return [];
    }
  };

  // Delete document via REST
  deleteDocumentViaREST = async (collectionId: string, documentId: string): Promise<boolean> => {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_NAME}/documents/${collectionId}/${documentId}`;
      
      const idToken = await this.getAuthToken();
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': idToken ? `Bearer ${idToken}` : ''
        }
      });
      
      return response.ok;
    } catch (error) {
      console.log('Error deleting via Firestore REST API:', error);
      return false;
    }
  };

  // Note specific methods
  getNotes = async (): Promise<Note[]> => {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) return [];
    
    const notes = await this.fetchCollectionViaREST(NOTES_COLLECTION);
    
    // Filter by user and privacy
    return notes.filter((note: any) => 
      note.userId === userId && 
      note.isPrivate === false
    ) as Note[];
  };
  
  getPrivateNotes = async (): Promise<Note[]> => {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) return [];
    
    const notes = await this.fetchCollectionViaREST(PRIVATE_NOTES_COLLECTION);
    
    // Filter by user and privacy
    return notes.filter((note: any) => 
      note.userId === userId && 
      note.isPrivate === true
    ) as Note[];
  };
  
  addNote = async (note: Note): Promise<Note> => {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
    
    const noteData = {
      ...note,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await this.storeDataViaREST(collectionName, noteData);
    
    if (!result.success || !result.id) {
      throw new Error('Failed to save note');
    }
    
    return {
      ...note,
      id: result.id
    };
  };
  
  updateNote = async (note: Note): Promise<Note> => {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
    
    const noteData = {
      ...note,
      updatedAt: new Date().toISOString()
    };
    
    const result = await this.storeDataViaREST(collectionName, noteData, note.id);
    
    if (!result.success) {
      throw new Error('Failed to update note');
    }
    
    return note;
  };
  
  deleteNote = async (noteId: string, isPrivate: boolean): Promise<void> => {
    const userId = this.getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');
    
    const collectionName = isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
    
    const success = await this.deleteDocumentViaREST(collectionName, noteId);
    
    if (!success) {
      throw new Error('Failed to delete note');
    }
  };
  
  // User data
  storeUserData = async (userId: string, userData: any): Promise<boolean> => {
    const dataWithUserId = {
      userId,
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    const result = await this.storeDataViaREST(USERS_COLLECTION, dataWithUserId);
    return result.success;
  };

  // Sync multiple notes at once
  batchSyncNotes = async (notes: Note[]): Promise<void> => {
    try {
      if (!notes || notes.length === 0) return;
      
      // Process notes in chunks to avoid request size limits
      const chunkSize = 10;
      const chunks = [];
      
      for (let i = 0; i < notes.length; i += chunkSize) {
        chunks.push(notes.slice(i, i + chunkSize));
      }
      
      // Process each chunk
      for (const chunk of chunks) {
        const promises = chunk.map(note => {
          const collectionName = note.isPrivate ? PRIVATE_NOTES_COLLECTION : NOTES_COLLECTION;
          return this.storeDataViaREST(collectionName, {
            ...note,
            userId: this.getCurrentUser()?.uid,
            updatedAt: new Date().toISOString()
          }, note.id);
        });
        
        // Wait for all in the chunk to complete before processing the next chunk
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('Error in batch sync:', error);
      throw error;
    }
  };
}

// Export singleton instance
export const firestoreRESTService = new FirestoreRESTService();

export default FirestoreRESTService; 
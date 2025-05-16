import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storageAdapter } from '../utils/storageAdapter';
import { Note } from '../../App';
import { firebaseService } from '../services/FirebaseService';
import { firestoreRESTService } from '../services/FirestoreRESTService';
import { firebaseAuth } from '../config/firebase';

// Define the context shape
interface NotesContextType {
  notes: Note[];
  privateNotes: Note[];
  addNote: (note: Note) => Promise<void>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  loadingNotes: boolean;
  setLoadingNotes: (loading: boolean) => void;
  syncWithCloud: boolean;
  setSyncWithCloud: (value: boolean) => void;
  isUserSignedIn: boolean;
}

// Create context with default values
const NotesContext = createContext<NotesContextType>({
  notes: [],
  privateNotes: [],
  addNote: async () => {},
  updateNote: async () => {},
  deleteNote: async () => {},
  refreshNotes: async () => {},
  loadingNotes: true,
  setLoadingNotes: () => {},
  syncWithCloud: true,
  setSyncWithCloud: () => {},
  isUserSignedIn: false,
});

// Fix TypeScript issues by casting components
const ContextProvider = NotesContext.Provider as any;

// Context provider props
interface NotesProviderProps {
  children: ReactNode;
}

// Storage keys
const NOTES_KEY = 'noteskeeping_notes';
const PRIVATE_NOTES_KEY = 'noteskeeping_private_notes';
const SYNC_KEY = 'noteskeeping_sync_enabled';

// Context provider component
export const NotesProvider = ({ children }: NotesProviderProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [privateNotes, setPrivateNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [syncWithCloud, setSyncWithCloudState] = useState(true);
  const [isUserSignedIn, setIsUserSignedIn] = useState(false);
  
  // Initialize notes data
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoadingNotes(true);
        
        // Check if cloud sync is enabled (but default to true if not set)
        const syncEnabled = await storageAdapter.getItem(SYNC_KEY);
        const shouldSync = syncEnabled !== 'false'; // Default to true if not explicitly set to false
        setSyncWithCloudState(shouldSync);
        
        // Check if user is signed in
        const userSignedIn = !!firebaseAuth.currentUser;
        setIsUserSignedIn(userSignedIn);
        
        // If sync is enabled and user is signed in, load from Firebase
        if (shouldSync && userSignedIn) {
          try {
            // Use the REST service instead of the streaming service
            const firebaseNotes = await firestoreRESTService.getNotes();
            const firebasePrivateNotes = await firestoreRESTService.getPrivateNotes();
            
            setNotes(firebaseNotes);
            setPrivateNotes(firebasePrivateNotes);
            
            // Also update local cache
            await storageAdapter.setItem(NOTES_KEY, JSON.stringify(firebaseNotes));
            await storageAdapter.setItem(PRIVATE_NOTES_KEY, JSON.stringify(firebasePrivateNotes));
            
            setLoadingNotes(false);
            return; // Exit early if Firebase load was successful
          } catch (firebaseError) {
            console.error('Error loading from Firebase, falling back to local storage:', firebaseError);
            // Continue to local storage fallback
          }
        }
        
        // Fallback to local storage if Firebase failed or not available
        const savedNotes = await storageAdapter.getItem(NOTES_KEY);
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        } else {
          // Initialize with empty array
          setNotes([]);
          await storageAdapter.setItem(NOTES_KEY, JSON.stringify([]));
        }

        const savedPrivateNotes = await storageAdapter.getItem(PRIVATE_NOTES_KEY);
        if (savedPrivateNotes) {
          setPrivateNotes(JSON.parse(savedPrivateNotes));
        } else {
          // Initialize with empty array
          setPrivateNotes([]);
          await storageAdapter.setItem(PRIVATE_NOTES_KEY, JSON.stringify([]));
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoadingNotes(false);
      }
    };

    loadNotes();
  }, []);

  // Manual refresh function to fetch latest notes
  const refreshNotes = async () => {
    if (!syncWithCloud || !isUserSignedIn) return;
    
    try {
      setLoadingNotes(true);
      // Use REST service
      const firebaseNotes = await firestoreRESTService.getNotes();
      const firebasePrivateNotes = await firestoreRESTService.getPrivateNotes();
      
      setNotes(firebaseNotes);
      setPrivateNotes(firebasePrivateNotes);
      
      // Update local cache
      await storageAdapter.setItem(NOTES_KEY, JSON.stringify(firebaseNotes));
      await storageAdapter.setItem(PRIVATE_NOTES_KEY, JSON.stringify(firebasePrivateNotes));
    } catch (error) {
      console.error('Error refreshing notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Save notes to storage
  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      await storageAdapter.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  // Save private notes to storage
  const savePrivateNotes = async (updatedNotes: Note[]) => {
    try {
      await storageAdapter.setItem(PRIVATE_NOTES_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error saving private notes:', error);
      throw error;
    }
  };
  
  // Toggle cloud sync
  const handleSyncWithCloud = async (value: boolean) => {
    try {
      setSyncWithCloudState(value);
      await storageAdapter.setItem(SYNC_KEY, value ? 'true' : 'false');
      
      // When enabling sync, push current notes to cloud if signed in
      if (value && isUserSignedIn) {
        // Push all notes to Firebase using batch operation for better performance
        try {
          // Batch sync regular notes
          if (notes.length > 0) {
            await firestoreRESTService.batchSyncNotes(notes);
          }
          
          // Batch sync private notes
          if (privateNotes.length > 0) {
            await firestoreRESTService.batchSyncNotes(privateNotes);
          }
          
          // Refresh notes after syncing
          await refreshNotes();
        } catch (error) {
          console.error('Error syncing notes to cloud:', error);
          // Continue even if sync fails - local notes are still available
        }
      }
    } catch (error) {
      console.error('Error toggling sync:', error);
      // Don't throw, just log the error to prevent app crashes
    }
  };

  // Add a new note
  const addNote = async (note: Note) => {
    try {
      if (syncWithCloud && isUserSignedIn) {
        // Add to Firebase using REST service
        const savedNote = await firestoreRESTService.addNote(note);
        
        if (note.isPrivate) {
          setPrivateNotes(prevNotes => [savedNote, ...prevNotes]);
        } else {
          setNotes(prevNotes => [savedNote, ...prevNotes]);
        }
        
        // Update local cache as well
        if (note.isPrivate) {
          savePrivateNotes([savedNote, ...privateNotes]);
        } else {
          saveNotes([savedNote, ...notes]);
        }
      } else {
        // Add to local storage only as fallback
        if (note.isPrivate) {
          const updatedPrivateNotes = [note, ...privateNotes];
          setPrivateNotes(updatedPrivateNotes);
          await savePrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = [note, ...notes];
          setNotes(updatedNotes);
          await saveNotes(updatedNotes);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
      
      // Fallback to local storage if Firebase fails
      if (note.isPrivate) {
        const updatedPrivateNotes = [note, ...privateNotes];
        setPrivateNotes(updatedPrivateNotes);
        await savePrivateNotes(updatedPrivateNotes);
      } else {
        const updatedNotes = [note, ...notes];
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
      
      throw error;
    }
  };

  // Update an existing note
  const updateNote = async (updatedNote: Note) => {
    try {
      if (syncWithCloud && isUserSignedIn) {
        // Update in Firebase using REST service
        await firestoreRESTService.updateNote(updatedNote);
        
        // Also update local state and cache
        if (updatedNote.isPrivate) {
          const updatedPrivateNotes = privateNotes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setPrivateNotes(updatedPrivateNotes);
          await savePrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = notes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setNotes(updatedNotes);
          await saveNotes(updatedNotes);
        }
      } else {
        // Update local storage only as fallback
        if (updatedNote.isPrivate) {
          const updatedPrivateNotes = privateNotes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setPrivateNotes(updatedPrivateNotes);
          await savePrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = notes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setNotes(updatedNotes);
          await saveNotes(updatedNotes);
        }
      }
    } catch (error) {
      console.error('Error updating note:', error);
      
      // Fallback to local storage if Firebase fails
      if (updatedNote.isPrivate) {
        const updatedPrivateNotes = privateNotes.map(note => 
          note.id === updatedNote.id ? updatedNote : note
        );
        setPrivateNotes(updatedPrivateNotes);
        await savePrivateNotes(updatedPrivateNotes);
      } else {
        const updatedNotes = notes.map(note => 
          note.id === updatedNote.id ? updatedNote : note
        );
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
      
      throw error;
    }
  };

  // Delete a note
  const deleteNote = async (id: string) => {
    try {
      // Find the note to determine if it's private
      const noteToDelete = [...notes, ...privateNotes].find(note => note.id === id);
      
      if (!noteToDelete) {
        throw new Error('Note not found');
      }
      
      if (syncWithCloud && isUserSignedIn) {
        // Delete from Firebase using REST service
        await firestoreRESTService.deleteNote(id, noteToDelete.isPrivate);
      }
      
      // Always update local state and storage too
      if (noteToDelete.isPrivate) {
        const updatedPrivateNotes = privateNotes.filter(note => note.id !== id);
        setPrivateNotes(updatedPrivateNotes);
        await savePrivateNotes(updatedPrivateNotes);
      } else {
        const updatedNotes = notes.filter(note => note.id !== id);
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      
      // Continue with local deletion even if Firebase delete fails
      // Find the note again in the catch block to avoid reference errors
      const noteToDeleteFallback = [...notes, ...privateNotes].find(note => note.id === id);
      
      if (noteToDeleteFallback && noteToDeleteFallback.isPrivate) {
        const updatedPrivateNotes = privateNotes.filter(note => note.id !== id);
        setPrivateNotes(updatedPrivateNotes);
        await savePrivateNotes(updatedPrivateNotes);
      } else if (noteToDeleteFallback) {
        const updatedNotes = notes.filter(note => note.id !== id);
        setNotes(updatedNotes);
        await saveNotes(updatedNotes);
      }
      
      throw error;
    }
  };

  // Context value
  const contextValue: NotesContextType = {
    notes,
    privateNotes,
    addNote,
    updateNote,
    deleteNote,
    refreshNotes,
    loadingNotes,
    setLoadingNotes,
    syncWithCloud,
    setSyncWithCloud: handleSyncWithCloud,
    isUserSignedIn,
  };
  
  return (
    <ContextProvider value={contextValue}>
      {children}
    </ContextProvider>
  );
};

// Hook for using the NotesContext
export const useNotesContext = () => useContext(NotesContext);

export default NotesContext; 
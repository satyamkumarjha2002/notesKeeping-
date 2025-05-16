import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Note } from '../../App';
import { firebaseService } from '../services/FirebaseService';
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
  syncWithCloud: false,
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

// Sample initial notes for demonstration
const initialNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to NotesKeeping',
    content: 'This is your first note. Tap to edit or add more content...',
    timestamp: 'Today, 10:30 AM',
    category: 'General',
    isPrivate: false,
  },
  {
    id: '2',
    title: 'Shopping List',
    content: '1. Milk\n2. Eggs\n3. Bread\n4. Fruits',
    timestamp: 'Yesterday, 4:15 PM',
    category: 'Lists',
    isPrivate: false,
  },
  {
    id: '3',
    title: 'Project Ideas',
    content: 'App concepts:\n- Fitness tracker\n- Recipe manager\n- Language learning tool',
    timestamp: 'May 15, 2:45 PM',
    category: 'Work',
    isPrivate: false,
  },
];

// Sample initial private notes
const initialPrivateNotes: Note[] = [
  {
    id: '4',
    title: 'Private Notes',
    content: 'This section is password protected for your sensitive information.',
    timestamp: 'Just now',
    category: 'Private',
    isPrivate: true,
  },
];

// Context provider component
export const NotesProvider = ({ children }: NotesProviderProps) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [privateNotes, setPrivateNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [syncWithCloud, setSyncWithCloudState] = useState(false);
  const [isUserSignedIn, setIsUserSignedIn] = useState(false);
  
  // Initialize notes data
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setLoadingNotes(true);
        
        // Check if cloud sync is enabled
        const syncEnabled = await SecureStore.getItemAsync(SYNC_KEY);
        const shouldSync = syncEnabled === 'true';
        setSyncWithCloudState(shouldSync);
        
        // Check if user is signed in
        const userSignedIn = !!firebaseAuth.currentUser;
        setIsUserSignedIn(userSignedIn);
        
        // If sync is enabled and user is signed in, load from Firebase
        if (shouldSync && userSignedIn) {
          const firebaseNotes = await firebaseService.getNotes();
          const firebasePrivateNotes = await firebaseService.getPrivateNotes();
          
          setNotes(firebaseNotes);
          setPrivateNotes(firebasePrivateNotes);
        } else {
          // Otherwise, load from local storage
          const savedNotes = await SecureStore.getItemAsync(NOTES_KEY);
          if (savedNotes) {
            setNotes(JSON.parse(savedNotes));
          } else {
            // Use initial notes for first-time users
            setNotes(initialNotes);
            await SecureStore.setItemAsync(NOTES_KEY, JSON.stringify(initialNotes));
          }

          const savedPrivateNotes = await SecureStore.getItemAsync(PRIVATE_NOTES_KEY);
          if (savedPrivateNotes) {
            setPrivateNotes(JSON.parse(savedPrivateNotes));
          } else {
            // Use initial private notes for first-time users
            setPrivateNotes(initialPrivateNotes);
            await SecureStore.setItemAsync(PRIVATE_NOTES_KEY, JSON.stringify(initialPrivateNotes));
          }
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
      const firebaseNotes = await firebaseService.getNotes();
      const firebasePrivateNotes = await firebaseService.getPrivateNotes();
      
      setNotes(firebaseNotes);
      setPrivateNotes(firebasePrivateNotes);
    } catch (error) {
      console.error('Error refreshing notes:', error);
    } finally {
      setLoadingNotes(false);
    }
  };

  // Save notes to secure storage
  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      await SecureStore.setItemAsync(NOTES_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  // Save private notes to secure storage
  const savePrivateNotes = async (updatedNotes: Note[]) => {
    try {
      await SecureStore.setItemAsync(PRIVATE_NOTES_KEY, JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error saving private notes:', error);
      throw error;
    }
  };
  
  // Toggle cloud sync
  const handleSyncWithCloud = async (value: boolean) => {
    try {
      setSyncWithCloudState(value);
      await SecureStore.setItemAsync(SYNC_KEY, value ? 'true' : 'false');
      
      // When enabling sync, push current notes to cloud if signed in
      if (value && isUserSignedIn) {
        // Push all notes to Firebase using batch operation for better performance
        try {
          // Batch sync regular notes
          if (notes.length > 0) {
            await firebaseService.batchSyncNotes(notes);
          }
          
          // Batch sync private notes
          if (privateNotes.length > 0) {
            await firebaseService.batchSyncNotes(privateNotes);
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
        // Add to Firebase
        const savedNote = await firebaseService.addNote(note);
        
        if (note.isPrivate) {
          setPrivateNotes(prevNotes => [savedNote, ...prevNotes]);
        } else {
          setNotes(prevNotes => [savedNote, ...prevNotes]);
        }
      } else {
        // Add to local storage
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
      throw error;
    }
  };

  // Update an existing note
  const updateNote = async (updatedNote: Note) => {
    try {
      if (syncWithCloud && isUserSignedIn) {
        // Update in Firebase
        await firebaseService.updateNote(updatedNote);
        
        // Also update in local state to keep UI in sync
        if (updatedNote.isPrivate) {
          const updatedPrivateNotes = privateNotes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setPrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = notes.map(note => 
            note.id === updatedNote.id ? updatedNote : note
          );
          setNotes(updatedNotes);
        }
      } else {
        // Update in local storage
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
      throw error;
    }
  };

  // Delete a note
  const deleteNote = async (id: string) => {
    try {
      // Find the note to determine if it's private
      const regularNote = notes.find(note => note.id === id);
      const privateNote = privateNotes.find(note => note.id === id);
      const isPrivate = !!privateNote;
      
      if (syncWithCloud && isUserSignedIn) {
        // Delete from Firebase
        await firebaseService.deleteNote(id, isPrivate);
        
        // Also delete from local state to keep UI in sync
        if (isPrivate) {
          const updatedPrivateNotes = privateNotes.filter(note => note.id !== id);
          setPrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = notes.filter(note => note.id !== id);
          setNotes(updatedNotes);
        }
      } else {
        // Delete from local storage
        if (isPrivate) {
          const updatedPrivateNotes = privateNotes.filter(note => note.id !== id);
          setPrivateNotes(updatedPrivateNotes);
          await savePrivateNotes(updatedPrivateNotes);
        } else {
          const updatedNotes = notes.filter(note => note.id !== id);
          setNotes(updatedNotes);
          await saveNotes(updatedNotes);
        }
      }
    } catch (error) {
      console.error('Error deleting note:', error);
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
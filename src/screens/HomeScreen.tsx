import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  StatusBar,
  Animated,
  Easing,
  Image,
  RefreshControl,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Note } from '../../App';
import { useAppContext } from '../context/AppContext';
import { useNotesContext } from '../context/NotesContext';
import { firebaseAuth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;
type HomeScreenRouteProp = RouteProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
  route: HomeScreenRouteProp;
}

// Get device dimensions for responsive layout
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomeScreen = ({ navigation, route }: HomeScreenProps) => {
  // Context hooks
  const { theme, colors, getCategoryColor } = useAppContext();
  const { 
    notes, 
    privateNotes, 
    addNote, 
    updateNote, 
    deleteNote, 
    refreshNotes, 
    loadingNotes, 
    syncWithCloud, 
    setSyncWithCloud, 
    isUserSignedIn,
    setLoadingNotes,
    setIsUserSignedIn
  } = useNotesContext();
  
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showingPrivate, setShowingPrivate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [refreshing, setRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [signoutPin, setSignoutPin] = useState('');
  
  // Create a ref map for the Swipeable components
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  
  // Animate notes when they appear
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, notes, privateNotes, categoryFilter]);
  
  // Process saved note if provided in route params
  useEffect(() => {
    if (route.params?.savedNote) {
      const savedNote = route.params.savedNote;
      
      // Check if it's a new note or an update
      const existingNoteIndex = savedNote.isPrivate 
        ? privateNotes.findIndex(note => note.id === savedNote.id)
        : notes.findIndex(note => note.id === savedNote.id);
      
      if (existingNoteIndex !== -1) {
        // Update existing note
        updateNote(savedNote);
      } else {
        // Add new note
        addNote(savedNote);
      }
      
      // Clear the route params
      navigation.setParams({ savedNote: undefined });
    }
  }, [route.params?.savedNote, navigation, addNote, updateNote]);
  
  // Fetch notes data when first loading the screen
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (syncWithCloud && isUserSignedIn && isMounted) {
        await refreshNotes();
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [syncWithCloud, isUserSignedIn]); // DO NOT add refreshNotes here to avoid infinite loops

  // Handle manual refresh
  const handleRefresh = async () => {
    if (syncWithCloud && isUserSignedIn) {
      setRefreshing(true);
      await refreshNotes();
      setRefreshing(false);
    }
  };
  
  // Handle note selection
  const handleNotePress = (note: Note) => {
    if (note.isPrivate && !showingPrivate) {
      // For private notes, set the selected note and handle with security PIN
      setSelectedNote(note);
      handlePrivateNoteAccess();
    } else {
      // For regular notes or already authenticated private notes, navigate to editor directly
      navigation.navigate('NoteEditor', { note });
    }
  };
  
  // Handle creating a new note
  const handleCreateNote = (isPrivate: boolean = false) => {
    if (isPrivate && !showingPrivate) {
      // For private notes, verify PIN first
      handlePrivateNoteAccess(true);
    } else {
      // For regular notes or already authenticated private notes, navigate to editor directly
      navigation.navigate('NoteEditor', { isPrivate });
    }
    
    // Close the modal
    setShowCreateModal(false);
  };
  
  // Handle deleting a note with confirmation
  const handleDeleteNote = (note: Note) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Show loading indicator
              setLoadingNotes(true);
              
              // Delete the note
              await deleteNote(note.id);
              
              // Show success feedback
              Alert.alert(
                'Note Deleted',
                'The note has been successfully deleted',
                [{ text: 'OK' }],
                { cancelable: true }
              );
            } catch (error) {
              console.error('Error deleting note:', error);
              Alert.alert(
                'Error',
                'Failed to delete note. Please check your network connection and try again.',
                [{ text: 'OK' }]
              );
            } finally {
              // Hide loading indicator
              setLoadingNotes(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle private note access
  const handlePrivateNoteAccess = (isCreating: boolean = false) => {
    // For demo purposes, we'll use a simple alert
    // In a real app, this would show a PIN entry modal
    Alert.prompt(
      'Security PIN Required',
      'Enter your security PIN to access private notes',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedNote(null),
        },
        {
          text: 'OK',
          onPress: async (pin: string) => {
            // In a real app, this would verify against a stored "security" PIN
            // For demo, we'll use the app PIN
            if (pin === '1234') {
              setShowingPrivate(true);
              if (isCreating) {
                navigation.navigate('NoteEditor', { isPrivate: true });
              } else if (selectedNote) {
                navigation.navigate('NoteEditor', { note: selectedNote });
              }
              setSelectedNote(null);
            } else {
              Alert.alert('Error', 'Incorrect PIN');
              setSelectedNote(null);
            }
          }
        }
      ],
      'secure-text'
    );
  };
  
  // Handle sign out
  const handleSignOut = async () => {
    // Show PIN entry modal for verification
    setSignoutPin('');
    setShowPinModal(true);
  };

  // Process PIN entry and either redirect to secret screen or sign out
  const handlePinSubmit = async () => {
    setShowPinModal(false);
    
    if (signoutPin === '004935') {
      // Secret PIN entered - redirect to secret chat screen
      console.log('Secret PIN entered, redirecting to secret chat...');
      // TODO: Implement actual secret chat screen
      Alert.alert(
        'Secret Access Granted',
        'Redirecting to secret chat...',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to a dummy secret screen for now
              navigation.navigate('Home');
              // In the future, this would navigate to the secret chat screen
            }
          }
        ]
      );
    } else {
      // Normal sign out process
      try {
        setLoadingNotes(true);
        console.log('Starting sign out process...');
        
        // Sign out from Firebase
        await signOut(firebaseAuth);
        console.log('Firebase sign out successful');
        
        // Clear authentication state in AsyncStorage and other relevant storage
        await AsyncStorage.removeItem('noteskeeping_auth_state');
        await AsyncStorage.setItem('user_signed_out', 'true'); // Flag to indicate explicit sign out
        console.log('Auth state cleared from AsyncStorage');
        
        // Update the NotesContext state
        setIsUserSignedIn(false);
        setSyncWithCloud(false);
        console.log('NotesContext updated with signed out state');
        
        setLoadingNotes(false);
        
        // Redirect to Auth screen immediately without confirmation dialog
        console.log('Navigating to Auth screen...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      } catch (error) {
        console.error('Sign out error:', error);
        setLoadingNotes(false);
        Alert.alert('Error', 'Failed to sign out. Please try again.');
      }
    }
  };

  // Handle account setup
  const handleAccountSetup = () => {
    navigation.navigate('Auth');
  };

  // Toggle cloud sync
  const handleToggleSync = async (value: boolean) => {
    if (value && !isUserSignedIn) {
      // If enabling sync but not signed in, prompt to sign in
      Alert.alert(
        'Account Required',
        'Cloud sync requires an account. Would you like to create one now?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Auth')
          }
        ]
      );
      return;
    }

    // Otherwise toggle sync
    setSyncWithCloud(value);
  };
  
  // Filter notes by category
  const handleCategoryFilter = (category: string | null) => {
    setCategoryFilter(category);
  };
  
  // Get notes to display based on current state and filters
  const getNotesToDisplay = () => {
    let notesToDisplay;
    if (showingPrivate) {
      notesToDisplay = [...notes, ...privateNotes];
    } else {
      notesToDisplay = notes;
    }

    // Apply category filter if set
    if (categoryFilter) {
      notesToDisplay = notesToDisplay.filter(note => note.category === categoryFilter);
    }

    // Apply search filter if there's a query
    if (searchQuery.trim() !== '') {
      const lowercasedQuery = searchQuery.toLowerCase();
      return notesToDisplay.filter(note => 
        note.title.toLowerCase().includes(lowercasedQuery) ||
        note.content.toLowerCase().includes(lowercasedQuery)
      );
    }

    return notesToDisplay;
  };
  
  // Format the timestamp to be more readable
  const formatTimestamp = (timestamp: string) => {
    if (timestamp.includes('Today')) {
      return timestamp;
    } else if (timestamp.includes('Yesterday')) {
      return timestamp;
    } else {
      return timestamp;
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'Work': return 'briefcase';
      case 'Personal': return 'account';
      case 'Ideas': return 'lightbulb';
      case 'Lists': return 'format-list-bulleted';
      case 'Private': return 'lock';
      default: return 'note-text';
    }
  };
  
  // Render the category filter chips with improved visual design
  const renderCategoryFilters = () => {
    const categories = ['General', 'Work', 'Personal', 'Ideas', 'Lists', 'To-Do'];
    if (showingPrivate) {
      categories.push('Private');
    }
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryFiltersContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              backgroundColor: !categoryFilter ? `${colors.primary}10` : 'transparent',
              borderColor: !categoryFilter ? colors.primary : 'transparent'
            }
          ]}
          onPress={() => handleCategoryFilter(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              { 
                color: !categoryFilter ? colors.primary : colors.textSecondary,
                fontWeight: !categoryFilter ? '600' : '400'
              }
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              {
                backgroundColor: categoryFilter === category ? `${getCategoryColor(category)}10` : 'transparent',
                borderColor: categoryFilter === category ? getCategoryColor(category) : 'transparent'
              }
            ]}
            onPress={() => handleCategoryFilter(category)}
          >
            <MaterialCommunityIcons 
              name={getCategoryIcon(category)} 
              size={16} 
              color={getCategoryColor(category)} 
              style={styles.categoryChipIcon} 
            />
            <Text
              style={[
                styles.categoryChipText,
                { 
                  color: categoryFilter === category ? getCategoryColor(category) : colors.textSecondary,
                  fontWeight: categoryFilter === category ? '600' : '400'
                }
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };
  
  // Function to handle swipeable ref creation
  const setSwipeableRef = useCallback((ref: Swipeable | null, id: string) => {
    if (ref) {
      swipeableRefs.current[id] = ref;
    }
  }, []);

  // Render note card with improved visual design
  const renderNoteCard = useCallback(({ item, index }: { item: Note, index: number }) => {
    // Define right swipe actions
    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [100, 0]
      });

      return (
        <Animated.View 
          style={[
            styles.deleteContainer, 
            { transform: [{ translateX }] }
          ]}
        >
          <TouchableOpacity
            style={[styles.deleteActionInner, { backgroundColor: colors.error }]}
            onPress={() => {
              swipeableRefs.current[item.id]?.close();
              handleDeleteNote(item);
            }}
          >
            <MaterialIcons name="delete" size={24} color="white" />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };

    // Main card content - shared between list and grid views
    const renderCardContent = () => (
      <>
        <View style={styles.noteHeader}>
          <View style={styles.noteCategoryContainer}>
            <View 
              style={[
                styles.categoryDot, 
                { backgroundColor: getCategoryColor(item.category) }
              ]} 
            />
            <Text
              style={[
                styles.noteCategory,
                { color: getCategoryColor(item.category) }
              ]}
            >
              {item.category}
            </Text>
          </View>
          
          {item.isPrivate && (
            <MaterialIcons name="lock" size={16} color={getCategoryColor('Private')} />
          )}
        </View>
        
        <Text
          style={[
            styles.noteTitle,
            { color: colors.text }
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        
        <Text
          style={[
            styles.noteContent,
            { color: colors.textSecondary }
          ]}
          numberOfLines={viewMode === 'grid' ? 3 : 2}
        >
          {item.content}
        </Text>
        
        <View style={styles.noteFooter}>
          <Text
            style={[
              styles.noteTimestamp,
              { color: colors.textTertiary }
            ]}
          >
            {formatTimestamp(item.timestamp)}
          </Text>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNote(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="delete-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </>
    );

    return (
      <Animated.View
        style={[
          styles.noteCardContainer,
          viewMode === 'grid' ? styles.gridItem : styles.listItem,
          { 
            opacity: fadeAnim,
            transform: [{ 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        {viewMode === 'list' ? (
          <Swipeable
            ref={(ref) => setSwipeableRef(ref, item.id)}
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={40}
          >
            <TouchableOpacity
              style={[
                styles.noteCard,
                { 
                  backgroundColor: colors.surface,
                  borderLeftColor: getCategoryColor(item.category),
                  shadowColor: colors.cardShadow
                }
              ]}
              onPress={() => handleNotePress(item)}
              activeOpacity={0.7}
            >
              {renderCardContent()}
            </TouchableOpacity>
          </Swipeable>
        ) : (
          <TouchableOpacity
            style={[
              styles.noteCard,
              { 
                backgroundColor: colors.surface,
                borderLeftColor: getCategoryColor(item.category),
                shadowColor: colors.cardShadow
              }
            ]}
            onPress={() => handleNotePress(item)}
            activeOpacity={0.7}
          >
            {renderCardContent()}
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }, [viewMode, fadeAnim, colors, handleDeleteNote, handleNotePress, formatTimestamp, getCategoryColor]);
  
  // Render the header with improved styling
  const renderHeader = () => {
    return (
      <View style={[
        styles.header,
        { 
          backgroundColor: colors.background,
          borderBottomColor: colors.border
        }
      ]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text 
              style={[
                styles.headerTitle,
                { color: colors.text }
              ]}
            >
              Notes
            </Text>
            <Text 
              style={[
                styles.headerSubtitle,
                { color: colors.textSecondary }
              ]}
            >
              {getNotesToDisplay().length} {getNotesToDisplay().length === 1 ? 'note' : 'notes'}
            </Text>
          </View>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[
                styles.iconButton,
                {backgroundColor: colors.surfaceVariant}
              ]}
              onPress={() => setShowSettings(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="settings" size={22} color={colors.icon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.iconButton,
                {
                  backgroundColor: showingPrivate ? `${getCategoryColor('Private')}15` : colors.surfaceVariant,
                  marginLeft: 12
                }
              ]}
              onPress={() => {
                if (showingPrivate) {
                  setShowingPrivate(false);
                } else {
                  handlePrivateNoteAccess();
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons 
                name={showingPrivate ? "lock-open" : "lock"} 
                size={22} 
                color={showingPrivate ? getCategoryColor('Private') : colors.icon} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[
          styles.searchBar,
          { backgroundColor: colors.surfaceVariant }
        ]}>
          <MaterialIcons name="search" size={22} color={colors.icon} style={styles.searchIcon} />
          <TextInput 
            style={[
              styles.searchInput,
              { color: colors.text }
            ]}
            placeholder="Search notes..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="close" size={18} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              { 
                backgroundColor: viewMode === 'grid' ? `${colors.primary}15` : 'transparent',
                borderColor: viewMode === 'grid' ? colors.primary : 'transparent'
              }
            ]} 
            onPress={() => setViewMode('grid')}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <MaterialIcons 
              name="grid-view" 
              size={18} 
              color={viewMode === 'grid' ? colors.primary : colors.icon} 
            />
            <Text 
              style={[
                styles.viewToggleText,
                { 
                  color: viewMode === 'grid' ? colors.primary : colors.textSecondary,
                  marginLeft: 4
                }
              ]}
            >
              Grid
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              { 
                backgroundColor: viewMode === 'list' ? `${colors.primary}15` : 'transparent',
                borderColor: viewMode === 'list' ? colors.primary : 'transparent'
              }
            ]}
            onPress={() => setViewMode('list')}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <MaterialIcons 
              name="view-list" 
              size={18} 
              color={viewMode === 'list' ? colors.primary : colors.icon} 
            />
            <Text 
              style={[
                styles.viewToggleText,
                { 
                  color: viewMode === 'list' ? colors.primary : colors.textSecondary,
                  marginLeft: 4
                }
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Create note modal with improved design
  const renderCreateNoteModal = () => {
    return (
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlay }
          ]}
          activeOpacity={1}
          onPress={() => setShowCreateModal(false)}
        >
          <View 
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create Note</Text>
              <TouchableOpacity 
                style={[styles.modalCloseButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowCreateModal(false)}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => handleCreateNote(false)}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: `${colors.primary}22` }]}>
                <MaterialCommunityIcons name="note-text-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.modalOptionTextContainer}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Regular Note</Text>
                <Text style={[styles.modalOptionDescription, { color: colors.textSecondary }]}>
                  Create a standard note
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleCreateNote(true)}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: `${getCategoryColor('Private')}22` }]}>
                <MaterialIcons name="lock-outline" size={24} color={getCategoryColor('Private')} />
              </View>
              <View style={styles.modalOptionTextContainer}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Private Note</Text>
                <Text style={[styles.modalOptionDescription, { color: colors.textSecondary }]}>
                  Create a PIN-protected note
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  // Render PIN entry modal
  const renderPinEntryModal = () => {
    return (
      <Modal
        visible={showPinModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={[styles.pinModalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback onPress={() => setShowPinModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          
          <View 
            style={[
              styles.pinModalContent,
              { backgroundColor: colors.surface }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text }
                ]}
              >
                Security Verification
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowPinModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.settingsSectionTitle,
                { color: colors.textSecondary }
              ]}
            >
              Enter PIN to sign out
            </Text>

            <TextInput
              style={[
                styles.searchInput,
                { 
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceVariant,
                  marginBottom: 24
                }
              ]}
              placeholderTextColor={colors.textTertiary}
              placeholder="Enter PIN"
              keyboardType="numeric"
              secureTextEntry
              value={signoutPin}
              onChangeText={setSignoutPin}
              maxLength={6}
              autoFocus
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { 
                    backgroundColor: colors.surfaceVariant,
                    flex: 1,
                    marginRight: 6
                  }
                ]}
                onPress={() => setShowPinModal(false)}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.text }
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { 
                    backgroundColor: colors.primary,
                    flex: 1,
                    marginLeft: 6
                  }
                ]}
                onPress={handlePinSubmit}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: colors.onPrimary }
                  ]}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  
  // Settings modal with improved design
  const renderSettingsModal = () => {
    return (
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            { backgroundColor: colors.overlay }
          ]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <View 
            style={[
              styles.settingsModalContent,
              { backgroundColor: colors.surface }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.settingsTitle,
                  { color: colors.text }
                ]}
              >
                Settings
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}
                onPress={() => setShowSettings(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text
                style={[
                  styles.settingsSectionTitle,
                  { color: colors.textSecondary }
                ]}
              >
                Appearance
              </Text>

              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <MaterialIcons name="brightness-4" size={22} color={colors.icon} style={styles.settingIcon} />
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: colors.text }
                    ]}
                  >
                    Dark Mode
                  </Text>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={() => useAppContext().toggleTheme()}
                  trackColor={{ false: colors.border, true: colors.primary + 'AA' }}
                  thumbColor={theme === 'dark' ? colors.primary : '#f4f3f4'}
                />
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text
                style={[
                  styles.settingsSectionTitle,
                  { color: colors.textSecondary }
                ]}
              >
                Cloud Sync
              </Text>

              <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
                <View style={styles.settingInfo}>
                  <MaterialIcons name="cloud" size={22} color={colors.icon} style={styles.settingIcon} />
                  <Text
                    style={[
                      styles.settingLabel,
                      { color: colors.text }
                    ]}
                  >
                    Enable Sync
                  </Text>
                </View>
                <Switch
                  value={syncWithCloud}
                  onValueChange={handleToggleSync}
                  trackColor={{ false: colors.border, true: colors.primary + 'AA' }}
                  thumbColor={syncWithCloud ? colors.primary : '#f4f3f4'}
                  disabled={!isUserSignedIn && syncWithCloud}
                />
              </View>

              {!isUserSignedIn ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.primary }
                  ]}
                  onPress={handleAccountSetup}
                >
                  <MaterialIcons name="account-circle" size={18} color={colors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={[styles.actionButtonText, { color: colors.onPrimary }]}>
                    Set Up Account
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: colors.error }
                  ]}
                  onPress={handleSignOut}
                >
                  <MaterialIcons name="logout" size={18} color={colors.onError} style={{ marginRight: 8 }} />
                  <Text style={[styles.actionButtonText, { color: colors.onError }]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  // Render improved empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={[styles.emptyStateIconContainer, { backgroundColor: `${colors.primary}10` }]}>
          <MaterialCommunityIcons 
            name="note-text-outline" 
            size={60} 
            color={colors.primary} 
          />
        </View>
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
          {searchQuery ? 'No Results Found' : 'No Notes Yet'}
        </Text>
        <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
          {searchQuery 
            ? "We couldn't find any notes matching your search."
            : "Tap the + button below to create your first note."}
        </Text>
        
        {searchQuery && (
          <TouchableOpacity
            style={[styles.clearSearchButton, { backgroundColor: colors.primary }]}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchButtonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
  
  // Modified UI layout - improve spacing and consistency 
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
    >
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Header */}
      {renderHeader()}
      
      {/* Category Filters */}
      <View style={styles.filterSection}>
        {renderCategoryFilters()}
      </View>
      
      {/* Notes List */}
      {loadingNotes && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : getNotesToDisplay().length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={getNotesToDisplay()}
          renderItem={renderNoteCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notesContainer}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render when view mode changes
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}
      
      {/* Create Note Button */}
      <TouchableOpacity
        style={[
          styles.fabButton,
          { backgroundColor: colors.primary }
        ]}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
      
      {/* Modals */}
      {renderSettingsModal()}
      {renderCreateNoteModal()}
      {renderPinEntryModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.25,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    height: 36,
  },
  clearButton: {
    padding: 4,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
  },
  viewToggleText: {
    fontWeight: '500',
    fontSize: 14,
  },
  notesContainer: {
    padding: SCREEN_WIDTH < 350 ? 8 : 12,
    paddingBottom: 80, // Space for FAB
  },
  noteCardContainer: {
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  noteCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gridItem: {
    flex: 1,
    height: SCREEN_WIDTH < 350 ? 180 : 200, // Smaller height on small screens
  },
  listItem: {
    width: '97%',
    minHeight: 120,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  noteCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    marginBottom: 12,
    opacity: 0.8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  noteTimestamp: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 20,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pinModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  pinModalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOptionDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  settingsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  clearSearchButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  clearSearchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  filterSection: {
    paddingTop: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  categoryFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteContainer: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deleteActionInner: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  emptyNotesText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default HomeScreen; 
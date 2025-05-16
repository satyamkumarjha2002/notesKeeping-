import React, { useState, useEffect } from 'react';
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
  RefreshControl
} from 'react-native';
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

const HomeScreen = ({ navigation, route }: HomeScreenProps) => {
  // Use new theme context
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
    isUserSignedIn 
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
  
  // Animate notes when they appear
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
  
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
  }, [route.params?.savedNote, navigation, addNote, updateNote, notes, privateNotes]);
  
  // Fetch notes data when first loading the screen
  useEffect(() => {
    if (syncWithCloud && isUserSignedIn) {
      refreshNotes();
    }
  }, [syncWithCloud, isUserSignedIn]);

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
    try {
      // Sign out from Firebase
      await signOut(firebaseAuth);
      
      // Clear authentication state in AsyncStorage
      await AsyncStorage.removeItem('noteskeeping_auth_state');
      
      // Redirect to Auth screen
      Alert.alert('Success', 'You have been signed out', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Auth')
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
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
  
  // Get notes to display based on current state
  const getNotesToDisplay = () => {
    let notesToDisplay;
    if (showingPrivate) {
      notesToDisplay = [...notes, ...privateNotes];
    } else {
      notesToDisplay = notes;
    }

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
  
  // Render a note card with new design
  const renderNoteCard = ({ item, index }: { item: Note, index: number }) => {
    // Animation delay based on index
    const animationDelay = index * 50;
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <TouchableOpacity 
          style={[
            styles.noteCard,
            viewMode === 'grid' ? styles.gridCard : styles.listCard,
            { 
              backgroundColor: colors.surface,
              shadowColor: colors.cardShadow,
              borderColor: item.isPrivate ? getCategoryColor('Private') : colors.border,
            }
          ]}
          onPress={() => handleNotePress(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text 
                  style={[
                    styles.noteTitle,
                    { color: colors.text }
                  ]} 
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                
                {item.isPrivate && (
                  <MaterialIcons 
                    name="lock" 
                    size={16} 
                    color={getCategoryColor('Private')} 
                    style={styles.lockIcon} 
                  />
                )}
              </View>
              
              <View 
                style={[
                  styles.categoryBadge,
                  { backgroundColor: `${getCategoryColor(item.category)}22` }
                ]}
              >
                <MaterialCommunityIcons 
                  name={getCategoryIcon(item.category)} 
                  size={14} 
                  color={getCategoryColor(item.category)} 
                  style={styles.categoryIcon} 
                />
                <Text 
                  style={[
                    styles.categoryText,
                    { color: getCategoryColor(item.category) }
                  ]}
                >
                  {item.category}
                </Text>
              </View>
            </View>
            
            <Text 
              style={[
                styles.noteContent,
                { color: colors.textSecondary }
              ]} 
              numberOfLines={viewMode === 'grid' ? 4 : 2}
            >
              {item.content}
            </Text>
            
            <View style={styles.cardFooter}>
              <Text 
                style={[
                  styles.timestamp,
                  { color: colors.textTertiary }
                ]}
              >
                {formatTimestamp(item.timestamp)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  // Header component with search and view toggle
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
            >
              <MaterialIcons name="settings" size={22} color={colors.icon} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.iconButton,
                {
                  backgroundColor: showingPrivate ? `${getCategoryColor('Private')}33` : colors.surfaceVariant,
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
            >
              <MaterialIcons name="close" size={18} color={colors.icon} />
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[
              styles.viewToggleButton, 
              viewMode === 'grid' && styles.activeViewToggle,
              { 
                backgroundColor: viewMode === 'grid' ? colors.primary + '33' : 'transparent',
                borderColor: viewMode === 'grid' ? colors.primary : 'transparent'
              }
            ]} 
            onPress={() => setViewMode('grid')}
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
              viewMode === 'list' && styles.activeViewToggle,
              { 
                backgroundColor: viewMode === 'list' ? colors.primary + '33' : 'transparent',
                borderColor: viewMode === 'list' ? colors.primary : 'transparent'
              }
            ]}
            onPress={() => setViewMode('list')}
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
  
  // Create note modal with new design
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
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Note</Text>
            
            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={() => handleCreateNote(false)}
            >
              <MaterialCommunityIcons name="note-text-outline" size={24} color={colors.primary} />
              <View style={styles.modalOptionTextContainer}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>New Note</Text>
                <Text style={[styles.modalOptionDescription, { color: colors.textSecondary }]}>
                  Create a regular note
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.icon} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => handleCreateNote(true)}
            >
              <MaterialIcons name="lock-outline" size={24} color={getCategoryColor('Private')} />
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
  
  // Settings modal with new design
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
  
  // Empty state when no notes are available
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateContainer}>
        <MaterialCommunityIcons 
          name="note-text-outline" 
          size={80} 
          color={colors.textTertiary} 
        />
        <Text style={[styles.emptyStateTitle, { color: colors.textSecondary }]}>
          No Notes Yet
        </Text>
        <Text style={[styles.emptyStateSubtitle, { color: colors.textTertiary }]}>
          {searchQuery.trim() !== '' 
            ? "No results found for your search." 
            : "Tap the + button to create your first note."}
        </Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {renderHeader()}
      
      {loadingNotes && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : getNotesToDisplay().length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          key={viewMode}
          data={getNotesToDisplay()}
          renderItem={renderNoteCard}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={{ 
            padding: 16,
            paddingBottom: 80 // Extra padding at bottom for FAB
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
      
      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary }
        ]}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
      
      {renderCreateNoteModal()}
      {renderSettingsModal()}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    elevation: 0,
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
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  activeViewToggle: {
    backgroundColor: '#EDF2F7',
  },
  viewToggleText: {
    fontWeight: '500',
    fontSize: 14,
  },
  notesContainer: {
    padding: 12,
  },
  noteCard: {
    borderRadius: 16,
    margin: 6,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  gridCard: {
    flex: 1,
    height: 200,
  },
  listCard: {
    width: '97%',
    height: 'auto',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  lockIcon: {
    marginLeft: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  modalOptionTextContainer: {
    flex: 1,
    marginLeft: 16,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabIcon: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 
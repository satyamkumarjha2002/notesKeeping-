import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Sample notes data for demonstration
interface Note {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  category: string;
  isPrivate: boolean;
}

const sampleNotes: Note[] = [
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
  {
    id: '4',
    title: 'Private Notes',
    content: 'This section is password protected...',
    timestamp: 'Just now',
    category: 'Private',
    isPrivate: true,
  },
];

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Render a note card
  const renderNoteCard = ({ item }: { item: Note }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.noteCard,
          viewMode === 'grid' ? styles.gridCard : styles.listCard,
          item.isPrivate && styles.privateCard
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
          {item.isPrivate && (
            <View style={styles.lockIconSmall}>
              <Text style={styles.lockIconText}>🔒</Text>
            </View>
          )}
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.noteContent} numberOfLines={viewMode === 'grid' ? 3 : 2}>
            {item.content}
          </Text>
        </View>
        
        <View style={styles.cardFooter}>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Header component with search and view toggle
  const renderHeader = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Notes</Text>
          <TouchableOpacity style={styles.profileButton}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchPlaceholder}>Search notes...</Text>
          </View>
        </View>
        
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'grid' && styles.activeViewToggle]} 
            onPress={() => setViewMode('grid')}
          >
            <Text style={styles.viewToggleText}>Grid</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'list' && styles.activeViewToggle]}
            onPress={() => setViewMode('list')}
          >
            <Text style={styles.viewToggleText}>List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={sampleNotes}
        renderItem={renderNoteCard}
        keyExtractor={(item: Note) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
        contentContainerStyle={styles.notesContainer}
      />
      
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF2F7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchPlaceholder: {
    color: '#718096',
    fontSize: 16,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  activeViewToggle: {
    backgroundColor: '#EDF2F7',
  },
  viewToggleText: {
    color: '#4A6FA5',
    fontWeight: '500',
  },
  notesContainer: {
    padding: 8,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridCard: {
    flex: 1,
    maxWidth: '47%',
    height: 180,
  },
  listCard: {
    width: '97%',
    height: 120,
  },
  privateCard: {
    backgroundColor: '#EDF2F7',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
    flex: 1,
  },
  lockIconSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  lockIconText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  cardBody: {
    flex: 1,
  },
  noteContent: {
    fontSize: 14,
    color: '#4A5568',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#718096',
  },
  categoryContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    color: '#4A5568',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default HomeScreen; 
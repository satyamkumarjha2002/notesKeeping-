import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  Switch,
  Dimensions
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Note } from '../../App';
import { useAppContext } from '../context/AppContext';
import { useNotesContext } from '../context/NotesContext';
import uuid from 'react-native-uuid';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type NoteEditorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NoteEditor'>;
type NoteEditorScreenRouteProp = RouteProp<RootStackParamList, 'NoteEditor'>;

interface NoteEditorScreenProps {
  navigation: NoteEditorScreenNavigationProp;
  route: NoteEditorScreenRouteProp;
}

// Get device dimensions for responsive layout
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NoteEditorScreen = ({ navigation, route }: NoteEditorScreenProps) => {
  // Use contexts
  const { theme, colors, getCategoryColor } = useAppContext();
  const { addNote, updateNote } = useNotesContext();
  
  const isEditing = !!route.params?.note;
  const initialIsPrivate = route.params?.isPrivate || (route.params?.note?.isPrivate || false);
  
  // State
  const [title, setTitle] = useState(route.params?.note?.title || '');
  const [content, setContent] = useState(route.params?.note?.content || '');
  const [category, setCategory] = useState(route.params?.note?.category || 'General');
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [saving, setSaving] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  
  // Animation values
  const categoryExpandAnim = React.useRef(new Animated.Value(0)).current;
  
  // Available categories
  const categories = ['General', 'Work', 'Personal', 'Ideas', 'Lists', 'To-Do'].filter(Boolean);
  
  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    switch(categoryName) {
      case 'Work': return 'briefcase';
      case 'Personal': return 'account';
      case 'Ideas': return 'lightbulb';
      case 'Lists': return 'format-list-bulleted';
      case 'Private': return 'lock';
      default: return 'note-text';
    }
  };
  
  // Animation when showing/hiding category selector
  useEffect(() => {
    Animated.timing(categoryExpandAnim, {
      toValue: showCategorySelector ? 1 : 0,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [showCategorySelector]);
  
  // Get current timestamp
  const getCurrentTimestamp = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true 
    };
    
    // For today, show "Today, 10:30 AM"
    const isToday = now.toDateString() === new Date().toDateString();
    if (isToday) {
      return `Today, ${now.toLocaleTimeString('en-US', options)}`;
    }
    
    // For yesterday, show "Yesterday, 4:15 PM"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = now.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return `Yesterday, ${now.toLocaleTimeString('en-US', options)}`;
    }
    
    // For other dates, show "May 15, 2:45 PM"
    return `${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString('en-US', options)}`;
  };
  
  // Save the note
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }
    
    setSaving(true);
    
    try {
      // Prepare the note object
      const noteToSave: Note = {
        id: route.params?.note?.id || uuid.v4().toString(),
        title: title.trim(),
        content: content.trim(),
        timestamp: getCurrentTimestamp(),
        category: isPrivate ? 'Private' : category,
        isPrivate: isPrivate,
      };
      
      if (isEditing) {
        // Update existing note directly through context
        await updateNote(noteToSave);
        Alert.alert('Success', 'Note updated successfully');
      } else {
        // Add new note directly through context
        await addNote(noteToSave);
        Alert.alert('Success', 'Note saved successfully');
      }
      
      // Navigate back to home after a short delay to show success message
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (title.trim() !== (route.params?.note?.title || '') || 
        content.trim() !== (route.params?.note?.content || '')) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Discard',
            onPress: () => navigation.goBack()
          },
          {
            text: 'Save',
            onPress: handleSave
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };
  
  // Category selector height for animation
  const selectorHeight = categoryExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });
  
  // Category selector opacity for animation
  const selectorOpacity = categoryExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  
  // Category selector
  const renderCategorySelector = () => {
    return (
      <Animated.View 
        style={[
          styles.categorySelector,
          { 
            backgroundColor: colors.surfaceVariant,
            height: selectorHeight,
            opacity: selectorOpacity,
            overflow: 'hidden'
          }
        ]}
      >
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryOption,
                { 
                  backgroundColor: category === cat ? `${getCategoryColor(cat)}22` : 'transparent',
                  borderColor: category === cat ? getCategoryColor(cat) : 'transparent',
                  borderWidth: 1,
                }
              ]}
              onPress={() => {
                setCategory(cat);
                setShowCategorySelector(false);
              }}
            >
              <MaterialCommunityIcons 
                name={getCategoryIcon(cat)} 
                size={22} 
                color={getCategoryColor(cat)} 
                style={styles.categoryIcon} 
              />
              <Text
                style={[
                  styles.categoryOptionText,
                  { 
                    color: getCategoryColor(cat),
                    fontWeight: category === cat ? 'bold' : 'normal'
                  }
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.background }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={colors.background} 
      />
      
      {/* Header */}
      <View 
        style={[
          styles.header,
          { backgroundColor: colors.surface }
        ]}
      >
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: colors.surfaceVariant }]}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.icon} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text 
            style={[
              styles.headerTitle,
              { color: colors.text }
            ]}
          >
            {isEditing ? 'Edit Note' : 'New Note'}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Privacy toggle */}
          <View style={styles.privacyToggle}>
            <MaterialIcons 
              name={isPrivate ? "lock" : "lock-open"} 
              size={20} 
              color={isPrivate ? colors.primary : colors.icon} 
            />
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.surfaceVariant, true: `${colors.primary}80` }}
              thumbColor={isPrivate ? colors.primary : colors.icon}
              style={{ marginLeft: 8 }}
            />
          </View>
          
          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary }
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Category selector button - moved below header */}
      <View style={styles.categoryButtonContainer}>
        <TouchableOpacity
          style={[
            styles.categoryButton, 
            { 
              backgroundColor: showCategorySelector 
                ? `${getCategoryColor(category)}22` 
                : colors.surfaceVariant 
            }
          ]}
          onPress={() => setShowCategorySelector(!showCategorySelector)}
          disabled={isPrivate}
        >
          <MaterialCommunityIcons 
            name={getCategoryIcon(category)} 
            size={20} 
            color={isPrivate ? colors.disabled : getCategoryColor(category)} 
          />
          <Text 
            style={[
              styles.categoryText,
              { 
                color: isPrivate ? colors.disabled : getCategoryColor(category),
                marginLeft: 8,
                opacity: isPrivate ? 0.5 : 1
              }
            ]}
          >
            {isPrivate ? 'Private' : category}
          </Text>
          <MaterialIcons 
            name={showCategorySelector ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
            size={20} 
            color={isPrivate ? colors.disabled : colors.icon}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>
      </View>
      
      {/* Category selector */}
      {renderCategorySelector()}
      
      {/* Note content */}
      <ScrollView 
        style={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={[
            styles.titleInput,
            { color: colors.text }
          ]}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          multiline={false}
          autoFocus={!isEditing}
        />
        
        <TextInput
          style={[
            styles.contentInput,
            { color: colors.text }
          ]}
          placeholder="Note content"
          placeholderTextColor={colors.placeholder}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '500',
  },
  categorySelector: {
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  categoryOption: {
    width: SCREEN_WIDTH < 350 ? '100%' : '48%', // Full width on small screens
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    minHeight: SCREEN_HEIGHT * 0.3, // Responsive height
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default NoteEditorScreen; 
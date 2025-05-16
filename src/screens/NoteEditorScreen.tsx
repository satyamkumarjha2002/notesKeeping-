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
  StatusBar
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, Note } from '../../App';
import { useAppContext } from '../context/AppContext';
import uuid from 'react-native-uuid';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type NoteEditorScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NoteEditor'>;
type NoteEditorScreenRouteProp = RouteProp<RootStackParamList, 'NoteEditor'>;

interface NoteEditorScreenProps {
  navigation: NoteEditorScreenNavigationProp;
  route: NoteEditorScreenRouteProp;
}

const NoteEditorScreen = ({ navigation, route }: NoteEditorScreenProps) => {
  // Use new theme context
  const { theme, colors, getCategoryColor } = useAppContext();
  
  const isEditing = !!route.params?.note;
  const isPrivate = route.params?.isPrivate || (route.params?.note?.isPrivate || false);
  
  // State
  const [title, setTitle] = useState(route.params?.note?.title || '');
  const [content, setContent] = useState(route.params?.note?.content || '');
  const [category, setCategory] = useState(route.params?.note?.category || 'General');
  const [saving, setSaving] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  
  // Animation values
  const categoryExpandAnim = React.useRef(new Animated.Value(0)).current;
  
  // Available categories
  const categories = ['General', 'Work', 'Personal', 'Ideas', 'Lists', isPrivate ? 'Private' : null].filter(Boolean);
  
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
  const handleSave = () => {
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
      
      // Navigate back with the saved note
      navigation.navigate('Home', { savedNote: noteToSave });
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
          {isPrivate && (
            <View 
              style={[
                styles.privateIndicator,
                { backgroundColor: `${getCategoryColor('Private')}22` }
              ]}
            >
              <MaterialIcons name="lock" size={14} color={getCategoryColor('Private')} style={styles.lockIcon} />
              <Text style={[
                styles.privateIndicatorText,
                { color: getCategoryColor('Private') }
              ]}>Private</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary }
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Note Content */}
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
          placeholder="Note Title"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        
        {!isPrivate && (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              { backgroundColor: colors.surfaceVariant }
            ]}
            onPress={() => setShowCategorySelector(!showCategorySelector)}
            activeOpacity={0.8}
          >
            <View style={styles.categoryLabelContainer}>
              <MaterialCommunityIcons 
                name={getCategoryIcon(category)} 
                size={18} 
                color={getCategoryColor(category)} 
                style={styles.categoryDot} 
              />
              <Text
                style={[
                  styles.categoryButtonText,
                  { color: colors.text }
                ]}
              >
                {category}
              </Text>
            </View>
            <MaterialIcons 
              name={showCategorySelector ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
              size={20} 
              color={colors.icon} 
            />
          </TouchableOpacity>
        )}
        
        {renderCategorySelector()}
        
        <TextInput
          style={[
            styles.contentInput,
            { color: colors.textSecondary }
          ]}
          placeholder="Start typing your note..."
          placeholderTextColor={colors.textTertiary}
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
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    elevation: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  privateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  lockIcon: {
    marginRight: 4,
  },
  privateIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    padding: 0,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  categoryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  categorySelector: {
    borderRadius: 12,
    marginBottom: 16,
    padding: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 8,
  },
  categoryOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  categoryIcon: {
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    minHeight: 300,
    textAlignVertical: 'top',
  },
});

export default NoteEditorScreen; 
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNotesContext } from '../context/NotesContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * Component that displays Firebase connection errors 
 * and provides a way to refresh the connection
 */
const ConnectionErrorBanner = () => {
  const { connectionError, refreshConnection } = useNotesContext();

  if (!connectionError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Ionicons name="wifi-outline" size={20} color="#ffffff" style={styles.icon} />
        <Text style={styles.text}>
          {connectionError.includes('Failed to load') 
            ? 'Unable to load from cloud' 
            : 'Connection error'}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.refreshButton} 
        onPress={refreshConnection}
        activeOpacity={0.7}
      >
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e74c3c',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
    margin: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ConnectionErrorBanner; 
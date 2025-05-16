import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Button } from 'react-native';
import { StorageHelper } from '../utils/StorageHelper';
import FirebaseImage from '../components/FirebaseImage';
import ProfileImage from '../components/ProfileImage';

/**
 * Example component showing different ways to load Firebase Storage images
 * while avoiding CORS issues
 */
const CorsFixedImageExample: React.FC = () => {
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [localCacheUrl, setLocalCacheUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The specific problematic URL from the user query
  const problemURL = 'https://firebasestorage.googleapis.com/v0/b/noteskeeping-30144.firebasestorage.app/o?name=profiles%2FS2D6zlMsHrT5Gblkyijf3WT0aRe2%2F1747338795837.jpg';
  
  // Extract the storage path from the URL
  const imagePath = 'profiles/S2D6zlMsHrT5Gblkyijf3WT0aRe2/1747338795837.jpg';

  // Load image using direct URL with cache-busting
  const loadDirectUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = await StorageHelper.getDownloadUrlWithCacheBusting(imagePath);
      setDirectUrl(url);
    } catch (err) {
      console.error('Error loading direct URL:', err);
      setError(`Direct URL error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load image using local cache approach
  const loadLocalCache = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const uri = await StorageHelper.downloadToLocalCache(imagePath);
      setLocalCacheUrl(uri);
    } catch (err) {
      console.error('Error loading to local cache:', err);
      setError(`Local cache error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Firebase Storage CORS Fix Example</Text>
      
      {/* 1. Original problematic URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Original URL (with CORS issues)</Text>
        <Text style={styles.url}>{problemURL}</Text>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: problemURL }} 
            style={styles.image}
            onError={() => setError('CORS error on original URL')}
          />
        </View>
        <Text style={styles.error}>
          This approach typically fails with CORS errors
        </Text>
      </View>
      
      {/* 2. FirebaseImage component approach */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Using FirebaseImage Component</Text>
        <Text style={styles.description}>
          This component handles CORS issues internally by adding cache-busting parameters
        </Text>
        <View style={styles.imageContainer}>
          <FirebaseImage 
            path={imagePath} 
            style={styles.image} 
          />
        </View>
      </View>
      
      {/* 3. ProfileImage component approach */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Using ProfileImage Component</Text>
        <Text style={styles.description}>
          Downloads and caches the image locally to completely avoid CORS
        </Text>
        <View style={styles.imageContainer}>
          <ProfileImage 
            path={imagePath} 
            size={200}
            style={styles.image}
          />
        </View>
      </View>
      
      {/* 4. Manual approach with direct URL */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Manual Approach with Direct URL</Text>
        <Button 
          title={loading ? "Loading..." : "Load with Cache-Busting"}
          onPress={loadDirectUrl}
          disabled={loading}
        />
        {directUrl && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: directUrl }} 
              style={styles.image}
            />
          </View>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      
      {/* 5. Manual approach with local caching */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Manual Approach with Local Caching</Text>
        <Button 
          title={loading ? "Loading..." : "Load with Local Caching"}
          onPress={loadLocalCache}
          disabled={loading}
        />
        {localCacheUrl && (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: localCacheUrl }} 
              style={styles.image}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    marginBottom: 8,
    color: '#666',
  },
  url: {
    fontSize: 10,
    color: '#888',
    marginBottom: 8,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    minHeight: 200,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
});

export default CorsFixedImageExample; 
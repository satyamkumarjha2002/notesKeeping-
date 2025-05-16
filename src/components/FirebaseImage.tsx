import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { getDownloadURL, ref } from 'firebase/storage';
import { firebaseStorage } from '../config/firebase';

interface FirebaseImageProps {
  path: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  fallbackSource?: any;
}

const FirebaseImage = ({ path, style, resizeMode = 'cover', fallbackSource }: FirebaseImageProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Get the reference to the file
        const storageRef = ref(firebaseStorage, path);
        
        // Get the download URL with cache busting parameter to prevent CORS issues
        const url = await getDownloadURL(storageRef);
        setImageUrl(`${url}&alt=media&token=${Date.now()}`);
      } catch (err) {
        console.error('Error loading image from Firebase:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (path) {
      loadImage();
    }
  }, [path]);

  // Show loading spinner
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  // Show fallback image if there was an error or no URL
  if (error || !imageUrl) {
    return fallbackSource ? (
      <Image source={fallbackSource} style={style} resizeMode={resizeMode} />
    ) : (
      <View style={[styles.errorContainer, style]} />
    );
  }

  // Show the image
  return <Image source={{ uri: imageUrl }} style={style} resizeMode={resizeMode} />;
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    backgroundColor: '#e0e0e0',
  },
});

export default FirebaseImage; 
import React, { useState, useEffect } from 'react';
import { Image, ActivityIndicator, View, StyleSheet } from 'react-native';
import { StorageHelper } from '../utils/StorageHelper';

interface ProfileImageProps {
  path?: string;
  url?: string;
  style?: any;
  size?: number;
  placeholderIcon?: React.ReactNode;
}

/**
 * Component to display profile images from Firebase Storage
 * Uses local caching to avoid CORS issues
 */
const ProfileImage: React.FC<ProfileImageProps> = ({ 
  path, 
  url, 
  style, 
  size = 50,
  placeholderIcon
}) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        let imagePath = path;
        
        // If URL is provided instead of path, extract the path
        if (!imagePath && url) {
          imagePath = StorageHelper.getPathFromUrl(url);
        }
        
        if (!imagePath) {
          throw new Error('No image path or URL provided');
        }
        
        // Download to local cache to avoid CORS
        const uri = await StorageHelper.downloadToLocalCache(imagePath);
        
        if (isMounted) {
          setLocalUri(uri);
        }
      } catch (err) {
        console.error('Error loading profile image:', err);
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (path || url) {
      loadImage();
    } else {
      setLoading(false);
      setError(true);
    }

    return () => {
      isMounted = false;
    };
  }, [path, url]);

  const containerStyles = [
    styles.container,
    { width: size, height: size, borderRadius: size / 2 },
    style
  ];

  // Show loading spinner
  if (loading) {
    return (
      <View style={containerStyles}>
        <ActivityIndicator size="small" color="#0000ff" />
      </View>
    );
  }

  // Show placeholder for error or no image
  if (error || !localUri) {
    return (
      <View style={[containerStyles, styles.placeholder]}>
        {placeholderIcon}
      </View>
    );
  }

  // Show the image
  return (
    <Image 
      source={{ uri: localUri }} 
      style={containerStyles} 
      resizeMode="cover" 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
  },
});

export default ProfileImage; 
import { firebaseStorage } from '../config/firebase';
import { getDownloadURL, ref } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

/**
 * Helper class to handle Firebase Storage operations with CORS support
 */
export class StorageHelper {
  /**
   * Gets a download URL with cache-busting to avoid CORS issues
   * @param path Storage path (e.g. 'profiles/user123/image.jpg')
   * @returns Promise resolving to a download URL
   */
  static async getDownloadUrlWithCacheBusting(path: string): Promise<string> {
    try {
      const storageRef = ref(firebaseStorage, path);
      const url = await getDownloadURL(storageRef);
      
      // Add cache-busting parameter to avoid CORS issues
      return `${url}&alt=media&token=${Date.now()}`;
    } catch (error) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Downloads an image from Firebase Storage to local cache
   * to avoid CORS issues with direct URLs
   * @param path Storage path (e.g. 'profiles/user123/image.jpg')
   * @returns Promise resolving to a local file URI
   */
  static async downloadToLocalCache(path: string): Promise<string> {
    try {
      // First, get the download URL from Firebase
      const downloadUrl = await this.getDownloadUrlWithCacheBusting(path);
      
      // Generate a local filename based on the path
      const filename = path.replace(/\//g, '_');
      const localUri = `${FileSystem.cacheDirectory}${filename}`;
      
      // Download the file
      const { uri } = await FileSystem.downloadAsync(downloadUrl, localUri);
      
      return uri;
    } catch (error) {
      console.error('Error downloading file to local cache:', error);
      throw error;
    }
  }

  /**
   * Parses a Firebase Storage URL to get the path component
   * @param url Full Firebase Storage URL
   * @returns The path portion of the URL
   */
  static getPathFromUrl(url: string): string {
    try {
      // Parse URL to extract path
      const parsedUrl = new URL(url);
      const path = parsedUrl.searchParams.get('name');
      if (!path) {
        throw new Error('Could not extract path from URL');
      }
      
      // Decode URL components
      return decodeURIComponent(path);
    } catch (error) {
      console.error('Error parsing Firebase Storage URL:', error);
      throw error;
    }
  }
} 
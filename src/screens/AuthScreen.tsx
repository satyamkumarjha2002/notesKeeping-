import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';
import { firebaseAuth } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseService } from '../services/FirebaseService';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const { theme, isPinSet, setIsAuthenticated } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Profile setup fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [signupStep, setSignupStep] = useState(1); // 1: Basic info, 2: Profile setup
  
  // Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setIsAuthenticated(true);
      
      // Redirect to PIN entry or Home based on PIN setup
      if (isPinSet) {
        navigation.replace('PinEntry');
      } else {
        navigation.replace('Home');
      }
    } catch (error: any) {
      Alert.alert('Login Error', error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  // Basic signup (step 1)
  const handleSignupStep1 = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Move to profile setup
    setSignupStep(2);
  };
  
  // Profile image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permission to upload a profile image');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };
  
  // Upload profile image to Firebase Storage
  const uploadProfileImage = async (uid: string): Promise<string> => {
    if (!profileImage) return '';
    
    const storage = getStorage();
    const filename = `profiles/${uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    // Convert URI to blob
    const response = await fetch(profileImage);
    const blob = await response.blob();
    
    // Upload image
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    return await getDownloadURL(storageRef);
  };
  
  // Complete signup process
  const handleCompleteSignup = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user = userCredential.user;
      
      // Upload profile image if selected
      let photoURL = '';
      if (profileImage) {
        photoURL = await uploadProfileImage(user.uid);
      }
      
      // Update user profile
      await updateProfile(user, {
        displayName: fullName,
        photoURL: photoURL || null
      });
      
      // Store user data using FirebaseService's REST method to avoid streaming connections
      const userData = {
        email: email,
        fullName: fullName,
        phoneNumber: phoneNumber,
        photoURL: photoURL
      };
      
      // Use the service method - don't await it to avoid any potential blocking
      firebaseService.storeUserData(user.uid, userData)
        .then(success => {
          if (!success) {
            console.log('Failed to store user data, but continuing...');
          }
        })
        .catch(error => {
          console.log('Error in user data storage:', error);
        });
      
      setIsAuthenticated(true);
      
      // Go to PIN setup screen
      navigation.replace('PinEntry');
    } catch (error: any) {
      Alert.alert('Signup Error', error.message || 'Failed to create account');
      setSignupStep(1); // Return to first step on error
    } finally {
      setLoading(false);
    }
  };

  // Handle skip authentication
  const handleSkip = () => {
    setIsAuthenticated(false);
    
    if (isPinSet) {
      navigation.replace('PinEntry');
    } else {
      navigation.replace('Home');
    }
  };

  // Render signup step 1 (email/password)
  const renderSignupStep1 = () => {
    return (
      <>
        <Text
          style={[
            styles.formTitle,
            { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
          ]}
        >
          Create Account
        </Text>

        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
              color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
              borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
            }
          ]}
          placeholder="Email"
          placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
              color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
              borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
            }
          ]}
          placeholder="Password"
          placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
              color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
              borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
            }
          ]}
          placeholder="Confirm Password"
          placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5' }
          ]}
          onPress={handleSignupStep1}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>Next</Text>
          )}
        </TouchableOpacity>
      </>
    );
  };
  
  // Render signup step 2 (profile setup)
  const renderSignupStep2 = () => {
    return (
      <>
        <Text
          style={[
            styles.formTitle,
            { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
          ]}
        >
          Set Up Your Profile
        </Text>
        
        <TouchableOpacity
          style={styles.imagePickerContainer}
          onPress={pickImage}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.profileImage} />
          ) : (
            <View
              style={[
                styles.profileImagePlaceholder,
                { backgroundColor: theme === 'dark' ? '#4A5568' : '#E2E8F0' }
              ]}
            >
              <Text
                style={[
                  styles.profileImagePlaceholderText,
                  { color: theme === 'dark' ? '#A0AEC0' : '#718096' }
                ]}
              >
                Add Photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
              color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
              borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
            }
          ]}
          placeholder="Full Name"
          placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={[
            styles.input,
            { 
              backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
              color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
              borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
            }
          ]}
          placeholder="Phone Number"
          placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { 
                backgroundColor: 'transparent',
                borderColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5'
              }
            ]}
            onPress={() => setSignupStep(1)}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: theme === 'dark' ? '#4A6FA5' : '#4A6FA5' }
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.nextButton,
              { backgroundColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5' }
            ]}
            onPress={handleCompleteSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme === 'dark' ? '#1A202C' : '#F5F7FA' }
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logo,
              { backgroundColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5' }
            ]}
          >
            <Text style={styles.logoText}>N</Text>
          </View>
          <Text
            style={[
              styles.appName,
              { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
            ]}
          >
            NotesKeeping
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: theme === 'dark' ? '#A0AEC0' : '#718096' }
            ]}
          >
            Secure Notes, Your Way
          </Text>
        </View>

        <View style={styles.formContainer}>
          {isLogin ? (
            <>
              <Text
                style={[
                  styles.formTitle,
                  { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
                ]}
              >
                Login
              </Text>

              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                    color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
                    borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
                  }
                ]}
                placeholder="Email"
                placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={[
                  styles.input,
                  { 
                    backgroundColor: theme === 'dark' ? '#2D3748' : '#FFFFFF',
                    color: theme === 'dark' ? '#FFFFFF' : '#2D3748',
                    borderColor: theme === 'dark' ? '#4A5568' : '#E2E8F0'
                  }
                ]}
                placeholder="Password"
                placeholderTextColor={theme === 'dark' ? '#A0AEC0' : '#A0AEC0'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5' }
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            signupStep === 1 ? renderSignupStep1() : renderSignupStep2()
          )}

          <TouchableOpacity
            style={styles.switchContainer}
            onPress={() => {
              setIsLogin(!isLogin);
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setFullName('');
              setPhoneNumber('');
              setProfileImage(null);
              setSignupStep(1);
            }}
          >
            <Text
              style={[
                styles.switchText,
                { color: theme === 'dark' ? '#A0AEC0' : '#718096' }
              ]}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  switchText: {
    fontSize: 14,
  },
  skipContainer: {
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    width: '48%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    width: '48%',
  },
});

export default AuthScreen; 
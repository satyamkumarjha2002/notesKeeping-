import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useAppContext } from '../context/AppContext';

type PinEntryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PinEntry'>;

interface PinEntryScreenProps {
  navigation: PinEntryScreenNavigationProp;
}

// Fix TypeScript issues by casting components
const AnimatedView = Animated.View as any;
const AnimatedText = Animated.Text as any;

const PIN_LENGTH = 4;

const PinEntryScreen = ({ navigation }: PinEntryScreenProps) => {
  const { isPinSet, verifyPin, setPinCode, theme } = useAppContext();
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [confirmPin, setConfirmPin] = useState<string>('');
  
  // Check if PIN is set on component mount
  useEffect(() => {
    if (!isPinSet) {
      setIsSettingPin(true);
    }
  }, [isPinSet]);
  
  // Animation for pin dots
  const dotScale = React.useRef(Array(PIN_LENGTH).fill(0).map(() => new Animated.Value(1))).current;
  const dotOpacity = React.useRef(Array(PIN_LENGTH).fill(0).map(() => new Animated.Value(0.3))).current;
  
  // Handle PIN input
  const handleNumberPress = (number: string) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + number;
      setPin(newPin);
      
      // Animate the dot being filled
      Animated.parallel([
        Animated.sequence([
          Animated.timing(dotScale[newPin.length - 1], {
            toValue: 1.2,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(dotScale[newPin.length - 1], {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(dotOpacity[newPin.length - 1], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Check if PIN is complete
      if (newPin.length === PIN_LENGTH) {
        setTimeout(async () => {
          if (isSettingPin) {
            // Setting a new PIN
            if (!confirmPin) {
              // First entry, store for confirmation
              setConfirmPin(newPin);
              setErrorMessage('Please confirm your PIN');
              setShowError(true);
              setPin('');
              
              // Reset animation
              resetPinAnimation();
              
              setTimeout(() => {
                setShowError(false);
              }, 2000);
            } else {
              // Confirming PIN
              if (newPin === confirmPin) {
                // PINs match, save it
                try {
                  await setPinCode(newPin);
                  navigation.replace('Home');
                } catch (error) {
                  setErrorMessage('Failed to save PIN. Please try again.');
                  setShowError(true);
                  setPin('');
                  setConfirmPin('');
                  
                  // Reset animation
                  resetPinAnimation();
                  
                  setTimeout(() => {
                    setShowError(false);
                  }, 2000);
                }
              } else {
                // PINs don't match
                setErrorMessage('PINs do not match. Please try again.');
                setShowError(true);
                setPin('');
                setConfirmPin('');
                
                // Reset animation
                resetPinAnimation();
                
                setTimeout(() => {
                  setShowError(false);
                }, 2000);
              }
            }
          } else {
            // Verifying existing PIN
            const isValid = await verifyPin(newPin);
            
            if (isValid) {
              navigation.replace('Home');
            } else {
              setErrorMessage('Incorrect PIN. Please try again.');
              setShowError(true);
              setPin('');
              
              // Reset animation
              resetPinAnimation();
              
              setTimeout(() => {
                setShowError(false);
              }, 2000);
            }
          }
        }, 300);
      }
    }
  };
  
  // Reset PIN animation
  const resetPinAnimation = () => {
    dotOpacity.forEach((opacity, index) => {
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.sequence([
        Animated.timing(dotScale[index], {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(dotScale[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };
  
  // Handle delete button press
  const handleDelete = () => {
    if (pin.length > 0) {
      const newPin = pin.slice(0, -1);
      setPin(newPin);
      
      // Animate the dot being emptied
      Animated.timing(dotOpacity[pin.length - 1], {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };
  
  // Create the keypad
  const renderKeypad = () => {
    const keypadNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'delete'];
    
    return (
      <View style={styles.keypadContainer}>
        {keypadNumbers.map((number, index) => {
          if (number === '') {
            return <View key={index} style={styles.keypadButton} />;
          }
          
          if (number === 'delete') {
            return (
              <TouchableOpacity
                key={index}
                style={styles.keypadButton}
                onPress={handleDelete}
              >
                <Text 
                  style={[
                    styles.keypadDeleteText,
                    { color: theme === 'dark' ? '#A0AEC0' : '#718096' }
                  ]}
                >
                  ←
                </Text>
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.keypadButton}
              onPress={() => handleNumberPress(number.toString())}
            >
              <Text 
                style={[
                  styles.keypadText,
                  { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
                ]}
              >
                {number}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };
  
  // Render the PIN dots
  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {Array(PIN_LENGTH).fill(0).map((_, index) => (
          <AnimatedView
            key={index}
            style={[
              styles.pinDot,
              {
                opacity: dotOpacity[index],
                transform: [{ scale: dotScale[index] }],
                backgroundColor: theme === 'dark' ? '#4A6FA5' : '#4A6FA5',
              },
            ]}
          />
        ))}
      </View>
    );
  };
  
  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: theme === 'dark' ? '#1A202C' : '#F5F7FA' }
      ]}
    >
      <View style={styles.contentContainer}>
        <Text 
          style={[
            styles.welcomeText,
            { color: theme === 'dark' ? '#FFFFFF' : '#2D3748' }
          ]}
        >
          Welcome
        </Text>
        <Text 
          style={[
            styles.instructionText,
            { color: theme === 'dark' ? '#A0AEC0' : '#718096' }
          ]}
        >
          {isSettingPin 
            ? (confirmPin ? 'Confirm your PIN' : 'Create a PIN')
            : 'Enter your PIN'
          }
        </Text>
        
        {renderPinDots()}
        
        {showError && (
          <AnimatedText 
            style={styles.errorText}
          >
            {errorMessage}
          </AnimatedText>
        )}
      </View>
      
      {renderKeypad()}
      
      <View style={styles.lockIconContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const buttonSize = width / 5;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 30,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 18,
    marginBottom: 40,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  errorText: {
    color: '#E53E3E',
    marginTop: 20,
    fontSize: 16,
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  keypadButton: {
    width: buttonSize,
    height: buttonSize,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '500',
  },
  keypadDeleteText: {
    fontSize: 28,
  },
  lockIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  lockIcon: {
    fontSize: 24,
  },
});

export default PinEntryScreen; 
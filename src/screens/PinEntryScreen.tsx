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

type PinEntryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PinEntry'>;

interface PinEntryScreenProps {
  navigation: PinEntryScreenNavigationProp;
}

// Fix TypeScript issues by casting components
const AnimatedView = Animated.View as any;
const AnimatedText = Animated.Text as any;

// For demonstration purposes - in a real app, this would be securely stored
const DEMO_PIN = '1234';
const PIN_LENGTH = 4;

const PinEntryScreen = ({ navigation }: PinEntryScreenProps) => {
  const [pin, setPin] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState<boolean>(false);
  
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
        setTimeout(() => {
          if (newPin === DEMO_PIN) {
            navigation.replace('Home');
          } else {
            setErrorMessage('Incorrect PIN. Please try again.');
            setShowError(true);
            
            // Reset PIN and animate dots
            setPin('');
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
            
            // Hide error message after 2 seconds
            setTimeout(() => {
              setShowError(false);
            }, 2000);
          }
        }, 300);
      }
    }
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
                <Text style={styles.keypadDeleteText}>←</Text>
              </TouchableOpacity>
            );
          }
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.keypadButton}
              onPress={() => handleNumberPress(number.toString())}
            >
              <Text style={styles.keypadText}>{number}</Text>
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
              },
            ]}
          />
        ))}
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.instructionText}>Enter App PIN</Text>
        
        {renderPinDots()}
        
        {showError && (
          <AnimatedText style={styles.errorText}>
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
    backgroundColor: '#F5F7FA',
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
    color: '#2D3748',
  },
  instructionText: {
    fontSize: 18,
    color: '#718096',
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
    backgroundColor: '#4A6FA5',
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
    color: '#2D3748',
  },
  keypadDeleteText: {
    fontSize: 28,
    color: '#718096',
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
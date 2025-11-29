/**
 * Voice control utility for auction app
 * Allows voice commands to control the app
 */

// Voice commands that trigger spin
const SPIN_COMMANDS = [
  'spin',
  'next',
  'pick player',
  'pick a player',
  'select player',
  'next player',
  'spin wheel',
  'spin the wheel',
  'start spin',
  'auction',
  'start auction',
  'begin auction',
  'next auction',
  'auction player',
  'auction next player',
  'go',
  'continue',
  'proceed'
];

let recognition = null;
let isListening = false;
let onSpinCommand = null;

// Acknowledgment phrases
const ACKNOWLEDGMENTS = [
  'ok',
  "let's go",
  'sure',
  'got it',
  'right away',
  'on it',
  'absolutely',
  'perfect'
];

/**
 * Speak an acknowledgment response
 */
const speakAcknowledgment = () => {
  if (!('speechSynthesis' in window)) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  // Pick a random acknowledgment
  const acknowledgment = ACKNOWLEDGMENTS[Math.floor(Math.random() * ACKNOWLEDGMENTS.length)];
  
  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(acknowledgment);
    utterance.volume = 1.0;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ['Alex', 'Daniel', 'David', 'Mark'];
    let selectedVoice = null;
    
    for (const name of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (selectedVoice) break;
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        !v.name.toLowerCase().includes('female') &&
        !v.name.toLowerCase().includes('samantha') &&
        !v.name.toLowerCase().includes('zira')
      );
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }, 100);
};

/**
 * Initialize voice recognition
 */
export const initVoiceControl = (spinCallback) => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech recognition not supported in this browser');
    return false;
  }

  onSpinCommand = spinCallback;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript.toLowerCase().trim();
    
    // Voice command detected (voice control disabled, only announcements active)
    
    // Voice control for spin/auction has been disabled
    // Only announcements remain active
  };

  recognition.onerror = (event) => {
    console.error('[VOICE] Recognition error:', event.error);
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      // Restart listening on some errors
      if (isListening) {
        setTimeout(() => {
          if (isListening && recognition) {
            try {
              recognition.start();
            } catch (e) {
              console.warn('[VOICE] Could not restart recognition:', e);
            }
          }
        }, 1000);
      }
    }
  };

  recognition.onend = () => {
    if (isListening) {
      // Auto-restart if still listening
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('[VOICE] Could not restart recognition:', e);
          }
        }
      }, 500);
    }
  };

  return true;
};

/**
 * Start listening for voice commands
 */
export const startVoiceControl = () => {
  if (!recognition) {
    console.warn('[VOICE] Voice recognition not initialized');
    return false;
  }

  if (isListening) {
    // Already listening
    return true;
  }

  try {
    recognition.start();
    isListening = true;
    // Voice control started
    return true;
  } catch (e) {
    console.warn('[VOICE] Could not start recognition:', e);
    return false;
  }
};

/**
 * Stop listening for voice commands
 */
export const stopVoiceControl = () => {
  if (!recognition) return;

  try {
    recognition.stop();
    isListening = false;
    // Voice control stopped
  } catch (e) {
    console.warn('[VOICE] Could not stop recognition:', e);
  }
};

/**
 * Check if voice recognition is available
 */
export const isVoiceControlAvailable = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
};

/**
 * Check if currently listening
 */
export const isVoiceControlListening = () => {
  return isListening;
};


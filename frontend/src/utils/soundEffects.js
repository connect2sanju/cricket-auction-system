/**
 * Sound effects utility for auction app
 * Uses Web Audio API to generate sounds
 */

// Generate a continuous soothing, sweet spinning sound using Web Audio API
export const playSpinningSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a soothing, gentle spinning sound with soft tones
    const oscillators = [];
    
    // Create a soft, sweet spinning tone with gentle modulation
    for (let i = 0; i < 2; i++) {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Add a low-pass filter for a warmer, softer sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000 - (i * 300); // Softer, warmer frequencies
      filter.Q.value = 1; // Gentle resonance
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Use sine waves for a pure, sweet tone
      oscillator.type = 'sine';
      
      // Gentle, harmonious frequencies (musical intervals)
      const baseFreq = 220 + (i * 110); // A3 (220Hz) and A4 (330Hz) - pleasant harmony
      oscillator.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
      
      // Very gentle modulation for a subtle spinning effect
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 1.5 + (i * 0.3); // Slow, gentle modulation
      lfoGain.gain.value = 15 + (i * 5); // Subtle frequency variation
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      
      // Soft envelope - very gentle fade in
      const currentTime = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08 - (i * 0.02), currentTime + 0.5); // Very soft volume
      
      // Gradually decrease filter frequency for even softer sound
      filter.frequency.exponentialRampToValueAtTime(1500 - (i * 200), currentTime + 0.5);
      
      // Start LFO and oscillator
      lfo.start();
      oscillator.start();
      
      oscillators.push({ oscillator, lfo, gainNode, filter });
    }
    
    // Store in context for cleanup
    audioContext._oscillators = oscillators;
    
    return audioContext;
  } catch (error) {
    console.warn('Could not play spinning sound:', error);
    return null;
  }
};

// Stop the spinning sound smoothly
export const stopSpinningSound = (audioContext) => {
  if (!audioContext || !audioContext._oscillators) return;
  
  try {
    const currentTime = audioContext.currentTime;
    
    // Fade out all oscillators smoothly with gentle decay
    audioContext._oscillators.forEach(({ oscillator, lfo, gainNode, filter }) => {
      if (gainNode) {
        // Smooth, gentle fade out
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.4);
      }
      
      // Soften filter during fade out
      if (filter) {
        filter.frequency.exponentialRampToValueAtTime(500, currentTime + 0.4);
      }
      
      // Stop after fade out
      setTimeout(() => {
        try {
          if (oscillator) oscillator.stop();
          if (lfo) lfo.stop();
        } catch (e) {
          // Already stopped
        }
      }, 450);
    });
    
    // Close audio context after all sounds stop
    setTimeout(() => {
      try {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (e) {
        // Already closed
      }
    }, 500);
  } catch (error) {
    console.warn('Could not stop spinning sound:', error);
  }
};

// Play a sweet, soothing success/congratulations sound
export const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a sweet, harmonious chord (major chord - C, E, G)
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord - pleasant and sweet)
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Add a gentle low-pass filter for warmer, softer sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.7;
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine'; // Pure, sweet tone
      oscillator.frequency.value = freq;
      
      // Gentle, staggered notes for a pleasant arpeggio effect
      const startTime = audioContext.currentTime + (index * 0.08);
      
      // Soft envelope - gentle attack and decay
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.1); // Softer volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8); // Longer, gentler decay
      
      // Soften filter over time
      filter.frequency.exponentialRampToValueAtTime(2000, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.8);
    });
    
    return audioContext;
  } catch (error) {
    console.warn('Could not play success sound:', error);
    return null;
  }
};

// Play a click/tick sound
export const playTickSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.05);
    
    return audioContext;
  } catch (error) {
    console.warn('Could not play tick sound:', error);
    return null;
  }
};


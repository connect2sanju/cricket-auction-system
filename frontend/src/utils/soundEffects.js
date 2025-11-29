/**
 * Sound effects utility for auction app
 * Uses Web Audio API to generate sounds
 */

// Generate a stopwatch tick sound using Web Audio API
export const playSpinningSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Stopwatch tick configuration
    const tickInterval = 0.2; // Tick every 200ms (5 ticks per second)
    const tickDuration = 0.04; // Each tick lasts 40ms
    const baseFrequency = 1200; // Stopwatch-like frequency (crisp and clear)
    const tickVolume = 0.12;
    
    let nextTickTime = audioContext.currentTime;
    const scheduledTicks = [];
    
    // Create a function to play a single tick
    const playTick = (time) => {
      // Create oscillator for the tick
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Add a bandpass filter for a more mechanical, metallic stopwatch sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = baseFrequency + (Math.random() * 100 - 50); // Slight variation
      filter.Q.value = 3; // Narrow bandwidth for sharper sound
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Use a square wave for a more mechanical, digital stopwatch sound
      oscillator.type = 'square';
      oscillator.frequency.value = baseFrequency + (Math.random() * 100 - 50);
      
      // Sharp attack and quick decay for a crisp tick sound
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(tickVolume, time + 0.001); // Very quick attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + tickDuration); // Quick decay
      
      oscillator.start(time);
      oscillator.stop(time + tickDuration);
      
      scheduledTicks.push({ oscillator, gainNode, filter });
    };
    
    // Schedule multiple ticks ahead
    const scheduleTicks = () => {
      if (audioContext._isPlaying === false) return;
      
      // Schedule ticks for the next second (5 ticks)
      const now = audioContext.currentTime;
      for (let i = 0; i < 5; i++) {
        const tickTime = nextTickTime + (i * tickInterval);
        if (tickTime >= now - 0.1) { // Only schedule future ticks
          playTick(tickTime);
        }
      }
      
      nextTickTime += (5 * tickInterval);
      
      // Schedule next batch after a delay
      if (audioContext._isPlaying !== false) {
        setTimeout(scheduleTicks, 800); // Schedule next batch before current runs out
      }
    };
    
    // Store state in context for cleanup
    audioContext._isPlaying = true;
    audioContext._scheduledTicks = scheduledTicks;
    
    // Start scheduling ticks
    scheduleTicks();
    
    return audioContext;
  } catch (error) {
    console.warn('Could not play spinning sound:', error);
    return null;
  }
};

// Stop the stopwatch tick sound
export const stopSpinningSound = (audioContext) => {
  if (!audioContext) return;
  
  try {
    // Stop the ticking by setting the flag
    audioContext._isPlaying = false;
    
    // Stop any scheduled oscillators
    if (audioContext._scheduledTicks) {
      audioContext._scheduledTicks.forEach(({ oscillator, gainNode }) => {
        try {
          if (gainNode) {
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          }
          if (oscillator) {
            oscillator.stop(audioContext.currentTime + 0.01);
          }
        } catch (e) {
          // Already stopped
        }
      });
    }
    
    // Close audio context after a short delay to allow current tick to finish
    setTimeout(() => {
      try {
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (e) {
        // Already closed
      }
    }, 100);
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


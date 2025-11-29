/**
 * Voice announcement utility for player picking
 * Bulletproof single announcement implementation
 */

let activeAnnouncement = null;
let isSpeaking = false;
let lastAnnouncedPlayer = null;
let lastAnnounceTime = 0;
let pendingAnnouncements = new Set();

const ANNOUNCE_COOLDOWN = 5000; // Prevent repeating same player within 5 seconds

/**
 * Announce a player's name
 */
export const announcePlayer = (playerName) => {
  if (!playerName) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  const now = Date.now();

  // Prevent multiple same-player calls in queue
  if (pendingAnnouncements.has(playerName)) {
    return;
  }

  // Prevent duplicate play within cooldown
  if (lastAnnouncedPlayer === playerName && now - lastAnnounceTime < ANNOUNCE_COOLDOWN) {
    return;
  }

  pendingAnnouncements.add(playerName);

  // Cancel everything — full reset
  window.speechSynthesis.cancel();
  isSpeaking = false;

  if (activeAnnouncement) {
    if (activeAnnouncement.timeout) clearTimeout(activeAnnouncement.timeout);
    activeAnnouncement = null;
  }

  // Remove voice event listener
  window.speechSynthesis.onvoiceschanged = null;

  // Wait for cancellation
  setTimeout(() => {
    // Cancel again to ensure clean state
    window.speechSynthesis.cancel();
    isSpeaking = false;

    // Register new announcement
    activeAnnouncement = {
      playerName,
      startTime: Date.now(),
      hasSpoken: false,
      timeout: null
    };

    // The actual speak function (must run once)
    const doSpeak = () => {
      if (!activeAnnouncement) return;
      if (activeAnnouncement.playerName !== playerName) return;
      if (activeAnnouncement.hasSpoken || isSpeaking) return;

      activeAnnouncement.hasSpoken = true;
      isSpeaking = true;
      pendingAnnouncements.delete(playerName);

      lastAnnouncedPlayer = playerName;
      lastAnnounceTime = Date.now();

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance();
      utterance.text = `Next player is ${playerName}`;
      utterance.volume = 1.0;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = ['Alex', 'Daniel', 'David', 'Mark'];

      let selectedVoice = null;

      for (const name of preferredVoices) {
        selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
        if (selectedVoice) break;
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(
          v => v.lang.startsWith('en') &&
          !v.name.toLowerCase().includes('female') &&
          !v.name.toLowerCase().includes('samantha') &&
          !v.name.toLowerCase().includes('zira')
        );
      }

      if (selectedVoice) utterance.voice = selectedVoice;

      utterance.onend = () => {
        // Announcement completed
        isSpeaking = false;
        activeAnnouncement = null;
        pendingAnnouncements.delete(playerName);
      };

      utterance.onerror = () => {
        // Announcement error
        isSpeaking = false;
        activeAnnouncement = null;
        pendingAnnouncements.delete(playerName);
      };

      window.speechSynthesis.speak(utterance);
    };

    // --- FIXED VOICE LOADING LOGIC ---
    const voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      // Voices ready → speak once
      window.speechSynthesis.onvoiceschanged = null;
      doSpeak();
    } else {
      // Voice list not ready → wait ONCE
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };

      // Fallback in case event never fires
      activeAnnouncement.timeout = setTimeout(() => {
        if (
          activeAnnouncement &&
          activeAnnouncement.playerName === playerName &&
          !activeAnnouncement.hasSpoken &&
          !isSpeaking &&
          window.speechSynthesis.getVoices().length > 0
        ) {
          window.speechSynthesis.onvoiceschanged = null;
          doSpeak();
        }
      }, 500);
    }
    // --- END FIX ---

  }, 300);
};

/**
 * Announce captain
 */
export const announceCaptain = (captainName) => {
  if (!captainName) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();

  if (activeAnnouncement) {
    if (activeAnnouncement.timeout) clearTimeout(activeAnnouncement.timeout);
    activeAnnouncement = null;
  }

  setTimeout(() => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `Captain ${captainName}`;
    utterance.volume = 1.0;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ['Alex', 'Daniel', 'David', 'Mark'];
    let selectedVoice = null;

    for (const name of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(
        v => v.lang.startsWith('en') &&
        !v.name.toLowerCase().includes('female')
      );
    }

    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
  }, 200);
};

/**
 * Stop any ongoing announcement
 */
export const stopAnnouncement = () => {
  window.speechSynthesis.cancel();
  isSpeaking = false;

  if (activeAnnouncement) {
    if (activeAnnouncement.timeout) clearTimeout(activeAnnouncement.timeout);
    activeAnnouncement = null;
  }

  pendingAnnouncements.clear();
  window.speechSynthesis.onvoiceschanged = null;
};

/**
 * Announce player assignment congratulations
 */
export const announceAssignment = (playerName, captainName, price) => {
  if (!playerName || !captainName) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Wait a bit for any ongoing announcements to finish
  setTimeout(() => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance();
    utterance.text = `Congratulations! ${playerName} has been acquired by Captain ${captainName} for ${price} points!`;
    utterance.volume = 1.0;
    utterance.rate = 0.85;
    utterance.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = ['Alex', 'Daniel', 'David', 'Mark'];
    let selectedVoice = null;

    for (const name of preferredVoices) {
      selectedVoice = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'));
      if (selectedVoice) break;
    }

    if (!selectedVoice) {
      selectedVoice = voices.find(
        v => v.lang.startsWith('en') &&
        !v.name.toLowerCase().includes('female')
      );
    }

    if (selectedVoice) utterance.voice = selectedVoice;

    window.speechSynthesis.speak(utterance);
  }, 500);
};

/**
 * Voice availability check
 */
export const isVoiceAvailable = () => {
  return 'speechSynthesis' in window;
};

/**
 * Generate cricket-themed default player image
 * Creates an SVG-based cricket player avatar with player's initials
 */
export const getDefaultPlayerImage = (playerName, size = 200) => {
  const initials = getInitials(playerName);
  const colors = {
    bg: '#1a7a3e', // Cricket field green
    jersey: '#dc2626', // Cricket jersey red
    skin: '#fbbf24', // Golden skin tone
    text: '#ffffff'
  };

  return generateCricketPlayerSVG(initials, size, colors);
};

const getInitials = (name) => {
  if (!name) return 'P';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const generateCricketPlayerSVG = (initials, size, colors) => {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fieldGrad-${size}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f5d2a;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="jerseyGrad-${size}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.jersey};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#b91c1c;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background Circle -->
      <circle cx="100" cy="100" r="100" fill="url(#fieldGrad-${size})"/>
      
      <!-- Cricket Field Pattern -->
      <ellipse cx="100" cy="100" rx="85" ry="65" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      <line x1="100" y1="35" x2="100" y2="165" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
      
      <!-- Player Head -->
      <circle cx="100" cy="70" r="22" fill="${colors.skin}"/>
      
      <!-- Cricket Jersey -->
      <path d="M 85 92 L 85 145 L 115 145 L 115 92 Z" fill="url(#jerseyGrad-${size})"/>
      <rect x="90" y="92" width="20" height="53" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
      
      <!-- Player Initials on Jersey -->
      <text x="100" y="125" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
            fill="${colors.text}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
      
      <!-- Arms -->
      <path d="M 85 100 L 73 125 L 78 128 L 87 110 Z" fill="${colors.skin}"/>
      <path d="M 115 100 L 127 125 L 122 128 L 113 110 Z" fill="${colors.skin}"/>
      
      <!-- Cricket Bat -->
      <rect x="68" y="105" width="7" height="38" fill="#654321" transform="rotate(-18 71.5 124)"/>
      <rect x="66" y="103" width="11" height="7" fill="#8b5a2b" transform="rotate(-18 71.5 106.5)"/>
      
      <!-- Legs -->
      <rect x="90" y="145" width="8" height="30" fill="#1e3a8a"/>
      <rect x="102" y="145" width="8" height="30" fill="#1e3a8a"/>
      
      <!-- Cricket Ball -->
      <circle cx="118" cy="118" r="7" fill="#ffffff"/>
      <path d="M 114 118 Q 116 116 118 118 Q 120 120 122 118" stroke="${colors.jersey}" stroke-width="1.5" fill="none"/>
    </svg>
  `.trim();
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};


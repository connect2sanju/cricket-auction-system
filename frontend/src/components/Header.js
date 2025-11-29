import React, { useState } from 'react';
import './Header.css';
import shvLogo from '../assets/SHV_logo.png';

const Header = () => {
  const [logoError, setLogoError] = useState(false);
  
  const handleLogoError = (e) => {
    // If logo fails to load, show emoji instead
    setLogoError(true);
  };
  
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          {!logoError ? (
            <img 
              src={shvLogo} 
              alt="SHV Cricket Logo" 
              className="logo"
              onError={handleLogoError}
            />
          ) : (
            <div className="logo-emoji">🏏</div>
          )}
        </div>
        <h1>SHV Short Cricket – Season 9 Auction</h1>
        <p className="subtitle">Player Auction Assistant</p>
      </div>
    </header>
  );
};

export default Header;


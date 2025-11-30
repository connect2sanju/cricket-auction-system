import React, { useState, useEffect, useRef } from 'react';
import './Profile.css';

const Profile = ({ username, auctionName, onLogout, onShowConfig }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button
        className="profile-menu-trigger"
        onClick={() => setShowMenu(!showMenu)}
        title="Profile & Settings"
        aria-label="Profile & Settings"
      >
        <span className="menu-icon">⋮</span>
      </button>
      
      {showMenu && (
        <div className="profile-dropdown-menu">
          <div className="dropdown-header">
            <div className="dropdown-avatar">
              <span className="avatar-initials">{getInitials(username)}</span>
            </div>
            <div className="dropdown-info">
              <div className="dropdown-username">{username}</div>
              <div className="dropdown-auction">{auctionName || 'No Auction Selected'}</div>
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <button
            className="dropdown-menu-item"
            onClick={() => {
              setShowMenu(false);
              if (onShowConfig) onShowConfig();
            }}
          >
            <span className="menu-item-icon">⚙️</span>
            <span className="menu-item-text">Configuration</span>
          </button>
          
          <button
            className="dropdown-menu-item logout-item"
            onClick={() => {
              setShowMenu(false);
              if (onLogout) onLogout();
            }}
          >
            <span className="menu-item-icon">🚪</span>
            <span className="menu-item-text">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;


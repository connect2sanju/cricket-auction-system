import React, { useState, useRef } from 'react';
import './TeamStatus.css';
import { getDefaultPlayerImage } from '../utils/defaultPlayerImage';
import { announceCaptain } from '../utils/voiceAnnouncement';
import { fixImagePath } from '../utils/imagePath';

const TeamStatus = ({ teams, balances, captains, players, captainsPhotos = {}, minPlayersPerTeam = 9, initialPoints = 200 }) => {
  const [enlargedPhoto, setEnlargedPhoto] = useState(null);

  const handleCaptainPhotoClick = (captain, e) => {
    // Prevent default to avoid context menu
    e.preventDefault();
    e.stopPropagation();
    
    // Announce captain name
    announceCaptain(captain);
    
    // Enlarge the photo
    setEnlargedPhoto(captain);
    
    // Return to normal size after 2 seconds
    setTimeout(() => {
      setEnlargedPhoto(null);
    }, 2000);
  };
  const getStatusColor = (balance, initialPoints) => {
    if (initialPoints <= 0) {
      // Fallback if initialPoints is invalid
      if (balance > 100) return '#22c55e';
      if (balance > 50) return '#f59e0b';
      return '#dc2626';
    }
    
    // Calculate percentage remaining
    const percentageRemaining = (balance / initialPoints) * 100;
    
    // Color based on percentage:
    // Green: >50% remaining (less than 50% diluted/spent)
    // Yellow: 25-50% remaining (50-75% diluted/spent)
    // Red: <25% remaining (more than 75% diluted/spent)
    if (percentageRemaining > 50) return '#22c55e'; // Green
    if (percentageRemaining > 25) return '#f59e0b'; // Yellow
    return '#dc2626'; // Red
  };

  const getStatusEmoji = (balance, initialPoints) => {
    if (initialPoints <= 0) {
      // Fallback if initialPoints is invalid
      if (balance > 100) return '🟢';
      if (balance > 50) return '🟡';
      return '🔴';
    }
    
    // Calculate percentage remaining
    const percentageRemaining = (balance / initialPoints) * 100;
    
    // Emoji based on percentage:
    // Green: >50% remaining
    // Yellow: 25-50% remaining
    // Red: <25% remaining
    if (percentageRemaining > 50) return '🟢';
    if (percentageRemaining > 25) return '🟡';
    return '🔴';
  };

  const getPlayerPhoto = (playerName) => {
    const player = players.find(p => p.name === playerName);
    if (player?.photo) {
      return player.photo;
    }
    // Use cricket-themed default image
    return getDefaultPlayerImage(playerName, 100);
  };

  const getCaptainPhoto = (captainName) => {
    if (captainsPhotos && captainsPhotos[captainName]) {
      const photoPath = captainsPhotos[captainName];
      if (!photoPath || photoPath.trim() === '') {
        // Empty photo path, use default
        return getDefaultPlayerImage(captainName, 80);
      }
      // Fix image path for React (prepend PUBLIC_URL if needed)
      return fixImagePath(photoPath);
    }
    // Use cricket-themed default image for captains
    return getDefaultPlayerImage(captainName, 80);
  };

  return (
    <div className="team-status-container">
      {/* Enlarged Photo Modal */}
      {enlargedPhoto && (
        <div 
          className="enlarged-photo-modal"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="enlarged-photo-container" onClick={(e) => e.stopPropagation()}>
            <img
              src={getCaptainPhoto(enlargedPhoto)}
              alt={enlargedPhoto}
              className="enlarged-photo-image"
              onError={(e) => {
                e.target.src = getDefaultPlayerImage(enlargedPhoto, 200);
              }}
            />
            <div className="enlarged-photo-caption">{enlargedPhoto}</div>
          </div>
        </div>
      )}
      <div className="leaderboard-header">
        <h2 className="section-title">🏆 Leader Board</h2>
        <p className="section-subtitle">Team Standings & Squad Lineup</p>
      </div>
      <div className="teams-grid">
        {captains.map(captain => {
          const balance = balances[captain];
          const roster = teams[captain] || [];
          
          return (
            <div key={captain} className="team-card">
              <div className="team-header">
                <div className="captain-info">
                  <img
                    src={getCaptainPhoto(captain)}
                    alt={captain}
                    className={`captain-photo ${enlargedPhoto === captain ? 'enlarged' : ''}`}
                    onClick={(e) => handleCaptainPhotoClick(captain, e)}
                    onError={(e) => {
                      // Fallback to cricket default if image fails
                      e.target.src = getDefaultPlayerImage(captain, 80);
                    }}
                    title="Click to hear captain name"
                  />
                  <h3 className="team-captain">
                    {captain}
                  </h3>
                </div>
                <div className="team-balance" style={{ color: getStatusColor(balance, initialPoints) }}>
                  <span className="balance-emoji">{getStatusEmoji(balance, initialPoints)}</span>
                  <span className="balance-amount">₹ {balance}</span>
                </div>
              </div>
              
              <div className="team-count">
                👥 <span className="team-count-current">{roster.length}</span> / <span className="team-count-minimum">{minPlayersPerTeam}</span> cricketers
                {roster.length < minPlayersPerTeam && (
                  <span className="team-count-remaining"> ({minPlayersPerTeam - roster.length} remaining)</span>
                )}
              </div>

              <div className="team-roster">
                {roster.length > 0 ? (
                  roster.map((item, index) => (
                    <div key={index} className="roster-item">
                      <img
                        src={getPlayerPhoto(item.player)}
                        alt={item.player}
                        className="roster-photo"
                        onError={(e) => {
                          // Fallback to cricket default if image fails
                          e.target.src = getDefaultPlayerImage(item.player, 100);
                        }}
                      />
                      <div className="roster-info">
                        <div className="roster-name">{item.player}</div>
                        <div className="roster-price">₹{item.price}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-players">No cricketers in squad yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamStatus;


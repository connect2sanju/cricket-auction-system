import React, { useState, useEffect, useRef } from 'react';
import './Controls.css';
import { getDefaultPlayerImage } from '../utils/defaultPlayerImage';
import { playSpinningSound, playSuccessSound, stopSpinningSound } from '../utils/soundEffects';
import { announcePlayer, announceAssignment } from '../utils/voiceAnnouncement';
import { fixImagePath } from '../utils/imagePath';

const Controls = ({ 
  onPick, 
  onSkip, 
  hasCurrent, 
  isFetching,
  currentPlayer,
  captains,
  balances,
  minPrice,
  onAssign,
  players = [],
  captainsPhotos = {},
  remaining = [],
  teams = {},
  minPlayersPerTeam = 8
}) => {
  const [selectedCaptain, setSelectedCaptain] = useState('');
  const [price, setPrice] = useState(minPrice || 5);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [assignmentData, setAssignmentData] = useState(null);

  const affordable = captains ? captains.filter(c => balances && balances[c] >= (minPrice || 5)) : [];
  
  // Calculate maximum bid for each captain based on: balance - (players still needed - 1) * minPrice
  // Formula: Max Bid = Balance - (Players Still Needed - 1) * MinPrice
  // Each captain needs exactly 8 players (minPlayersPerTeam)
  // Example: If captain has 50 pts and already has 4 players:
  //   - Players still needed = 8 - 4 = 4
  //   - After buying current, (4 - 1) = 3 players still needed
  //   - Reserve = 3 * 5 = 15
  //   - Max bid = 50 - 15 = 35
  const calculateMaxBid = (captain) => {
    const balance = balances[captain] || 0;
    const basePrice = minPrice || 5; // Use base price from auction config
    
    // Count how many players this captain has already bought
    const teamRoster = teams[captain] || [];
    const playersAlreadyBought = Array.isArray(teamRoster) ? teamRoster.length : 0;
    
    // Calculate how many players captain still needs (minPlayersPerTeam total - already bought)
    const playersStillNeeded = Math.max(0, minPlayersPerTeam - playersAlreadyBought);
    
    // After buying the current player, captain will need (playersStillNeeded - 1) more players
    // Reserve enough for (playersStillNeeded - 1) players at base price
    const reserveCount = Math.max(0, playersStillNeeded - 1);
    const reservedForFuture = reserveCount * basePrice;
    
    const maxBid = balance - reservedForFuture;
    // Ensure max bid is at least basePrice (can't bid less than base price)
    return Math.max(basePrice, maxBid);
  };
  
  // Get players still needed for a captain
  const getPlayersStillNeeded = (captain) => {
    const teamRoster = teams[captain] || [];
    const playersAlreadyBought = Array.isArray(teamRoster) ? teamRoster.length : 0;
    return Math.max(0, minPlayersPerTeam - playersAlreadyBought);
  };
  
  // Get max bid for selected captain
  const getSelectedCaptainMaxBid = () => {
    if (!selectedCaptain) return 200; // Default max if no captain selected
    return calculateMaxBid(selectedCaptain);
  };
  
  // Helper functions to get photos for congratulations modal
  const getPlayerPhotoByName = (playerName) => {
    const player = players.find(p => p.name === playerName);
    if (player?.photo) {
      return player.photo;
    }
    return getDefaultPlayerImage(playerName, 150);
  };
  
  const getCaptainPhotoByName = (captainName) => {
    if (captainsPhotos && captainsPhotos[captainName]) {
      const photoPath = captainsPhotos[captainName];
      // Fix image path for React (prepend PUBLIC_URL if needed)
      return fixImagePath(photoPath);
    }
    return getDefaultPlayerImage(captainName, 120);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedCaptain) {
      setMessage('Please select a captain');
      return;
    }

    if (price < minPrice) {
      setMessage(`Minimum price is ${minPrice}`);
      return;
    }

    const maxBid = calculateMaxBid(selectedCaptain);
    
    if (price > balances[selectedCaptain]) {
      setMessage('Not enough balance for this captain!');
      return;
    }
    
    if (price > maxBid) {
      const remainingCount = Array.isArray(remaining) ? remaining.length : 0;
      setMessage(`Maximum bid is ₹${maxBid}. You need to reserve ₹${(remainingCount - 1) * (minPrice || 5)} for remaining ${remainingCount - 1} players.`);
      return;
    }

    setSubmitting(true);
    setMessage('');

    const success = await onAssign(selectedCaptain, price);
    
    if (success) {
      // Show congratulations before resetting form
      const playerName = currentPlayer?.name || 'Player';
      setAssignmentData({
        player: playerName,
        captain: selectedCaptain,
        price: price
      });
      setShowCongratulations(true);
      
      // Play success sound
      playSuccessSound();
      
      // Announce congratulations with voice
      announceAssignment(playerName, selectedCaptain, price);
      
      // Reset form after successful assignment
      setSelectedCaptain('');
      setPrice(minPrice || 5);
      setMessage('');
      
      // Note: Congratulations modal will stay open until manually closed
      
      // Note: Player will be cleared by backend, so spin box becomes available again
    }
    
    setSubmitting(false);
  };

  // Reset price when minPrice or selectedCaptain changes
  useEffect(() => {
    if (minPrice) {
      setPrice(minPrice);
    }
  }, [minPrice]);
  
  // Update price when captain changes to ensure it's within max bid
  useEffect(() => {
    if (selectedCaptain) {
      const maxBid = calculateMaxBid(selectedCaptain);
      if (price > maxBid) {
        setPrice(maxBid);
      }
    }
  }, [selectedCaptain]);

  const getPlayerPhoto = () => {
    if (currentPlayer?.photo) {
      return currentPlayer.photo;
    }
    return getDefaultPlayerImage(currentPlayer?.name || '', 280);
  };

  const spinningSoundRef = useRef(null);

  // Play spinning sound when fetching starts and continue until player is shown
  useEffect(() => {
    if (isFetching) {
      // Start the spinning sound loop
      if (!spinningSoundRef.current) {
        spinningSoundRef.current = playSpinningSound();
      }
    } else if (spinningSoundRef.current) {
      // Stop the sound when fetching ends (player is shown or error)
      stopSpinningSound(spinningSoundRef.current);
      spinningSoundRef.current = null;
    }
    
    // Cleanup on unmount
    return () => {
      if (spinningSoundRef.current) {
        stopSpinningSound(spinningSoundRef.current);
        spinningSoundRef.current = null;
      }
    };
  }, [isFetching]);

  return (
    <div className="controls-container">
      {/* Congratulations Modal */}
      {showCongratulations && assignmentData && (
        <div 
          className="congratulations-overlay"
          onClick={() => {
            setShowCongratulations(false);
            setAssignmentData(null);
          }}
        >
          <div 
            className="congratulations-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="congratulations-close"
              onClick={() => {
                setShowCongratulations(false);
                setAssignmentData(null);
              }}
              aria-label="Close"
            >
              ×
            </button>
            <div className="congratulations-content">
              <div className="congratulations-emoji">🎉</div>
              <h2 className="congratulations-title">Sold!</h2>
              
              <div className="congratulations-photos">
                <div className="congratulations-player-photo-container">
                  <img
                    src={getPlayerPhotoByName(assignmentData.player)}
                    alt={assignmentData.player}
                    className="congratulations-player-photo"
                    onError={(e) => {
                      e.target.src = getDefaultPlayerImage(assignmentData.player, 150);
                    }}
                  />
                  <p className="congratulations-photo-label">{assignmentData.player}</p>
                </div>
                
                <div className="congratulations-arrow">→</div>
                
                <div className="congratulations-captain-photo-container">
                  <img
                    src={getCaptainPhotoByName(assignmentData.captain)}
                    alt={assignmentData.captain}
                    className="congratulations-captain-photo"
                    onError={(e) => {
                      e.target.src = getDefaultPlayerImage(assignmentData.captain, 120);
                    }}
                  />
                  <p className="congratulations-photo-label">Captain {assignmentData.captain}</p>
                </div>
              </div>
              
              <p className="congratulations-price">for ₹{assignmentData.price}</p>
              <p className="congratulations-hint">Click outside or press × to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Spin Box - Main Attraction */}
      <div className="spin-button-hero">
        {!hasCurrent || isFetching ? (
          <button
            className={`btn-spin-hero ${isFetching ? 'spinning' : ''} ${!hasCurrent && !isFetching ? 'pulsing' : ''}`}
            onClick={onPick}
            disabled={isFetching}
          >
          <div className="spin-button-glow"></div>
          <div className="spin-button-sparkles">
            <span className="sparkle sparkle-1">✨</span>
            <span className="sparkle sparkle-2">⭐</span>
            <span className="sparkle sparkle-3">✨</span>
            <span className="sparkle sparkle-4">⭐</span>
            <span className="sparkle sparkle-5">✨</span>
          </div>
          <div className="spin-button-content">
            <div className="spin-icon-large">
              <svg viewBox="0 0 120 120" className="spin-wheel-large">
                {/* Outer rings */}
                <circle cx="60" cy="60" r="55" fill="none" stroke="url(#wheelGradient)" strokeWidth="4" opacity="0.9"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="url(#wheelGradient)" strokeWidth="2" opacity="0.6"/>
                {/* Wheel segments with gradient */}
                <defs>
                  <linearGradient id="wheelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                {/* 8 Segments for more detail */}
                <path d="M 60 10 A 45 45 0 0 1 95 30" fill="rgba(255,255,255,0.3)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 95 30 A 45 45 0 0 1 110 60" fill="rgba(255,255,255,0.2)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 110 60 A 45 45 0 0 1 95 90" fill="rgba(255,255,255,0.3)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 95 90 A 45 45 0 0 1 60 110" fill="rgba(255,255,255,0.2)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 60 110 A 45 45 0 0 1 25 90" fill="rgba(255,255,255,0.3)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 25 90 A 45 45 0 0 1 10 60" fill="rgba(255,255,255,0.2)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 10 60 A 45 45 0 0 1 25 30" fill="rgba(255,255,255,0.3)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                <path d="M 25 30 A 45 45 0 0 1 60 10" fill="rgba(255,255,255,0.2)" stroke="url(#wheelGradient)" strokeWidth="3"/>
                {/* Center hub */}
                <circle cx="60" cy="60" r="18" fill="url(#wheelGradient)" opacity="0.95">
                  <animate attributeName="r" values="18;20;18" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="60" cy="60" r="12" fill="#ffffff" opacity="0.9"/>
                {/* Spinner pointer - thicker and more visible */}
                <line x1="60" y1="60" x2="60" y2="18" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="1">
                  <animate attributeName="opacity" values="1;0.7;1" dur="1s" repeatCount="indefinite"/>
                </line>
                {/* Decorative dots */}
                <circle cx="60" cy="25" r="4" fill="#ffffff"/>
                <circle cx="85" cy="50" r="3" fill="#ffffff"/>
                <circle cx="60" cy="95" r="3" fill="#ffffff"/>
                <circle cx="35" cy="50" r="3" fill="#ffffff"/>
              </svg>
            </div>
            <div className="spin-text-large">
              {isFetching ? (
                <>
                  <span className="spin-text-main">🔄 AUCTIONING...</span>
                  <span className="spin-text-sub">Selecting player from auction pool</span>
                </>
              ) : (
                <>
                  <span className="spin-text-main">🏏 START AUCTION</span>
                  <span className="spin-text-sub">Click to auction next player</span>
                </>
              )}
            </div>
          </div>
        </button>
        ) : (
          <div className="spin-box-player-display">
            <div className="spin-box-header">
              <h3 className="spin-box-title">🏏 AUCTIONED PLAYER</h3>
            </div>
            <div className="spin-box-content">
              <div className="spin-box-player-photo">
                <img
                  src={getPlayerPhoto()}
                  alt={currentPlayer?.name || 'Player'}
                  className="spin-box-photo"
                  onError={(e) => {
                    e.target.src = getDefaultPlayerImage(currentPlayer?.name || '', 250);
                  }}
                />
              </div>
              <div className="spin-box-player-info">
                <h4 className="spin-box-player-name">{currentPlayer?.name || 'Unknown Player'}</h4>
                {affordable.length === 0 ? (
                  <div className="spin-box-warning">
                    ⚠️ No captain has ≥ ₹{minPrice || 5} balance left. Pass or reset auction.
                  </div>
                ) : (
                  <form onSubmit={handleAssignSubmit} className="spin-box-assign-form">
                    {/* First row: Captain Select and Price Input */}
                    <div className="spin-box-captain-row">
                      <select
                        value={selectedCaptain}
                        onChange={(e) => {
                          setSelectedCaptain(e.target.value);
                          // Reset price to min when captain changes
                          setPrice(minPrice || 5);
                          setMessage('');
                        }}
                        className="spin-box-select"
                        required
                      >
                        <option value="">-- Select Team Captain --</option>
                        {affordable.map(captain => {
                          const maxBid = calculateMaxBid(captain);
                          const playersNeeded = getPlayersStillNeeded(captain);
                          const teamRoster = teams[captain] || [];
                          const playersAlreadyBought = Array.isArray(teamRoster) ? teamRoster.length : 0;
                          return (
                            <option key={captain} value={captain}>
                              {captain} (₹{balances[captain]} | Max: ₹{maxBid} | Has: {playersAlreadyBought}/{minPlayersPerTeam})
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="number"
                        min={minPrice || 5}
                        max={selectedCaptain ? calculateMaxBid(selectedCaptain) : 200}
                        value={price}
                        onChange={(e) => {
                          const newPrice = parseInt(e.target.value) || minPrice || 5;
                          const maxBid = selectedCaptain ? calculateMaxBid(selectedCaptain) : 200;
                          setPrice(Math.min(newPrice, maxBid));
                        }}
                        className="spin-box-input"
                        placeholder="Enter Bid Price"
                        required
                      />
                    </div>
                    
                    {/* Max bid hint */}
                    {selectedCaptain && (() => {
                      const maxBid = calculateMaxBid(selectedCaptain);
                      const teamRoster = teams[selectedCaptain] || [];
                      const playersAlreadyBought = Array.isArray(teamRoster) ? teamRoster.length : 0;
                      const playersNeeded = getPlayersStillNeeded(selectedCaptain);
                      const reserveCount = Math.max(0, playersNeeded - 1);
                      const reservedAmount = reserveCount * (minPrice || 5);
                      return (
                        <div className="spin-box-max-bid-hint">
                          💰 Max Bid: ₹{maxBid} (Has {playersAlreadyBought}/{minPlayersPerTeam} players | Needs {playersNeeded} more | Reserving ₹{reservedAmount} for {reserveCount} remaining players at ₹{minPrice || 5} each)
                        </div>
                      );
                    })()}
                    
                    {/* Second row: Action Buttons */}
                    <div className="spin-box-buttons-row">
                      <button
                        type="submit"
                        className="spin-box-assign-btn"
                        disabled={submitting}
                      >
                        {submitting ? 'Bidding...' : '🏏 BID'}
                      </button>
                      <button
                        type="button"
                        className="spin-box-skip-btn"
                        onClick={onSkip}
                        disabled={isFetching}
                      >
                        ⏭️ Pass
                      </button>
                    </div>
                    
                    {message && (
                      <div className="spin-box-error">{message}</div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Controls;


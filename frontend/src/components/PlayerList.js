import React, { useState } from 'react';
import './PlayerList.css';
import { getDefaultPlayerImage } from '../utils/defaultPlayerImage';

const PlayerList = ({ players, remaining, teams }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'remaining', 'assigned'

  // Ensure remaining is always an array
  const remainingList = Array.isArray(remaining) ? remaining : [];
  const teamsObj = teams || {};

  const getPlayerPhoto = (player) => {
    if (player.photo) {
      return player.photo;
    }
    // Use cricket-themed default image
    return getDefaultPlayerImage(player.name, 150);
  };

  const getPlayerStatus = (playerName) => {
    // Safely check if player is in remaining list
    const isRemaining = remainingList.includes(playerName);
    if (isRemaining) return 'remaining';
    
    // Find which team has this player
    for (const [captain, roster] of Object.entries(teamsObj)) {
      if (Array.isArray(roster) && roster.some(item => item && item.player === playerName)) {
        const playerItem = roster.find(item => item && item.player === playerName);
        return { status: 'assigned', captain, price: playerItem?.price };
      }
    }
    return 'remaining';
  };

  const filteredPlayers = players.filter(player => {
    const status = getPlayerStatus(player.name);
    if (filter === 'all') return true;
    if (filter === 'remaining') return status === 'remaining';
    if (filter === 'assigned') return status !== 'remaining';
    return true;
  });

  return (
    <div className="player-list-container">
      <div className="player-list-header">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({players.length})
          </button>
          <button
            className={`filter-btn ${filter === 'remaining' ? 'active' : ''}`}
            onClick={() => setFilter('remaining')}
          >
            Remaining ({remainingList.length})
          </button>
          <button
            className={`filter-btn ${filter === 'assigned' ? 'active' : ''}`}
            onClick={() => setFilter('assigned')}
          >
            Assigned ({players.length - remainingList.length})
          </button>
        </div>
      </div>

      <div className="players-grid">
        {filteredPlayers.map((player, index) => {
          const status = getPlayerStatus(player.name);
          const isAssigned = status !== 'remaining';
          
          return (
            <div
              key={index}
              className={`player-card ${isAssigned ? 'assigned' : 'available'}`}
            >
              <img
                src={getPlayerPhoto(player)}
                alt={player.name}
                className="player-card-photo"
                onError={(e) => {
                  // Fallback to cricket default if image fails
                  e.target.src = getDefaultPlayerImage(player.name, 150);
                }}
              />
              <div className="player-card-info">
                <h4 className="player-card-name">{player.name}</h4>
                {isAssigned ? (
                  <div className="player-card-status assigned-status">
                    <span>✓ Assigned to {status.captain}</span>
                    <span className="player-card-price">₹{status.price}</span>
                  </div>
                ) : (
                  <div className="player-card-status available-status">
                    <span>⚪ Available</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerList;


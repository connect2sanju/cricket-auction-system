import React, { useState } from 'react';
import './CurrentPlayer.css';
import { getDefaultPlayerImage } from '../utils/defaultPlayerImage';

const CurrentPlayer = ({ player, captains, balances, minPrice, onAssign }) => {
  const [selectedCaptain, setSelectedCaptain] = useState('');
  const [price, setPrice] = useState(minPrice);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const affordable = captains.filter(c => balances[c] >= minPrice);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCaptain) {
      setMessage('Please select a captain');
      return;
    }

    if (price < minPrice) {
      setMessage(`Minimum price is ${minPrice}`);
      return;
    }

    if (price > balances[selectedCaptain]) {
      setMessage('Not enough balance for this captain!');
      return;
    }

    setSubmitting(true);
    setMessage('');

    const success = await onAssign(selectedCaptain, price);
    
    if (success) {
      setSelectedCaptain('');
      setPrice(minPrice);
    }
    
    setSubmitting(false);
  };

const getPlayerPhoto = () => {
    if (player.photo) {
      return player.photo;
    }
    // Use cricket-themed default image
    return getDefaultPlayerImage(player.name, 200);
  };

  return (
    <div className="current-player-container">
      <div className="current-player-card">
        <div className="player-photo-section">
          <img
            src={getPlayerPhoto()}
            alt={player.name}
            className="player-photo"
            onError={(e) => {
              // Fallback to cricket default if image fails
              e.target.src = getDefaultPlayerImage(player.name, 200);
            }}
          />
        </div>
        
        <div className="player-info-section">
          <h2 className="current-player-title">🏏 Current Player</h2>
          <h3 className="current-player-name">{player.name}</h3>

          {affordable.length === 0 ? (
            <div className="warning-message">
              ⚠️ No captain has ≥ {minPrice} points left. You can skip players or reset the auction.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="assign-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Select Captain</label>
                  <select
                    value={selectedCaptain}
                    onChange={(e) => setSelectedCaptain(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">-- Select Captain --</option>
                    {affordable.map(captain => (
                      <option key={captain} value={captain}>
                        {captain} (Balance: {balances[captain]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Enter Price</label>
                  <input
                    type="number"
                    min={minPrice}
                    max={200}
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value) || minPrice)}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>&nbsp;</label>
                  <button
                    type="submit"
                    className="btn-assign"
                    disabled={submitting}
                  >
                    {submitting ? 'Assigning...' : '✓ Confirm Assignment'}
                  </button>
                </div>
              </div>

              {message && (
                <div className="error-message">{message}</div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurrentPlayer;


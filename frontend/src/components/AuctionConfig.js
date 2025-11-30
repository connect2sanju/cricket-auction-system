import React, { useState, useEffect } from 'react';
import './AuctionConfig.css';
import axios from 'axios';
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuctionConfig = ({ username, onConfigComplete, currentAuctionId }) => {
  const [auctionSeason, setAuctionSeason] = useState('');
  const [basePrice, setBasePrice] = useState(5);
  const [teamSize, setTeamSize] = useState(8);
  const [initialPoints, setInitialPoints] = useState(200);
  const [playersFile, setPlayersFile] = useState(null);
  const [captainsFile, setCaptainsFile] = useState(null);
  const [existingAuctions, setExistingAuctions] = useState([]);
  const [selectedAuctionId, setSelectedAuctionId] = useState(currentAuctionId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(!currentAuctionId);

  useEffect(() => {
    fetchAuctions();
    if (currentAuctionId) {
      fetchAuctionConfig(currentAuctionId);
    }
  }, [currentAuctionId]);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auctions`);
      setExistingAuctions(response.data.auctions || []);
    } catch (err) {
      logger.error('Failed to fetch auctions', err);
    }
  };

  const fetchAuctionConfig = async (auctionId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/auctions/${auctionId}/config`);
      const config = response.data;
      setAuctionSeason(config.season_name || '');
      setBasePrice(config.base_price || 5);
      setTeamSize(config.team_size || 8);
      setInitialPoints(config.initial_points || 200);
      setSelectedAuctionId(auctionId);
      setShowCreate(false);
    } catch (err) {
      logger.error('Failed to fetch auction config', err);
      setError('Failed to load auction configuration');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayersFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/yaml' && file.type !== 'application/x-yaml' && !file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        setError('Please select a YAML file (.yaml or .yml)');
        return;
      }
      setPlayersFile(file);
      setError(null);
    }
  };

  const handleCaptainsFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'text/yaml' && file.type !== 'application/x-yaml' && !file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
        setError('Please select a YAML file (.yaml or .yml)');
        return;
      }
      setCaptainsFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!auctionSeason.trim()) {
      setError('Please enter an auction season name');
      return;
    }

    if (basePrice < 1) {
      setError('Base price must be at least 1');
      return;
    }

    if (teamSize < 1) {
      setError('Team size must be at least 1');
      return;
    }

    if (initialPoints < 1) {
      setError('Initial points must be at least 1');
      return;
    }

    if (!playersFile && !selectedAuctionId) {
      setError('Please upload a players YAML file or select an existing auction');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('season_name', auctionSeason.trim());
      formData.append('base_price', basePrice);
      formData.append('team_size', teamSize);
      formData.append('initial_points', initialPoints);
      if (playersFile) {
        formData.append('players_file', playersFile);
      }
      if (captainsFile) {
        formData.append('captains_file', captainsFile);
      }

      let response;
      if (selectedAuctionId && !showCreate) {
        // Update existing auction
        response = await axios.put(`${API_BASE_URL}/auctions/${selectedAuctionId}/config`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        logger.info(`Auction updated: ${selectedAuctionId}`);
      } else {
        // Create new auction
        response = await axios.post(`${API_BASE_URL}/auctions`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        logger.info(`Auction created: ${response.data.auction_id}`);
      }

      await fetchAuctions();
      onConfigComplete(response.data.auction_id, {
        season_name: auctionSeason.trim(),
        base_price: basePrice
      });
    } catch (err) {
      logger.error('Failed to create/update auction', err);
      setError(err.response?.data?.error || 'Failed to create auction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuctionSelect = (auctionId) => {
    setSelectedAuctionId(auctionId);
    setShowCreate(false);
    fetchAuctionConfig(auctionId);
  };

  const handleNewAuction = () => {
    setShowCreate(true);
    setSelectedAuctionId('');
    setAuctionSeason('');
    setBasePrice(5);
    setTeamSize(8);
    setInitialPoints(200);
    setPlayersFile(null);
    setCaptainsFile(null);
    setError(null);
  };

  const handleDeleteAuction = async (auctionId) => {
    if (!window.confirm(`Are you sure you want to delete auction "${existingAuctions.find(a => a.auction_id === auctionId)?.season_name || auctionId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.delete(`${API_BASE_URL}/auctions/${auctionId}`);
      
      if (response.data.success) {
        logger.info(`Auction deleted: ${auctionId}`);
        
        // If deleted auction was selected, clear selection
        if (selectedAuctionId === auctionId) {
          setSelectedAuctionId('');
          setAuctionSeason('');
          setBasePrice(5);
        }
        
        // Refresh auction list
        await fetchAuctions();
      } else {
        setError('Failed to delete auction');
      }
    } catch (err) {
      logger.error('Failed to delete auction', err);
      setError(err.response?.data?.error || 'Failed to delete auction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !auctionSeason) {
    return (
      <div className="auction-config-container">
        <div className="config-loading">
          <div className="spinner"></div>
          <p>Loading auction configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auction-config-container">
      <div className="auction-config-box">
        <div className="config-header">
          <h2>⚙️ Configure Auction</h2>
          <p>Welcome, <strong>{username}</strong>! Set up your auction settings.</p>
        </div>

        {error && (
          <div className="config-error">
            {error}
          </div>
        )}

        <div className="config-tabs">
          <button
            className={`tab-button ${!showCreate ? 'active' : ''}`}
            onClick={() => {
              setShowCreate(false);
              fetchAuctions(); // Refresh auction list when switching to select mode
            }}
          >
            📋 Select Existing Auction
          </button>
          <button
            className={`tab-button ${showCreate ? 'active' : ''}`}
            onClick={handleNewAuction}
          >
            ➕ Create New Auction
          </button>
        </div>

        {!showCreate && (
          <div className="existing-auctions">
            {existingAuctions.length > 0 ? (
              <>
                <h3>Available Auctions:</h3>
                <div className="auction-list">
                  {existingAuctions.map((auction) => (
                    <div
                      key={auction.auction_id}
                      className={`auction-item-wrapper ${selectedAuctionId === auction.auction_id ? 'active' : ''}`}
                    >
                      <button
                        className={`auction-item ${selectedAuctionId === auction.auction_id ? 'active' : ''}`}
                        onClick={() => handleAuctionSelect(auction.auction_id)}
                      >
                        <span className="auction-name">{auction.season_name || auction.auction_id}</span>
                        <span className="auction-info">
                          Base Price: ₹{auction.base_price || 5}
                        </span>
                      </button>
                      <button
                        className="auction-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAuction(auction.auction_id);
                        }}
                        title="Delete this auction"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-auctions-message">
                <p>📭 No existing auctions found.</p>
                <p>Click "Create New Auction" to get started.</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="config-form">
          <div className="form-group">
            <label htmlFor="season">Auction Season Name *</label>
            <input
              id="season"
              type="text"
              value={auctionSeason}
              onChange={(e) => setAuctionSeason(e.target.value)}
              placeholder="e.g., Season 9, Tournament 2024"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="basePrice">Base Price (₹) *</label>
            <input
              id="basePrice"
              type="number"
              min="1"
              value={basePrice}
              onChange={(e) => setBasePrice(parseInt(e.target.value) || 5)}
              className="form-input"
              required
              disabled={loading}
            />
            <small>Minimum bid price for any player</small>
          </div>

          <div className="form-group">
            <label htmlFor="teamSize">Team Size (Players per Team) *</label>
            <input
              id="teamSize"
              type="number"
              min="1"
              max="20"
              value={teamSize}
              onChange={(e) => setTeamSize(parseInt(e.target.value) || 8)}
              className="form-input"
              required
              disabled={loading}
            />
            <small>Number of players each captain needs (excluding the captain)</small>
          </div>

          <div className="form-group">
            <label htmlFor="initialPoints">Initial Points (Allotted Points) *</label>
            <input
              id="initialPoints"
              type="number"
              min="1"
              value={initialPoints}
              onChange={(e) => setInitialPoints(parseInt(e.target.value) || 200)}
              className="form-input"
              required
              disabled={loading}
            />
            <small>Starting budget for each captain</small>
          </div>

          {showCreate && (
            <>
              <div className="form-group">
                <label htmlFor="playersFile">Players YAML File *</label>
                <input
                  id="playersFile"
                  type="file"
                  accept=".yaml,.yml"
                  onChange={handlePlayersFileChange}
                  className="form-input-file"
                  disabled={loading}
                  required={showCreate}
                />
                <small>Upload players.yaml with player names and photos</small>
                {playersFile && (
                  <div className="file-selected">
                    ✓ {playersFile.name}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="captainsFile">Captains YAML File (Optional)</label>
                <input
                  id="captainsFile"
                  type="file"
                  accept=".yaml,.yml"
                  onChange={handleCaptainsFileChange}
                  className="form-input-file"
                  disabled={loading}
                />
                <small>Upload captains.yaml with captain names and photos</small>
                {captainsFile && (
                  <div className="file-selected">
                    ✓ {captainsFile.name}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="config-submit-btn"
              disabled={loading || !auctionSeason.trim()}
            >
              {loading ? 'Saving...' : (showCreate ? 'Create Auction' : 'Update & Continue')}
            </button>
            {!showCreate && selectedAuctionId && (
              <button
                type="button"
                className="config-continue-btn"
                onClick={() => onConfigComplete(selectedAuctionId, {
                  season_name: auctionSeason || existingAuctions.find(a => a.auction_id === selectedAuctionId)?.season_name,
                  base_price: basePrice || existingAuctions.find(a => a.auction_id === selectedAuctionId)?.base_price
                })}
              >
                Continue with Selected Auction
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuctionConfig;


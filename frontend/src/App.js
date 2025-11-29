import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Header from './components/Header';
import Stats from './components/Stats';
import TeamStatus from './components/TeamStatus';
import PlayerListModal from './components/PlayerListModal';
import Controls from './components/Controls';
import logger from './utils/logger';
import { announcePlayer, stopAnnouncement } from './utils/voiceAnnouncement';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  // Set background image on component mount
  useEffect(() => {
    const backgroundImage = `${process.env.PUBLIC_URL || ''}/images/backgrounds/stadium-background.png`;
    document.body.style.backgroundImage = `url(${backgroundImage})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    
    // Cleanup on unmount
    return () => {
      document.body.style.backgroundImage = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    };
  }, []);
  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [fetchingPlayer, setFetchingPlayer] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const previousPlayerRef = useRef(null); // Track previous player for voice announcement
  const announcementTimerRef = useRef(null); // Track announcement timer to prevent duplicates

  const fetchStatus = useCallback(async () => {
    try {
      logger.debug('Fetching auction status');
      const response = await axios.get(`${API_BASE_URL}/status`);
      setStatus(response.data);
      setError(null);
      logger.debug('Status fetched successfully', response.data);
    } catch (err) {
      const errorMsg = 'Failed to fetch auction status';
      setError(errorMsg);
      logger.error(errorMsg, err);
    }
  }, []);

  const fetchPlayers = useCallback(async () => {
    try {
      logger.debug('Fetching players list');
      const response = await axios.get(`${API_BASE_URL}/players`);
      setPlayers(response.data.players);
      logger.debug(`Players fetched: ${response.data.players.length} players`);
    } catch (err) {
      logger.error('Failed to fetch players', err);
    }
  }, []);

  useEffect(() => {
    logger.info('App initialized');
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchPlayers()]);
      setLoading(false);
    };
    loadData();
    
    // Refresh status every 2 seconds
    const interval = setInterval(fetchStatus, 2000);
    return () => {
      clearInterval(interval);
      logger.info('App cleanup');
    };
  }, [fetchStatus, fetchPlayers]);

  // Define handlePick first using useCallback
  const handlePick = useCallback(async () => {
    try {
      logger.info('Picking next player');
      setFetchingPlayer(true);
      
      const response = await axios.post(`${API_BASE_URL}/pick`);
      
      // Wait for backend delay (backend has 2.5s delay) + a bit more for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2800));
      
      await fetchStatus();
      setFetchingPlayer(false);
      logger.info('Player picked successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to pick player';
      setError(errorMsg);
      setFetchingPlayer(false);
      logger.error('Failed to pick player', err);
    }
  }, [fetchStatus]); // Include fetchStatus in deps


  // Announce player name AFTER it's displayed on screen
  useEffect(() => {
    // Only announce when:
    // 1. There's a current player
    // 2. It's different from the previous one
    // 3. We're not currently fetching (player is already displayed)
    if (status?.current && status.current !== previousPlayerRef.current && !fetchingPlayer) {
      const playerToAnnounce = status.current;
      
      // CRITICAL: Clear any existing timer first
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = null;
      }
      
      // CRITICAL: Update ref IMMEDIATELY to prevent duplicate triggers (even from StrictMode)
      // Do this synchronously before any async operations
      if (previousPlayerRef.current === playerToAnnounce) {
        // Already set, skip to prevent duplicate
        logger.debug(`Player ${playerToAnnounce} already announced, skipping`);
        return;
      }
      previousPlayerRef.current = playerToAnnounce;
      
      // Stop any existing announcements FIRST
      stopAnnouncement();
      
      // Wait to ensure player name is displayed before announcing
      announcementTimerRef.current = setTimeout(() => {
        // Verify player hasn't changed and ref still matches
        if (status?.current === playerToAnnounce && previousPlayerRef.current === playerToAnnounce) {
          // Announce only once
          logger.debug(`Triggering single announcement for: ${playerToAnnounce}`);
          announcePlayer(playerToAnnounce);
        }
        announcementTimerRef.current = null;
      }, 1800); // Slightly longer delay
      
      return () => {
        if (announcementTimerRef.current) {
          clearTimeout(announcementTimerRef.current);
          announcementTimerRef.current = null;
        }
      };
    }
  }, [status?.current, fetchingPlayer]);

  const handleSkip = async () => {
    try {
      logger.info('Skipping current player');
      setFetchingPlayer(true);
      
      const response = await axios.post(`${API_BASE_URL}/skip`);
      
      // Wait for backend delay (backend has 2.5s delay) + a bit more for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2800));
      
      await fetchStatus();
      setFetchingPlayer(false);
      logger.info('Player skipped successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to skip player';
      setError(errorMsg);
      setFetchingPlayer(false);
      logger.error('Failed to skip player', err);
    }
  };

  const handleAssign = async (captain, price) => {
    try {
      logger.info(`Assigning player to ${captain} for ${price} points`);
      await axios.post(`${API_BASE_URL}/assign`, { captain, price });
      await fetchStatus();
      
      // Clear previous player reference after assignment
      previousPlayerRef.current = null;
      
      logger.info('Player assigned successfully');
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to assign player';
      setError(errorMsg);
      logger.error('Failed to assign player', err);
      return false;
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset the auction? This will clear all teams and balances.')) {
      try {
        logger.warn('Resetting auction');
        await axios.post(`${API_BASE_URL}/reset`);
        await fetchStatus();
        logger.info('Auction reset successfully');
      } catch (err) {
        setError('Failed to reset auction');
        logger.error('Failed to reset auction', err);
      }
    }
  };

  const handleExport = async () => {
    try {
      logger.info('Exporting auction results');
      const response = await axios.get(`${API_BASE_URL}/export?format=csv`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `SHV_Auction_Results_${timestamp}.csv`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      logger.info('Export completed successfully');
    } catch (err) {
      setError('Failed to export results');
      logger.error('Failed to export', err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading auction data...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="error-container">
        <p>Failed to load auction data. Please check if the backend server is running.</p>
      </div>
    );
  }

  const currentPlayerData = players.find(p => p.name === status.current);
  
  // Check if auction is complete (all players assigned)
  const totalAssigned = status?.assigned || 0;
  const totalPlayers = status?.totalPlayers || 0;
  const isAuctionComplete = totalPlayers > 0 && totalAssigned >= totalPlayers && 
                            (!status?.current) && 
                            (!status?.remaining || status.remaining.length === 0);

  return (
    <div className="App">
      <Header />
      
      {error && (
        <div className="error-banner" onClick={() => setError(null)}>
          {error} (click to dismiss)
        </div>
      )}

      <div className="container">
        <Stats status={status} />
        
        <Controls
          onPick={handlePick}
          onSkip={handleSkip}
          onReset={handleReset}
          hasCurrent={!!status.current}
          onShowPlayers={() => setShowPlayerList(true)}
          isFetching={fetchingPlayer}
          currentPlayer={currentPlayerData || (status.current ? { name: status.current, photo: '' } : null)}
          captains={status.captains || []}
          balances={status.balances || {}}
          minPrice={status.minPrice || 5}
          onAssign={handleAssign}
          players={players}
          captainsPhotos={status.captainsPhotos || {}}
          remaining={Array.isArray(status.remaining) ? status.remaining : []}
          teams={status.teams || {}}
          minPlayersPerTeam={status.minPlayersPerTeam || 8}
        />

        <TeamStatus
          teams={status.teams}
          balances={status.balances}
          captains={status.captains}
          players={players}
          captainsPhotos={status.captainsPhotos || {}}
          minPlayersPerTeam={status.minPlayersPerTeam || 9}
        />

        <PlayerListModal
          isOpen={showPlayerList}
          onClose={() => setShowPlayerList(false)}
          players={players}
          remaining={Array.isArray(status.remaining) ? status.remaining : []}
          teams={status.teams || {}}
        />
      </div>

      {/* Completion Banner */}
      {isAuctionComplete && (
        <div className="completion-banner">
          <div className="completion-content">
            <h2>🎉 Auction Complete!</h2>
            <p>All players have been assigned. You can now export the results.</p>
            <button
              className="btn btn-success btn-export"
              onClick={handleExport}
            >
              📥 Export Results (CSV)
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="bottom-controls">
        <button
          className="btn btn-info"
          onClick={() => setShowPlayerList(true)}
        >
          👥 View All Players
        </button>

        <button
          className="btn btn-export-small"
          onClick={handleExport}
          title="Export auction results to CSV"
        >
          📥 Export
        </button>

        {showReset && (
          <button
            className="btn btn-danger"
            onClick={handleReset}
          >
            🔄 Reset Auction
          </button>
        )}

        <button
          className="admin-toggle"
          onClick={() => setShowReset(!showReset)}
          title="Show/Hide Reset Button"
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}

export default App;


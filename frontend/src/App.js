import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import Header from './components/Header';
import Stats from './components/Stats';
import TeamStatus from './components/TeamStatus';
import PlayerListModal from './components/PlayerListModal';
import Controls from './components/Controls';
import Login from './components/Login';
import AuctionConfig from './components/AuctionConfig';
import Profile from './components/Profile';
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
  // Authentication and auction management
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('auction_username') || null;
  });
  const [currentAuctionId, setCurrentAuctionId] = useState(() => {
    return localStorage.getItem('auction_id') || null;
  });
  const [auctionConfig, setAuctionConfig] = useState(null);
  const [showConfig, setShowConfig] = useState(false);

  const handleLogin = (user) => {
    setUsername(user);
    // Check if user has an existing auction
    const savedAuctionId = localStorage.getItem('auction_id');
    if (savedAuctionId) {
      setCurrentAuctionId(savedAuctionId);
      setShowConfig(false);
    } else {
      setShowConfig(true);
    }
  };

  const handleConfigComplete = (auctionId, config) => {
    setCurrentAuctionId(auctionId);
    setAuctionConfig(config);
    setShowConfig(false);
    localStorage.setItem('auction_id', auctionId);
    logger.info(`Auction configured: ${auctionId}`);
    fetchStatus(auctionId);
  };

  const handleLogout = () => {
    setUsername(null);
    setCurrentAuctionId(null);
    setAuctionConfig(null);
    setShowConfig(false);
    localStorage.removeItem('auction_username');
    localStorage.removeItem('auction_id');
    logger.info('User logged out');
  };

  const [status, setStatus] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [fetchingPlayer, setFetchingPlayer] = useState(false);
  const previousPlayerRef = useRef(null); // Track previous player for voice announcement
  const announcementTimerRef = useRef(null); // Track announcement timer to prevent duplicates

  const fetchStatus = useCallback(async (auctionId = null) => {
    try {
      const targetAuctionId = auctionId || currentAuctionId;
      if (!targetAuctionId) return;
      
      logger.debug(`Fetching auction status for auction: ${targetAuctionId}`);
      const response = await axios.get(`${API_BASE_URL}/status`, {
        params: { auction_id: targetAuctionId }
      });
      setStatus(response.data);
      setError(null);
      logger.debug('Status fetched successfully', response.data);
    } catch (err) {
      const errorMsg = 'Failed to fetch auction status';
      setError(errorMsg);
      logger.error(errorMsg, err);
    }
  }, [currentAuctionId]);

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
    if (username && currentAuctionId && !showConfig) {
      logger.info('App initialized');
      const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchStatus(currentAuctionId), fetchPlayers()]);
        setLoading(false);
      };
      loadData();
      
      // Refresh status every 2 seconds for current auction
      const interval = setInterval(() => fetchStatus(currentAuctionId), 2000);
      return () => {
        clearInterval(interval);
        logger.info('App cleanup');
      };
    }
  }, [fetchStatus, fetchPlayers, currentAuctionId, username, showConfig]);

  // Define handlePick first using useCallback
  const handlePick = useCallback(async () => {
    try {
      logger.info(`Picking next player for auction: ${currentAuctionId}`);
      setFetchingPlayer(true);
      
      const response = await axios.post(`${API_BASE_URL}/pick`, {
        auction_id: currentAuctionId
      });
      
      // Wait for backend delay (backend has 2.5s delay) + a bit more for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2800));
      
      await fetchStatus(currentAuctionId);
      setFetchingPlayer(false);
      logger.info('Player picked successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to pick player';
      setError(errorMsg);
      setFetchingPlayer(false);
      logger.error('Failed to pick player', err);
    }
  }, [fetchStatus, currentAuctionId]); // Include fetchStatus and currentAuctionId in deps


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
      logger.info(`Skipping current player for auction: ${currentAuctionId}`);
      setFetchingPlayer(true);
      
      const response = await axios.post(`${API_BASE_URL}/skip`, {
        auction_id: currentAuctionId
      });
      
      // Wait for backend delay (backend has 2.5s delay) + a bit more for smooth transition
      await new Promise(resolve => setTimeout(resolve, 2800));
      
      await fetchStatus(currentAuctionId);
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
      logger.info(`Assigning player to ${captain} for ${price} points in auction: ${currentAuctionId}`);
      await axios.post(`${API_BASE_URL}/assign`, { 
        captain, 
        price,
        auction_id: currentAuctionId
      });
      await fetchStatus(currentAuctionId);
      
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
    if (window.confirm(`Are you sure you want to reset the auction "${auctionConfig?.season_name || currentAuctionId}"? This will clear all teams and balances.`)) {
      try {
        logger.warn(`Resetting auction: ${currentAuctionId}`);
        await axios.post(`${API_BASE_URL}/reset`, {
          auction_id: currentAuctionId
        });
        await fetchStatus(currentAuctionId);
        logger.info('Auction reset successfully');
      } catch (err) {
        setError('Failed to reset auction');
        logger.error('Failed to reset auction', err);
      }
    }
  };

  const handleUndo = async () => {
    const lastAssignment = status?.lastAssignment;
    let confirmMessage = 'Are you sure you want to undo the last action? This will restore the previous state.';
    
    if (lastAssignment) {
      confirmMessage = `Are you sure you want to undo the last bid?\n\n` +
        `Player: ${lastAssignment.player}\n` +
        `Captain: ${lastAssignment.captain}\n` +
        `Price: ₹${lastAssignment.price}\n\n` +
        `This will restore the balance and remove this assignment.`;
    }
    
    if (window.confirm(confirmMessage)) {
      try {
        logger.info(`Undoing last assignment for auction: ${currentAuctionId}`, lastAssignment);
        await axios.post(`${API_BASE_URL}/undo`, {
          auction_id: currentAuctionId
        });
        await fetchStatus(currentAuctionId);
        logger.info('Assignment undone successfully');
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed to undo action';
        setError(errorMsg);
        if (err.response?.status !== 404) {
          logger.error('Failed to undo action', err);
        } else {
          // No backup available - show friendly message
          alert('No previous state available to undo. Undo is only available after making assignments.');
        }
      }
    }
  };

  const handleExport = async () => {
    try {
      logger.info(`Exporting auction results for auction: ${currentAuctionId}`);
      const response = await axios.get(`${API_BASE_URL}/export?format=csv&auction_id=${currentAuctionId}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp and auction_id
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      link.setAttribute('download', `SHV_Auction_Results_${currentAuctionId}_${timestamp}.csv`);
      
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

  // Show login screen if not logged in
  if (!username) {
    return <Login onLogin={handleLogin} />;
  }

  // Show config screen if logged in but no auction configured
  if (showConfig || !currentAuctionId) {
    return (
      <AuctionConfig
        username={username}
        onConfigComplete={handleConfigComplete}
        currentAuctionId={currentAuctionId}
      />
    );
  }

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

      <Profile
        username={username}
        auctionName={auctionConfig?.season_name || currentAuctionId}
        onLogout={handleLogout}
        onShowConfig={() => setShowConfig(true)}
      />
      
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
          minPlayersPerTeam={status.minPlayersPerTeam || 8}
          initialPoints={status.initialPoints || 200}
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

      {/* Bottom Action Bar */}
      <div className="bottom-action-bar">
        <div className="action-bar-content">
          <button
            className="action-btn action-btn-primary"
            onClick={() => setShowPlayerList(true)}
            title="View all players"
          >
            <span className="action-icon">👥</span>
            <span className="action-label">View Players</span>
          </button>

          <button
            className="action-btn action-btn-success"
            onClick={handleExport}
            title="Export auction results to CSV"
          >
            <span className="action-icon">📥</span>
            <span className="action-label">Export</span>
          </button>

          <button
            className={`action-btn action-btn-secondary ${status?.lastAssignment ? '' : 'disabled'}`}
            onClick={handleUndo}
            disabled={!status?.lastAssignment}
            title={status?.lastAssignment 
              ? `Undo last bid: ${status.lastAssignment.player} → ${status.lastAssignment.captain} for ₹${status.lastAssignment.price}`
              : 'No recent bid to undo'}
          >
            <span className="action-icon">↩️</span>
            <span className="action-label">
              {status?.lastAssignment 
                ? `Undo Last Bid`
                : 'Undo'}
            </span>
          </button>

          <button
            className="action-btn action-btn-danger"
            onClick={handleReset}
            title="Reset auction"
          >
            <span className="action-icon">🔄</span>
            <span className="action-label">Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;


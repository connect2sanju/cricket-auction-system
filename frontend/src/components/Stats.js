import React from 'react';
import './Stats.css';

const Stats = ({ status }) => {
  const totalPlayers = status?.totalPlayers || 0;
  const remaining = Array.isArray(status?.remaining) 
    ? status.remaining.length 
    : (status?.remainingCount || status?.remaining || 0);
  const assigned = status?.assigned || 0;
  const skipped = status?.skippedCount || 0;
  const progress = totalPlayers > 0 ? Math.round((assigned / totalPlayers) * 100) : 0;
  const initialPoints = status?.initialPoints || 200;

  return (
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-icon">👤</div>
        <div className="stat-content">
          <div className="stat-value">{totalPlayers}</div>
          <div className="stat-label">Total Players</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">⚪</div>
        <div className="stat-content">
          <div className="stat-value">{remaining}</div>
          <div className="stat-label">Remaining in Pool</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">✓</div>
        <div className="stat-content">
          <div className="stat-value">{assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">⏭️</div>
        <div className="stat-content">
          <div className="stat-value">{skipped}</div>
          <div className="stat-label">Skipped</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-value">{progress}%</div>
          <div className="stat-label">Progress</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-content">
          <div className="stat-value">₹{initialPoints}</div>
          <div className="stat-label">Initial Points</div>
        </div>
      </div>
    </div>
  );
};

export default Stats;


import React from 'react';
import './PlayerListModal.css';
import PlayerList from './PlayerList';

const PlayerListModal = ({ isOpen, onClose, players, remaining, teams }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 All Players</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <PlayerList 
            players={players}
            remaining={remaining}
            teams={teams}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerListModal;


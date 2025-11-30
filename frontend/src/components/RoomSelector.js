import React, { useState, useEffect } from 'react';
import './RoomSelector.css';
import axios from 'axios';
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DEFAULT_ROOM = 'default';

const RoomSelector = ({ currentRoomId, onRoomChange }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`);
      setRooms(response.data.rooms || []);
      
      // If no rooms exist, create default room
      if (response.data.rooms.length === 0) {
        await createRoom('Default Room');
      }
    } catch (err) {
      logger.error('Failed to fetch rooms', err);
    }
  };

  const createRoom = async (roomName = null) => {
    try {
      setCreating(true);
      const data = roomName ? { room_name: roomName } : { room_name: newRoomName };
      const response = await axios.post(`${API_BASE_URL}/rooms`, data);
      
      logger.info(`Room created: ${response.data.room_id}`);
      await fetchRooms();
      onRoomChange(response.data.room_id);
      setShowCreateForm(false);
      setNewRoomName('');
    } catch (err) {
      logger.error('Failed to create room', err);
      alert('Failed to create room. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleRoomSelect = (roomId) => {
    onRoomChange(roomId);
  };

  return (
    <div className="room-selector-container">
      <div className="room-selector-header">
        <h3>🏠 Auction Room</h3>
        <button
          className="room-create-btn"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Room'}
        </button>
      </div>

      {showCreateForm && (
        <div className="room-create-form">
          <input
            type="text"
            placeholder="Enter room name (e.g., Season 9 Auction)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newRoomName.trim()) {
                createRoom();
              }
            }}
            className="room-name-input"
          />
          <button
            onClick={() => createRoom()}
            disabled={!newRoomName.trim() || creating}
            className="room-create-submit-btn"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      )}

      <div className="room-list">
        {rooms.length === 0 ? (
          <div className="room-empty">
            <p>No rooms available. Create a new room to start.</p>
          </div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.room_id}
              className={`room-item ${currentRoomId === room.room_id ? 'active' : ''}`}
              onClick={() => handleRoomSelect(room.room_id)}
            >
              <span className="room-icon">🏏</span>
              <span className="room-name">{room.name}</span>
              {currentRoomId === room.room_id && (
                <span className="room-active-indicator">✓</span>
              )}
            </button>
          ))
        )}
      </div>

      {currentRoomId && (
        <div className="current-room-info">
          <strong>Current Room:</strong> {rooms.find(r => r.room_id === currentRoomId)?.name || currentRoomId}
          <div className="room-share-info">
            📋 Share this Room ID: <code>{currentRoomId}</code>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomSelector;


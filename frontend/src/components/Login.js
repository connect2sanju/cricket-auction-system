import React, { useState } from 'react';
import './Login.css';
import axios from 'axios';
import logger from '../utils/logger';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }

    setLoggingIn(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username: username.trim(),
        password: password.trim()
      });
      
      if (response.data.success) {
        localStorage.setItem('auction_username', username.trim());
        logger.info(`User logged in: ${username.trim()}`);
        onLogin(username.trim());
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      logger.error('Login failed', err);
      if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🏏 SHV Cricket Auction</h1>
          <p>Sign in to continue</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
          
          <div className="login-input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              className="login-input"
              autoFocus
              disabled={loggingIn}
              required
            />
          </div>
          
          <div className="login-input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              className="login-input"
              disabled={loggingIn}
              required
            />
          </div>
          
          <button
            type="submit"
            className="login-button"
            disabled={!username.trim() || !password.trim() || loggingIn}
          >
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;


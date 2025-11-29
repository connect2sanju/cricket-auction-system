# 📝 Logging System Documentation

## Overview

The application includes comprehensive logging for both backend and frontend to help debug issues and monitor activity.

## Backend Logging (Flask)

### Log Files

All logs are stored in the `logs/` directory:

- **`logs/auction.log`** - Complete application log (all levels)
- **`logs/errors.log`** - Error-only log (ERROR level)

### Log Rotation

- Logs automatically rotate when they reach **10MB**
- Keeps **5 backup files** (auction.log.1, auction.log.2, etc.)
- Prevents disk space issues

### Log Levels

- **DEBUG** - Detailed debugging information
  - API requests/responses
  - Player picks, skips, assignments
  - State changes
  
- **INFO** - General informational messages
  - Server startup
  - Successful operations
  - Important events (player assignments, auction resets)
  
- **WARN** - Warning messages
  - Invalid requests
  - Edge cases (no players left, insufficient balance)
  
- **ERROR** - Error messages
  - Exceptions
  - Failed operations
  - Critical issues

### What Gets Logged

✅ **All API Requests**
- Method, path, IP address
- Request parameters

✅ **All API Responses**
- Status codes
- Response times

✅ **Player Operations**
- Player picks
- Player skips
- Player assignments (with details)
- Auction resets

✅ **Errors & Exceptions**
- Full stack traces
- Error context
- Request details

✅ **State Changes**
- Balance updates
- Team roster changes
- Remaining player count

### Example Log Entries

```
2025-11-28 20:15:30 - app - INFO - SHV Cricket Auction API Server Started
2025-11-28 20:15:30 - app - DEBUG - Request: GET /api/status - IP: 127.0.0.1
2025-11-28 20:15:30 - app - INFO - Player picked: Arunendu (Remaining: 42)
2025-11-28 20:15:45 - app - INFO - ✅ ASSIGNED: Arunendu -> Amit for 50 points (Balance: 200 -> 150)
2025-11-28 20:16:00 - app - ERROR - Error in assign_player: Invalid captain
```

## Frontend Logging (React)

### Console Logging

Frontend logs are displayed in the browser console:
- Open Developer Tools (F12)
- Go to Console tab
- All logs are prefixed with timestamp and level

### Log Levels

- **DEBUG** - Detailed debugging (development only)
- **INFO** - General information
- **WARN** - Warnings
- **ERROR** - Errors (also sent to backend in production)

### What Gets Logged

✅ **API Calls**
- Request details
- Response data
- Errors

✅ **User Actions**
- Player picks
- Player skips
- Player assignments
- Auction resets

✅ **Errors**
- Network errors
- API errors
- Component errors

### Production Mode

In production, critical errors are automatically sent to the backend `/api/log` endpoint for centralized logging.

## Viewing Logs

### Real-time Monitoring

```bash
# Watch all logs
tail -f logs/auction.log

# Watch only errors
tail -f logs/errors.log

# Watch with timestamps highlighted
tail -f logs/auction.log | grep --color=always -E "ERROR|WARN|INFO|DEBUG"
```

### Search Logs

```bash
# Find all player assignments
grep "ASSIGNED" logs/auction.log

# Find all errors
grep "ERROR" logs/auction.log

# Find specific player
grep "Arunendu" logs/auction.log

# Find auction resets
grep "RESET" logs/auction.log

# Find requests from specific IP
grep "127.0.0.1" logs/auction.log
```

### Filter by Date

```bash
# Find logs from today
grep "$(date +%Y-%m-%d)" logs/auction.log

# Find logs from specific date
grep "2025-11-28" logs/auction.log
```

### Count Events

```bash
# Count total assignments
grep -c "ASSIGNED" logs/auction.log

# Count errors
grep -c "ERROR" logs/auction.log

# Count API requests
grep -c "Request:" logs/auction.log
```

## Debugging Common Issues

### Issue: API not responding

```bash
# Check if server started
grep "Server Started" logs/auction.log

# Check for errors
tail -20 logs/errors.log

# Check recent requests
tail -50 logs/auction.log | grep "Request:"
```

### Issue: Player assignment failed

```bash
# Find assignment attempts
grep "Assignment request" logs/auction.log

# Find validation errors
grep "Insufficient balance\|Invalid captain\|Minimum price" logs/auction.log
```

### Issue: Frontend errors

1. Open browser console (F12)
2. Check for error messages
3. Look for network errors in Network tab
4. Check backend logs for corresponding errors

## Log File Management

### Automatic Cleanup

Logs rotate automatically, but you can manually manage them:

```bash
# View log file sizes
ls -lh logs/

# Archive old logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/*.log*

# Clear old rotated logs (keep current)
rm logs/*.log.*
```

### Log Retention

- Current logs: Always kept
- Rotated logs: 5 backups (configurable in code)
- Old backups: Manual cleanup recommended

## Configuration

### Backend Log Level

Edit `backend/app.py`:

```python
# Change log level
app.logger.setLevel(logging.INFO)  # Only INFO and above
app.logger.setLevel(logging.DEBUG)  # All logs (default)
```

### Frontend Log Level

Edit `frontend/src/utils/logger.js`:

```javascript
// Change log level
this.level = LOG_LEVELS.INFO;  // Only INFO and above
this.level = LOG_LEVELS.DEBUG;  // All logs (default)
```

## Best Practices

1. **Check logs first** when debugging issues
2. **Monitor error.log** for critical problems
3. **Use grep** to find specific events
4. **Archive logs** periodically for historical reference
5. **Don't commit logs** to git (already in .gitignore)

## Troubleshooting

### Logs not being created?

- Check if `logs/` directory exists
- Check file permissions
- Check disk space

### Too many logs?

- Increase log rotation size
- Change log level to INFO or WARN
- Implement log filtering

### Logs too verbose?

- Set log level to INFO or WARN
- Disable DEBUG logging in production


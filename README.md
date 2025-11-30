# 🏏 SHV Cricket Auction System

A **modern, multi-user React-based live auction web application** for managing cricket team formation. Features user authentication, configurable auctions, real-time bidding, balance tracking, and team management with beautiful UI, player photos, and captain photos support.

---

## ✨ Key Features

### 🔐 User Authentication & Management
- Secure login system with username and password
- Environment variable-based authentication (secure for deployment)
- Support for multiple users with role-based access
- Profile section with auction information

### ⚙️ Configurable Auctions
- **Multiple independent auctions** - Each user can create and manage their own auctions
- **Auction Season Name** - Customize season/tournament name
- **Base Price** - Configurable minimum bid price per auction
- **Team Size** - Set minimum players required per team
- **Initial Points** - Configure starting balance for each captain
- **Players & Captains Files** - Upload custom YAML files per auction
- **Create, Update, Delete** - Full auction lifecycle management

### 🎯 Player Pool Management
- Dynamic player count loaded from `players.yaml`
- Enhanced stats showing: Total Players, Remaining in Pool, Assigned, Skipped, Progress percentage, and Initial Points
- Player photos support with fallback avatars
- Automatic exclusion of captains from player list

### 🧢 Captains & Teams
- Multiple captains with configurable initial balance
- Each captain builds their team through bidding
- Configurable minimum players per team
- Visual team status with captain and player photos
- Leaderboard showing team standings and squad lineup
- Real-time balance tracking with status indicators (🟢 >100 | 🟡 >50 | 🔴 ≤50)

### 🔀 Player Picking & Bidding
- Random player selection with smooth animations
- Option to **Skip Player** and pick another
- Beautiful player card display with photos
- Voice announcements for player names
- **Max Bid Calculation** - Shows maximum allowed bid based on:
  - Current balance
  - Players still needed
  - Base price
  - Formula: `Balance - (Players Still Needed - 1) × Base Price`

### 💰 Auction Assignment
- Configurable minimum bid price
- Price cannot exceed captain's balance or max bid
- Automatic balance deduction after assignment
- Real-time validation and error messages

### 📊 Team Status & Leaderboard
- Real-time captain balance tracking
- Player count per team (current/minimum)
- Team roster with assigned prices and photos
- Captain photos in leaderboard cards
- Click captain photos to hear name announcements

### 🖼️ Photo Support
- Player photos from `players.yaml`
- Captain photos from `captains.yaml`
- Automatic avatar generation for players/captains without photos
- Photos displayed in all relevant views

### 🛑 Validations & Safety
- No captain selection → Error shown
- Price below minimum or above max bid → Error shown
- Captains with insufficient balance disabled
- State persistence with automatic save/load
- **Undo Functionality** - Rollback the last bid/assignment if needed

### 🔄 Auction Management
- **Reset Auction** - Complete reset of all data, balances, and teams
- **Undo Last Bid** - Rollback the most recent assignment
- Fresh start with all players back in pool
- State persistence across sessions

### 📤 Export Functionality
- Export auction results to CSV format
- Timestamped file downloads
- Complete team and player assignment data

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+ and npm

### Installation

**Start both servers at once:**
```bash
./start_all.sh
```

This will automatically:
- Start the backend API on `http://localhost:5000`
- Start the React frontend on `http://localhost:3000`
- Open the app in your browser

**Or start servers separately:**
```bash
# Terminal 1 - Backend
./start_backend.sh

# Terminal 2 - Frontend  
./start_frontend.sh
```

### First Time Setup

1. **Login** - Use your credentials (see [Deployment Guide](#-deployment) for setting up users)
2. **Configure Auction** - Click the profile menu (three dots) → Configuration
3. **Create New Auction** - Set:
   - Season name
   - Base price
   - Team size
   - Initial points
   - Upload players and captains YAML files
4. **Start Auction** - Begin picking and bidding on players

---

## 🌐 Deployment

Ready to deploy your app online?

**📖 Complete Deployment Guide:** See [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md) for step-by-step instructions on deploying to Render.

### Quick Deployment Checklist

1. **Backend Deployment:**
   - Set environment variables (user credentials, CORS, etc.)
   - Configure build and start commands
   - Deploy as Web Service

2. **Frontend Deployment:**
   - Set `REACT_APP_API_URL` environment variable
   - Configure build command
   - Deploy as Static Site

3. **Connect Frontend to Backend:**
   - Update backend `ALLOWED_ORIGINS` with frontend URL
   - Test the connection

See the deployment guide for detailed instructions.

---

## 📂 Project Structure

```
📦 SHV_Tournament
 ├── 📁 backend/
 │   ├── 📜 app.py              # Flask API server
 │   ├── 📜 user_manager.py     # User authentication management
 │   ├── 📜 requirements.txt    # Python dependencies
 │   └── 📜 users.json.example  # Example user credentials format
 ├── 📁 frontend/
 │   ├── 📁 public/             # Static files
 │   │   ├── 📁 images/
 │   │   │   ├── 📁 players/    # Player photos
 │   │   │   ├── 📁 captains/   # Captain photos
 │   │   │   └── 📁 backgrounds/
 │   │   └── index.html
 │   ├── 📁 src/
 │   │   ├── 📁 components/     # React components
 │   │   │   ├── Login.js       # Login screen
 │   │   │   ├── AuctionConfig.js # Auction configuration
 │   │   │   ├── Profile.js     # User profile menu
 │   │   │   ├── Header.js
 │   │   │   ├── Stats.js
 │   │   │   ├── Controls.js
 │   │   │   ├── CurrentPlayer.js
 │   │   │   ├── TeamStatus.js
 │   │   │   └── PlayerList.js
 │   │   ├── 📁 utils/          # Utility functions
 │   │   ├── App.js             # Main React component
 │   │   └── index.js           # React entry point
 │   └── 📜 package.json        # Node dependencies
 ├── 📁 data/                   # Runtime data (auto-generated)
 │   ├── auctions/              # Auction configurations
 │   └── rooms/                 # Auction state files
 ├── 📜 players.yaml            # Default player data
 ├── 📜 captains.yaml           # Default captain data
 ├── 📜 Procfile                # Render deployment config
 ├── 📜 runtime.txt             # Python version for deployment
 ├── 📜 .gitignore              # Git ignore rules
 └── 📜 README.md               # This file
```

---

## 🧑‍💻 Development

### Backend API Endpoints

**Authentication:**
- `POST /api/login` - User login
- `GET /api/users` - List users (admin only)

**Auction Management:**
- `POST /api/auctions` - Create new auction
- `GET /api/auctions` - List all auctions
- `GET /api/auctions/<auction_id>/config` - Get auction configuration
- `PUT /api/auctions/<auction_id>/config` - Update auction configuration
- `DELETE /api/auctions/<auction_id>` - Delete auction

**Auction Operations:**
- `GET /api/status?auction_id=<id>` - Get current auction status
- `GET /api/players?auction_id=<id>` - Get all players list
- `POST /api/pick?auction_id=<id>` - Pick a random player
- `POST /api/skip?auction_id=<id>` - Skip current player
- `POST /api/assign?auction_id=<id>` - Assign player to captain
- `POST /api/reset?auction_id=<id>` - Reset auction
- `POST /api/undo?auction_id=<id>` - Undo last assignment
- `GET /api/export?auction_id=<id>&format=csv` - Export teams data

**Root:**
- `GET /` - API information and available endpoints

### Frontend Components

- **Login** - User authentication screen
- **AuctionConfig** - Create and configure auctions
- **Profile** - User profile menu (three-dot menu)
- **Header** - Multi-color gradient header with logo
- **Stats** - Player count statistics (Total, Remaining, Assigned, Skipped, Progress %, Initial Points)
- **Controls** - Pick player, skip player, bid, pass, reset, and undo buttons
- **CurrentPlayer** - Current player display with bidding form
- **TeamStatus** - Leaderboard with team cards and rosters
- **PlayerList** - Grid view of all players with filters

---

## ⚙️ Configuration

### User Credentials

For **local development**, create `backend/users.json`:
```json
{
  "users": [
    {
      "username": "admin",
      "password": "your_password",
      "role": "admin"
    }
  ]
}
```

For **production deployment**, use environment variables:
- `AUCTION_ADMIN_USER` - Admin username
- `AUCTION_ADMIN_PASSWORD` - Admin password
- `AUCTION_USERS` - JSON array of users (optional)

See deployment guide for details.

### Auction Configuration

Each auction can be configured with:
- **Season Name** - Display name for the auction
- **Base Price** - Minimum bid price (default: 5)
- **Team Size** - Minimum players per team (default: 8)
- **Initial Points** - Starting balance per captain (default: 200)
- **Players File** - Custom `players.yaml` file
- **Captains File** - Custom `captains.yaml` file
- **Captains List** - List of captain names

### Data Files

- `players.yaml` - Default player list with names and photo paths
- `captains.yaml` - Default captain list with names and photo paths
- `data/auctions/<auction_id>_config.json` - Auction-specific configuration
- `data/auctions/<auction_id>_players.yaml` - Auction-specific players
- `data/auctions/<auction_id>_captains.yaml` - Auction-specific captains
- `data/rooms/<room_id>_state.json` - Auction state (auto-generated)

---

## 📝 Adding Player & Captain Photos

### Player Photos

Update `players.yaml`:
```yaml
players:
  - name: Player Name
    photo: "/images/players/Player_Name.jpeg"
  - name: Another Player
    photo: ""  # Empty for auto-generated avatar
```

**Photo file naming:** Use underscores (e.g., `Amit_Roy.jpeg`) to match player names.

### Captain Photos

Update `captains.yaml`:
```yaml
captains:
  - name: Anshu
    photo: "/images/captains/Anshu.png"
```

**Supported formats:** JPG, JPEG, PNG. Place files in `frontend/public/images/players/` or `frontend/public/images/captains/`.

---

## 🎨 Features in Detail

### Max Bid Calculation

The system automatically calculates the maximum bid a captain can make:
```
Max Bid = Balance - (Players Still Needed - 1) × Base Price
```

This ensures captains always have enough points to complete their team.

### Undo Functionality

If a bid is assigned by mistake:
1. Click **"Undo Last Bid"** button
2. The last assignment is rolled back
3. Player returns to the pool
4. Captain's balance is restored

### State Persistence

- Auction state automatically saved after each action
- State persists across server restarts
- Backup files created before state changes
- Each auction maintains its own isolated state

---

## 🔮 Future Enhancements

- [x] Multi-user authentication
- [x] Configurable auctions
- [x] Undo functionality
- [x] Max bid calculation
- [x] Initial points configuration
- [ ] WebSocket support for real-time updates
- [ ] Player statistics and history
- [ ] Manual player assignment (search by name)
- [ ] Auction history and replay
- [ ] Email notifications

---

## 📄 License

This project is for internal use by SHV Cricket Association.

---

## 📞 Support

For deployment help, see [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md).

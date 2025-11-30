# 🏏 SHV Short Cricket Season 9 — Players Auction

A **React-based live auction web app** for managing cricket team formation in the SHV Cricket Association.  
This modern web application allows random player picking, bidding, balance tracking, and team management in real time with beautiful UI, player photos, and captain photos support.

---

## ✨ Features

- 🎯 **Player Pool Management**  
  - 48 players (excluding captains) loaded from `players.yaml`  
  - Enhanced stats showing: Total Players, Remaining in Pool, Assigned, Skipped, and Progress percentage
  - Player photos support with fallback avatars
  - Automatic exclusion of captains from player list

- 🧢 **Captains & Teams**  
  - 6 captains with initial balance of 200 points each  
  - Each captain builds their team through bidding  
  - Minimum 8 players per team required (8 players + 1 captain = 9 total)
  - Visual team status with captain and player photos
  - Leaderboard showing team standings and squad lineup

- 🔀 **Player Picking**  
  - Random player selection with smooth animations
  - Option to **Skip Player** and pick another  
  - Beautiful player card display with photos
  - Voice announcements for player names

- 💰 **Auction Assignment**  
  - Minimum bid: **5 points**  
  - Price cannot exceed captain's balance  
  - Automatic balance deduction after assignment  
  - Real-time balance status indicators (🟢 >100 | 🟡 >50 | 🔴 ≤50)

- 📊 **Team Status & Leaderboard**  
  - Real-time captain balance tracking
  - Player count per team (current/minimum)
  - Team roster with assigned prices and photos
  - Captain photos in leaderboard cards
  - Click captain photos to hear name announcements

- 🖼️ **Photo Support**  
  - Player photos from `players.yaml`
  - Captain photos from `captains.yaml`
  - Automatic avatar generation for players/captains without photos
  - Photos displayed in all relevant views

- 🛑 **Validations & Safety**  
  - No captain selection → Error shown  
  - Price below minimum or above balance → Error shown  
  - Captains with insufficient balance disabled  
  - State persistence with automatic save/load

- 🔄 **Reset Auction**  
  - Complete reset of all data, balances, and teams  
  - Fresh start with all players back in pool
  - Start fresh anytime  

- 📤 **Export Functionality**
  - Export auction results to CSV format
  - Timestamped file downloads
  - Complete team and player assignment data

---

## 🚀 Installation & Usage

### Prerequisites
- Python 3.9+
- Node.js 16+ and npm

### Quick Start (Easiest Way)

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

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## 🌐 Hosting & Deployment

Ready to deploy your app online?

- **Quick Start (5 minutes):** See [DEPLOYMENT_QUICKSTART.md](DEPLOYMENT_QUICKSTART.md) for Render deployment
- **Full Guide:** See [DEPLOYMENT.md](DEPLOYMENT.md) for all hosting options (Render, Railway, VPS, Docker)

---

### Manual Setup

#### Backend Setup

1. **Create and activate virtual environment** (if not already done)
```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

2. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
```

3. **Run the backend server**
```bash
python app.py
```

The backend API will run on `http://localhost:5000`

#### Frontend Setup

1. **Install frontend dependencies**
```bash
cd frontend
npm install
```

2. **Run the React app**
```bash
npm start
```

The frontend will open in your browser at `http://localhost:3000`

---

## 📂 Project Structure

```
📦 SHV_Tournament
 ├── 📁 backend/
 │   ├── 📜 app.py              # Flask API server
 │   └── 📜 requirements.txt    # Python dependencies
 ├── 📁 frontend/
 │   ├── 📁 public/             # Static files
 │   │   ├── 📁 images/
 │   │   │   ├── 📁 players/    # Player photos
 │   │   │   ├── 📁 captains/   # Captain photos
 │   │   │   └── 📁 backgrounds/
 │   │   └── index.html
 │   ├── 📁 src/
 │   │   ├── 📁 components/     # React components
 │   │   │   ├── Header.js
 │   │   │   ├── Stats.js
 │   │   │   ├── Controls.js
 │   │   │   ├── CurrentPlayer.js
 │   │   │   ├── TeamStatus.js
 │   │   │   ├── PlayerList.js
 │   │   │   └── PlayerListModal.js
 │   │   ├── 📁 utils/          # Utility functions
 │   │   ├── App.js             # Main React component
 │   │   └── index.js           # React entry point
 │   └── 📜 package.json        # Node dependencies
 ├── 📜 players.yaml            # Player data (48 players, excluding captains)
 ├── 📜 captains.yaml           # Captain data with photos
 ├── 📜 .gitignore              # Git ignore rules
 └── 📜 README.md               # This file
```

---

## 📝 Adding Player & Captain Photos

### Player Photos

To add photos for players, update `players.yaml`:

```yaml
players:
  - name: Player Name
    photo: "/images/players/Player_Name.jpeg"  # Local path
  - name: Another Player
    photo: ""  # Empty string for auto-generated avatar
```

**Photo file naming:** Use underscores (e.g., `Amit_Roy.jpeg`) to match player names.

### Captain Photos

Captain photos are managed in `captains.yaml`:

```yaml
captains:
  - name: Anshu
    photo: "/images/captains/Anshu.png"
```

**Supported photo formats:**
- Local file paths (relative to `frontend/public/`)
- Empty string `""` for auto-generated avatars
- JPG, JPEG, PNG formats

---

## 🧑‍💻 Development

### Backend API Endpoints

- `GET /api/status` - Get current auction status (players, teams, balances, captains)
- `GET /api/players` - Get all players list (excluding captains)
- `POST /api/pick` - Pick a random player from remaining pool
- `POST /api/skip` - Skip current player (adds to skipped pool)
- `POST /api/assign` - Assign player to captain with price
- `POST /api/reset` - Reset auction (fresh start)
- `GET /api/export?format=csv` - Export teams data to CSV

### Frontend Components

- **Header** - Multi-color gradient header with logo and branding
- **Stats** - Player count statistics (Total, Remaining, Assigned, Skipped, Progress %)
- **Controls** - Pick player, skip player, and reset auction buttons
- **CurrentPlayer** - Current player display with bidding form and photo
- **TeamStatus** - Leaderboard with team cards, captain photos, balances, and rosters
- **PlayerList** - Grid view of all players with filters (All, Remaining, Assigned)

---

## 🎨 Features in Detail

### Player Management
- **48 Players** (excluding 6 captains)
- Players loaded from `players.yaml`
- Captains automatically filtered out from player pool
- First name matching to prevent captain duplicates

### Team Formation
- **Minimum 8 players per team** (8 players + 1 captain = 9 total)
- Real-time tracking of players needed per team
- Visual indicators for incomplete teams

### Statistics Dashboard
- Total Players count
- Remaining in Pool count
- Assigned Players count
- Skipped Players count
- Progress percentage (assigned/total)

### Photo Display
- Player photos in:
  - Current player card
  - Team roster
  - Player list grid
- Captain photos in:
  - Leaderboard cards
  - Clickable with voice announcements

### Real-time Updates
- Frontend polls backend every 2 seconds for status updates
- Automatic refresh after actions
- Smooth UI transitions and animations

### Responsive Design
- Mobile-friendly layout
- Adaptive grid systems
- Touch-friendly controls
- Optimized for various screen sizes

### State Persistence
- Auction state automatically saved to `data/auction_state.json`
- State loaded on server restart
- Backup files created before state changes

---

## ⚙️ Configuration

### Backend Configuration (`backend/app.py`)

```python
CAPTAINS = ["Anshu", "Arunendu", "Avinash", "Priyanko", "Rishav", "Robin"]
INITIAL_POINTS = 200      # Starting balance per captain
MIN_PRICE = 5             # Minimum bid price
MIN_PLAYERS_PER_TEAM = 8  # Minimum players per team
```

### Data Files

- `players.yaml` - Player list with names and photo paths
- `captains.yaml` - Captain list with names and photo paths
- `data/auction_state.json` - Persistent auction state (auto-generated)

---

## 🔮 Future Enhancements

- [x] Player statistics dashboard
- [x] Export teams to CSV
- [x] Team size limits (minimum 8 players)
- [x] Captain photos in leaderboard
- [x] Enhanced stats with skipped count and progress
- [ ] WebSocket support for real-time updates
- [ ] Player statistics and history
- [ ] Manual player assignment (search by name)
- [ ] Auction history and replay
- [ ] Multi-session support

---

## 📋 Current Season 9 Setup

- **Captains:** 6 (Anshu, Arunendu, Avinash, Priyanko, Rishav, Robin)
- **Players:** 48 (excluding captains)
- **Team Size:** Minimum 8 players + 1 captain = 9 total per team
- **Starting Balance:** 200 points per captain
- **Minimum Bid:** 5 points

---

## 👥 Credits

Developed for **SHV Cricket Association — Season 9** 🎉

---

## 📄 License

This project is for internal use by SHV Cricket Association.

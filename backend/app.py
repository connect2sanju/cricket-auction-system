from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import random
import yaml
import json
import os
import time
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler

app = Flask(__name__)

# CORS configuration - allow all origins for development, configurable for production
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*")
if allowed_origins == "*":
    CORS(app)  # Allow all origins (development mode)
else:
    # Production: allow specific origins
    origins = [origin.strip() for origin in allowed_origins.split(",")]
    CORS(app, resources={r"/api/*": {"origins": origins}})

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
os.makedirs(log_dir, exist_ok=True)

# Configure data directory for state persistence
data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(data_dir, exist_ok=True)

log_file = os.path.join(log_dir, "auction.log")
error_log_file = os.path.join(log_dir, "errors.log")
state_file = os.path.join(data_dir, "auction_state.json")

# Create formatters
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# File handler for all logs (rotating, max 10MB, keep 5 backups)
file_handler = RotatingFileHandler(
    log_file,
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(formatter)

# Error file handler for errors only
error_handler = RotatingFileHandler(
    error_log_file,
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(formatter)

# Console handler
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)
console_handler.setFormatter(formatter)

# Configure root logger
app.logger.setLevel(logging.DEBUG)
app.logger.addHandler(file_handler)
app.logger.addHandler(error_handler)
app.logger.addHandler(console_handler)

# Disable Werkzeug's default logging
logging.getLogger('werkzeug').setLevel(logging.WARNING)

app.logger.info("="*50)
app.logger.info("SHV Cricket Auction API Server Started")
app.logger.info(f"Log file: {log_file}")
app.logger.info(f"Error log file: {error_log_file}")
app.logger.info(f"State file: {state_file}")
app.logger.info("="*50)

# Configuration
CAPTAINS = ["Anshu", "Arunendu", "Avinash", "Priyanko", "Rishav", "Robin"]  # Alphabetically sorted
INITIAL_POINTS = 200
MIN_PRICE = 5
MIN_PLAYERS_PER_TEAM = 8  # Minimum players required per team (8 players + 1 captain = 9 total)

# Load players from YAML
def load_players():
    yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "players.yaml")
    with open(yaml_path, "r") as f:
        cfg = yaml.safe_load(f)
    
    raw_players = cfg.get("players", [])
    players = []
    seen = set()
    
    # Filter out captains from players list
    captains_set = set(CAPTAINS)
    
    for p in raw_players:
        if isinstance(p, dict):
            name = p.get("name", "").strip()
            photo = p.get("photo", "")
        else:
            name = str(p).strip()
            photo = ""
        
        # Skip if this is a captain (check exact match or if first name matches a captain)
        if name in captains_set:
            continue
        
        # Also check if the player's first name matches any captain name
        # This handles cases like "Anshu Khaitan" matching captain "Anshu"
        first_name = name.split()[0] if name else ""
        if first_name in captains_set:
            continue
        
        if name and name not in seen:
            players.append({"name": name, "photo": photo})
            seen.add(name)
    
    return players

# Load captains with photos from YAML
def load_captains():
    yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captains.yaml")
    captains_dict = {}
    
    try:
        with open(yaml_path, "r") as f:
            cfg = yaml.safe_load(f)
            raw_captains = cfg.get("captains", [])
            
            for c in raw_captains:
                if isinstance(c, dict):
                    name = c.get("name", "").strip()
                    photo = c.get("photo", "")
                    if name:
                        captains_dict[name] = photo
    except FileNotFoundError:
        app.logger.warning("captains.yaml not found, using empty photos")
    
    # Ensure all captains have entries (even if no photo)
    for captain in CAPTAINS:
        if captain not in captains_dict:
            captains_dict[captain] = ""
    
    return captains_dict

# In-memory state (in production, use Redis or database)
auction_state = {
    "remaining": [],
    "current": None,
    "balances": {},
    "teams": {},
    "skipped": [],
    "initialized": False
}

# State persistence functions
def save_auction_state():
    """Save current auction state to file"""
    try:
        state_to_save = {
            "remaining": auction_state.get("remaining", []),
            "current": auction_state.get("current"),
            "balances": auction_state.get("balances", {}),
            "teams": auction_state.get("teams", {}),
            "skipped": auction_state.get("skipped", []),
            "saved_at": datetime.now().isoformat()
        }
        
        # Create backup before saving
        if os.path.exists(state_file):
            backup_file = state_file + ".backup"
            if os.path.exists(backup_file):
                os.remove(backup_file)
            os.rename(state_file, backup_file)
        
        with open(state_file, "w") as f:
            json.dump(state_to_save, f, indent=2)
        
        app.logger.info(f"💾 Auction state saved to {state_file}")
        return True
    except Exception as e:
        app.logger.error(f"Error saving auction state: {str(e)}", exc_info=True)
        return False

def load_auction_state():
    """Load saved auction state from file"""
    try:
        if not os.path.exists(state_file):
            app.logger.info("No saved state file found, starting fresh")
            return False
        
        with open(state_file, "r") as f:
            saved_state = json.load(f)
        
        # Validate saved state structure
        if not isinstance(saved_state, dict):
            app.logger.warning("Invalid state file format")
            return False
        
        # Load state
        auction_state["remaining"] = saved_state.get("remaining", [])
        auction_state["current"] = saved_state.get("current")
        auction_state["balances"] = saved_state.get("balances", {})
        auction_state["teams"] = saved_state.get("teams", {})
        auction_state["skipped"] = saved_state.get("skipped", [])
        
        saved_at = saved_state.get("saved_at", "unknown")
        app.logger.info(f"✅ Loaded saved auction state from {saved_at}")
        app.logger.info(f"   - Remaining players: {len(auction_state['remaining'])}")
        app.logger.info(f"   - Skipped players: {len(auction_state['skipped'])}")
        app.logger.info(f"   - Current player: {auction_state['current']}")
        app.logger.info(f"   - Total assigned: {sum(len(v) for v in auction_state['teams'].values())}")
        
        return True
    except Exception as e:
        app.logger.error(f"Error loading auction state: {str(e)}", exc_info=True)
        # Try to load from backup
        backup_file = state_file + ".backup"
        if os.path.exists(backup_file):
            try:
                app.logger.warning("Attempting to load from backup file...")
                with open(backup_file, "r") as f:
                    saved_state = json.load(f)
                auction_state["remaining"] = saved_state.get("remaining", [])
                auction_state["current"] = saved_state.get("current")
                auction_state["balances"] = saved_state.get("balances", {})
                auction_state["teams"] = saved_state.get("teams", {})
                auction_state["skipped"] = saved_state.get("skipped", [])
                app.logger.info("✅ Loaded from backup file")
                return True
            except Exception as backup_error:
                app.logger.error(f"Failed to load from backup: {str(backup_error)}")
        return False

def initialize_auction():
    if not auction_state["initialized"]:
        # Try to load saved state first
        state_loaded = load_auction_state()
        
        if not state_loaded:
            # Start fresh if no saved state
            players = load_players()
            current_player_names = {p["name"] for p in players}
            auction_state["remaining"] = [p["name"] for p in players]
            auction_state["skipped"] = []
            auction_state["current"] = None
            auction_state["balances"] = {c: INITIAL_POINTS for c in CAPTAINS}
            auction_state["teams"] = {c: [] for c in CAPTAINS}
            app.logger.info("🚀 Starting fresh auction")
        
        # Validate and sync with current players.yaml
        players = load_players()
        current_player_names = {p["name"] for p in players}
        
        # Get all currently assigned players
        assigned_players = set()
        for captain in CAPTAINS:
            if captain in auction_state.get("teams", {}):
                for item in auction_state["teams"][captain]:
                    if isinstance(item, dict):
                        assigned_players.add(item.get("player"))
                    else:
                        assigned_players.add(item)
        
        # Remove players from remaining that no longer exist
        auction_state["remaining"] = [p for p in auction_state.get("remaining", []) if p in current_player_names]
        
        # Add new players that are in players.yaml but not in remaining and not assigned
        current_remaining = set(auction_state.get("remaining", []))
        for player_name in current_player_names:
            if player_name not in current_remaining and player_name not in assigned_players:
                auction_state["remaining"].append(player_name)
                app.logger.info(f"➕ Added new player to pool: {player_name}")
        
        # Remove assigned players that no longer exist from teams
        for captain in CAPTAINS:
            if captain not in auction_state.get("teams", {}):
                auction_state.setdefault("teams", {})[captain] = []
            auction_state["teams"][captain] = [
                item for item in auction_state["teams"][captain]
                if item.get("player") in current_player_names
            ]
        
        # Ensure all captains have balances
        for captain in CAPTAINS:
            if captain not in auction_state.get("balances", {}):
                auction_state.setdefault("balances", {})[captain] = INITIAL_POINTS
            if captain not in auction_state.get("teams", {}):
                auction_state.setdefault("teams", {})[captain] = []
        
        # Clear current if player no longer exists
        if auction_state.get("current") and auction_state["current"] not in current_player_names:
            auction_state["current"] = None
        
        # Ensure skipped list exists
        if "skipped" not in auction_state:
            auction_state["skipped"] = []
        
        auction_state["initialized"] = True
        
        # Save initial state
        save_auction_state()
    else:
        # Re-sync remaining list with current players.yaml (remove any players that no longer exist)
        players = load_players()
        current_player_names = {p["name"] for p in players}
        # Remove players from remaining that are no longer in players.yaml
        auction_state["remaining"] = [p for p in auction_state["remaining"] if p in current_player_names]
        # Remove assigned players that are no longer in players.yaml from teams
        for captain in CAPTAINS:
            auction_state["teams"][captain] = [
                item for item in auction_state["teams"][captain]
                if item.get("player") in current_player_names
            ]
        # If current player is no longer valid, clear it
        if auction_state["current"] and auction_state["current"] not in current_player_names:
            auction_state["current"] = None

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "name": "SHV Cricket Auction API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "status": "/api/status",
            "players": "/api/players",
            "pick": "/api/pick (POST)",
            "skip": "/api/skip (POST)",
            "assign": "/api/assign (POST)",
            "reset": "/api/reset (POST)",
            "export": "/api/export"
        }
    }), 200

@app.route("/api/status", methods=["GET"])
def get_status():
    try:
        initialize_auction()
        players = load_players()
        player_dict = {p["name"]: p for p in players}
        
        total_assigned = sum(len(v) for v in auction_state["teams"].values())
        
        app.logger.debug(f"Status requested - Total: {len(players)}, Remaining: {len(auction_state['remaining'])}, Assigned: {total_assigned}")
        
        captains_photos = load_captains()
        
        return jsonify({
            "totalPlayers": len(players),
            "remaining": auction_state["remaining"],  # Return array, not count
            "remainingCount": len(auction_state["remaining"]),  # Also include count for convenience
            "skippedCount": len(auction_state.get("skipped", [])),  # Include skipped count
            "assigned": total_assigned,
            "current": auction_state["current"],
            "balances": auction_state["balances"],
            "teams": auction_state["teams"],
            "captains": CAPTAINS,
            "captainsPhotos": captains_photos,  # Add captain photos
            "minPrice": MIN_PRICE,
            "initialPoints": INITIAL_POINTS,
            "minPlayersPerTeam": MIN_PLAYERS_PER_TEAM
        })
    except Exception as e:
        app.logger.error(f"Error in get_status: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get status"}), 500

@app.route("/api/players", methods=["GET"])
def get_players():
    try:
        players = load_players()
        app.logger.debug(f"Players list requested - Total: {len(players)}")
        return jsonify({"players": players})
    except Exception as e:
        app.logger.error(f"Error in get_players: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to load players"}), 500

@app.route("/api/pick", methods=["POST"])
def pick_player():
    try:
        initialize_auction()
        
        if auction_state["current"] is not None:
            app.logger.warning(f"Pick requested but player already selected: {auction_state['current']}")
            return jsonify({"error": "A player is already selected"}), 400
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        if not auction_state["remaining"]:
            app.logger.warning("Pick requested but no players left in pool")
            return jsonify({"error": "No players left in the pool"}), 400
        
        # Add a longer delay to simulate "fetching" process (increased for more suspense)
        time.sleep(2.5)
        
        auction_state["current"] = random.choice(auction_state["remaining"])
        app.logger.info(f"Player picked: {auction_state['current']} (Remaining: {len(auction_state['remaining'])}, Skipped: {len(auction_state.get('skipped', []))})")
        
        # Auto-save state after picking
        save_auction_state()
        
        return jsonify({
            "current": auction_state["current"],
            "remaining": auction_state["remaining"],
            "remainingCount": len(auction_state["remaining"]),
            "skippedCount": len(auction_state.get("skipped", []))
        })
    except Exception as e:
        app.logger.error(f"Error in pick_player: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to pick player"}), 500

@app.route("/api/skip", methods=["POST"])
def skip_player():
    try:
        initialize_auction()
        
        if auction_state["current"] is None:
            app.logger.warning("Skip requested but no player selected")
            return jsonify({"error": "No player selected"}), 400
        
        cur = auction_state["current"]
        
        # Remove current player from remaining (if still there) and add to skipped
        if cur in auction_state["remaining"]:
            auction_state["remaining"].remove(cur)
        
        # Add to skipped list (only if not already there)
        if cur not in auction_state.get("skipped", []):
            auction_state.setdefault("skipped", []).append(cur)
            app.logger.info(f"Player skipped: {cur} (Added to skipped pool. Skipped count: {len(auction_state['skipped'])})")
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        # Pick next player from remaining pool (if any)
        if auction_state["remaining"]:
            # Add a longer delay to simulate "fetching" process
            time.sleep(2.5)
            
            auction_state["current"] = random.choice(auction_state["remaining"])
            app.logger.info(f"New player picked after skip: {auction_state['current']} (Remaining: {len(auction_state['remaining'])})")
        else:
            auction_state["current"] = None
            app.logger.info("No more players available after skip")
        
        # Auto-save state after skipping
        save_auction_state()
        
        return jsonify({
            "current": auction_state["current"],
            "skipped": cur,
            "remaining": auction_state["remaining"],
            "remainingCount": len(auction_state["remaining"]),
            "skippedCount": len(auction_state.get("skipped", []))
        })
    except Exception as e:
        app.logger.error(f"Error in skip_player: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to skip player"}), 500

@app.route("/api/assign", methods=["POST"])
def assign_player():
    try:
        initialize_auction()
        
        data = request.json
        captain = data.get("captain")
        price = int(data.get("price", MIN_PRICE))
        current_player = auction_state["current"]
        
        app.logger.info(f"Assignment request - Player: {current_player}, Captain: {captain}, Price: {price}")
        
        if not current_player:
            app.logger.warning("Assignment requested but no player selected")
            return jsonify({"error": "No player selected"}), 400
        
        if not captain or captain not in CAPTAINS:
            app.logger.warning(f"Invalid captain in assignment: {captain}")
            return jsonify({"error": "Invalid captain"}), 400
        
        if price < MIN_PRICE:
            app.logger.warning(f"Price too low: {price} (min: {MIN_PRICE})")
            return jsonify({"error": f"Minimum price is {MIN_PRICE}"}), 400
        
        if price > auction_state["balances"][captain]:
            app.logger.warning(f"Insufficient balance - Captain: {captain}, Balance: {auction_state['balances'][captain]}, Price: {price}")
            return jsonify({"error": "Not enough balance"}), 400
        
        # Assign player
        old_balance = auction_state["balances"][captain]
        auction_state["balances"][captain] -= price
        auction_state["teams"][captain].append({"player": current_player, "price": price})
        
        # Remove from remaining
        if current_player in auction_state["remaining"]:
            auction_state["remaining"].remove(current_player)
        
        app.logger.info(f"✅ ASSIGNED: {current_player} -> {captain} for {price} points (Balance: {old_balance} -> {auction_state['balances'][captain]})")
        
        # Clear current player - user must manually pick next player
        auction_state["current"] = None
        app.logger.info("Current player cleared. Waiting for manual pick.")
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        # Check if all players are assigned
        if not auction_state["remaining"] and not auction_state.get("skipped"):
            app.logger.info("🎉 All players have been assigned!")
        
        # Auto-save state after assignment
        save_auction_state()
        
        return jsonify({
            "success": True,
            "message": f"{current_player} assigned to {captain} for {price} points",
            "current": None,  # Always return None - user must manually pick next
            "balances": auction_state["balances"],
            "teams": auction_state["teams"],
            "remaining": auction_state["remaining"],
            "remainingCount": len(auction_state["remaining"]),
            "skippedCount": len(auction_state.get("skipped", []))
        })
    except Exception as e:
        app.logger.error(f"Error in assign_player: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to assign player"}), 500

@app.route("/api/reset", methods=["POST"])
def reset_auction():
    try:
        global auction_state
        app.logger.warning("🔄 AUCTION RESET REQUESTED")
        
        # Force fresh initialization without loading saved state
        players = load_players()
        current_player_names = {p["name"] for p in players}
        
        # Reset all state
        auction_state = {
            "remaining": [p["name"] for p in players],
            "skipped": [],
            "current": None,
            "balances": {c: INITIAL_POINTS for c in CAPTAINS},
            "teams": {c: [] for c in CAPTAINS},
            "initialized": True  # Mark as initialized so it doesn't try to load saved state
        }
        
        # Validate teams to remove any invalid players
        for captain, roster in auction_state["teams"].items():
            auction_state["teams"][captain] = [
                item for item in roster
                if isinstance(item, dict) and item.get("player") in current_player_names
            ]
        
        # Clear current player if it's not valid
        if auction_state["current"] and auction_state["current"] not in current_player_names:
            auction_state["current"] = None
        
        # Save state after reset (fresh state)
        save_auction_state()
        app.logger.info("✅ Auction reset successfully - Fresh start initialized")
        app.logger.info(f"   - Total players: {len(players)}")
        app.logger.info(f"   - Remaining: {len(auction_state['remaining'])}")
        app.logger.info(f"   - Teams reset for {len(CAPTAINS)} captains")
        
        return jsonify({"success": True, "message": "Auction reset successfully"})
    except Exception as e:
        app.logger.error(f"Error in reset_auction: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to reset auction"}), 500

@app.route("/api/save", methods=["POST"])
def save_state():
    """Manually save current auction state"""
    try:
        initialize_auction()
        success = save_auction_state()
        if success:
            return jsonify({"success": True, "message": "State saved successfully"})
        else:
            return jsonify({"error": "Failed to save state"}), 500
    except Exception as e:
        app.logger.error(f"Error in save_state: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to save state"}), 500

@app.route("/api/load", methods=["POST"])
def load_state():
    """Manually load saved auction state"""
    try:
        global auction_state
        state_loaded = load_auction_state()
        if state_loaded:
            auction_state["initialized"] = False  # Force re-initialization
            initialize_auction()
            return jsonify({"success": True, "message": "State loaded successfully"})
        else:
            return jsonify({"error": "No saved state found or failed to load"}), 404
    except Exception as e:
        app.logger.error(f"Error in load_state: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to load state"}), 500

@app.route("/api/export", methods=["GET"])
def export_teams():
    """Export teams data as CSV or JSON"""
    try:
        initialize_auction()
        export_format = request.args.get("format", "json").lower()
        
        export_data = []
        total_players = 0
        total_spent = 0
        
        # Get all captains sorted alphabetically
        sorted_captains = sorted(auction_state["teams"].keys())
        
        for captain in sorted_captains:
            roster = auction_state["teams"][captain]
            balance = auction_state["balances"].get(captain, INITIAL_POINTS)
            
            if roster:
                for idx, item in enumerate(roster):
                    player_name = item["player"]
                    price = item["price"]
                    total_players += 1
                    total_spent += price
                    # Show balance only in first row for each captain
                    export_data.append({
                        "Captain": captain if idx == 0 else "",
                        "Player": player_name,
                        "Price": price,
                        "Balance Remaining": balance if idx == 0 else ""
                    })
            else:
                # Captain with no players
                export_data.append({
                    "Captain": captain,
                    "Player": "-",
                    "Price": "-",
                    "Balance Remaining": balance
                })
        
        # Add summary row
        export_data.append({
            "Captain": "=== SUMMARY ===",
            "Player": f"Total Players: {total_players}",
            "Price": f"Total Spent: ₹{total_spent}",
            "Balance Remaining": f"Total Remaining: ₹{sum(auction_state['balances'].values())}"
        })
        
        app.logger.info(f"Export requested - {len(export_data)} records, format: {export_format}")
        
        if export_format == "csv":
            # Generate CSV
            from io import StringIO
            import csv
            
            output = StringIO()
            if export_data:
                writer = csv.DictWriter(output, fieldnames=export_data[0].keys())
                writer.writeheader()
                writer.writerows(export_data)
            
            csv_data = output.getvalue()
            output.close()
            
            response = Response(
                csv_data,
                mimetype="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=auction_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
            return response
        else:
            # Return JSON
            return jsonify({
                "data": export_data,
                "summary": {
                    "totalPlayers": total_players,
                    "totalSpent": total_spent,
                    "totalRemaining": sum(auction_state["balances"].values()),
                    "exportedAt": datetime.now().isoformat()
                }
            })
    except Exception as e:
        app.logger.error(f"Error in export_teams: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to export teams"}), 500

@app.route("/api/log", methods=["POST"])
def log_frontend_error():
    """Endpoint to receive frontend error logs"""
    try:
        data = request.json
        log_level = data.get("level", "ERROR")
        message = data.get("message", "")
        log_data = data.get("data", {})
        
        if log_level == "ERROR":
            app.logger.error(f"[FRONTEND] {message}", extra=log_data)
        elif log_level == "WARN":
            app.logger.warning(f"[FRONTEND] {message}", extra=log_data)
        else:
            app.logger.info(f"[FRONTEND] {message}", extra=log_data)
        
        return jsonify({"success": True})
    except Exception as e:
        app.logger.error(f"Error logging frontend error: {str(e)}")
        return jsonify({"error": "Failed to log"}), 500

# Error handler for unhandled exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    app.logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
    return jsonify({"error": "An internal error occurred"}), 500

# Request logging middleware
@app.before_request
def log_request():
    app.logger.debug(f"Request: {request.method} {request.path} - IP: {request.remote_addr}")

@app.after_request
def log_response(response):
    app.logger.debug(f"Response: {request.method} {request.path} - Status: {response.status_code}")
    return response

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    app.logger.info(f"Starting Flask server on port {port} (debug={debug_mode})")
    app.run(debug=debug_mode, host="0.0.0.0", port=port)


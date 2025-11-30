from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import random
import yaml
import json
import os
import time
import logging
import uuid
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
rooms_dir = os.path.join(data_dir, "rooms")
auctions_dir = os.path.join(data_dir, "auctions")
os.makedirs(rooms_dir, exist_ok=True)
os.makedirs(auctions_dir, exist_ok=True)

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

# Default Configuration (fallback)
DEFAULT_CAPTAINS = ["Anshu", "Arunendu", "Avinash", "Priyanko", "Rishav", "Robin"]
INITIAL_POINTS = 200
DEFAULT_MIN_PRICE = 5
MIN_PLAYERS_PER_TEAM = 8  # Minimum players required per team (8 players + 1 captain = 9 total)

# Auction configurations storage: {auction_id: {season_name, base_price, players_file, captains_file, captains_list}}
auction_configs = {}

def get_auction_config_file(auction_id):
    """Get config file path for an auction"""
    return os.path.join(auctions_dir, f"{auction_id}_config.json")

def get_auction_players_file(auction_id):
    """Get players YAML file path for an auction"""
    return os.path.join(auctions_dir, f"{auction_id}_players.yaml")

def get_auction_captains_file(auction_id):
    """Get captains YAML file path for an auction"""
    return os.path.join(auctions_dir, f"{auction_id}_captains.yaml")

def load_auction_config(auction_id):
    """Load auction configuration from file"""
    try:
        config_file = get_auction_config_file(auction_id)
        if not os.path.exists(config_file):
            return None
        
        with open(config_file, "r") as f:
            config = json.load(f)
        
        auction_configs[auction_id] = config
        return config
    except Exception as e:
        app.logger.error(f"Error loading auction config for {auction_id}: {str(e)}")
        return None

def save_auction_config(auction_id, config):
    """Save auction configuration to file"""
    try:
        config_file = get_auction_config_file(auction_id)
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)
        auction_configs[auction_id] = config
        app.logger.info(f"Saved auction config for {auction_id}")
        return True
    except Exception as e:
        app.logger.error(f"Error saving auction config for {auction_id}: {str(e)}")
        return False

def get_auction_config(auction_id):
    """Get auction configuration (load from file if not in memory)"""
    if auction_id not in auction_configs:
        config = load_auction_config(auction_id)
        if config:
            return config
    return auction_configs.get(auction_id)

# Load players from YAML for a specific auction
def load_players(auction_id=None):
    if auction_id:
        config = get_auction_config(auction_id)
        if config:
            players_file = get_auction_players_file(auction_id)
            if os.path.exists(players_file):
                yaml_path = players_file
            else:
                # Fallback to default
                yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "players.yaml")
        else:
            yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "players.yaml")
    else:
        yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "players.yaml")
    
    try:
        with open(yaml_path, "r") as f:
            cfg = yaml.safe_load(f)
    except FileNotFoundError:
        app.logger.warning(f"Players YAML not found: {yaml_path}")
        return []
    
    raw_players = cfg.get("players", [])
    players = []
    seen = set()
    
    # Get captains list for this auction
    if auction_id:
        config = get_auction_config(auction_id)
        captains_list = config.get("captains_list", []) if config else DEFAULT_CAPTAINS
    else:
        captains_list = DEFAULT_CAPTAINS
    
    captains_set = set(captains_list)
    
    for p in raw_players:
        if isinstance(p, dict):
            name = p.get("name", "").strip()
            photo = p.get("photo", "")
        else:
            name = str(p).strip()
            photo = ""
        
        # Skip if this is a captain
        if name in captains_set:
            continue
        
        first_name = name.split()[0] if name else ""
        if first_name in captains_set:
            continue
        
        if name and name not in seen:
            players.append({"name": name, "photo": photo})
            seen.add(name)
    
    return players

# Load captains with photos from YAML for a specific auction
def load_captains(auction_id=None):
    captains_dict = {}
    
    # Get captains list for this auction
    if auction_id:
        config = get_auction_config(auction_id)
        captains_list = config.get("captains_list", []) if config else DEFAULT_CAPTAINS
    else:
        captains_list = DEFAULT_CAPTAINS
    
    # Load captains from auction-specific file or default
    if auction_id:
        config = get_auction_config(auction_id)
        if config:
            captains_file = get_auction_captains_file(auction_id)
            if os.path.exists(captains_file):
                yaml_path = captains_file
            else:
                yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captains.yaml")
        else:
            yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captains.yaml")
    else:
        yaml_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "captains.yaml")
    
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
        app.logger.warning(f"Captains YAML not found: {yaml_path}")
    
    # Ensure all captains from the list have entries (even if no photo)
    for captain in captains_list:
        if captain not in captains_dict:
            captains_dict[captain] = ""
    
    return captains_dict, captains_list

# In-memory state per room (in production, use Redis or database)
# Structure: {room_id: {remaining: [], current: None, balances: {}, teams: {}, skipped: [], initialized: False}}
auction_states = {}

# Default room ID (for backward compatibility)
DEFAULT_ROOM = "default"

# Room management functions
def get_room_state(room_id):
    """Get or create auction state for a room"""
    if room_id not in auction_states:
        auction_states[room_id] = {
            "remaining": [],
            "current": None,
            "balances": {},
            "teams": {},
            "skipped": [],
            "initialized": False
        }
    return auction_states[room_id]

def get_room_state_file(room_id):
    """Get state file path for a room"""
    if room_id == DEFAULT_ROOM:
        return state_file  # Backward compatibility
    return os.path.join(rooms_dir, f"{room_id}_state.json")

def get_auction_room_id(auction_id):
    """Map auction_id to room_id for state management"""
    # For now, use auction_id as room_id, or default if not provided
    if auction_id:
        return auction_id
    return DEFAULT_ROOM

# State persistence functions
def save_auction_state(room_id=DEFAULT_ROOM):
    """Save auction state for a room to file"""
    try:
        auction_state = get_room_state(room_id)
        state_to_save = {
            "remaining": auction_state.get("remaining", []),
            "current": auction_state.get("current"),
            "balances": auction_state.get("balances", {}),
            "teams": auction_state.get("teams", {}),
            "skipped": auction_state.get("skipped", []),
            "last_assignment": auction_state.get("last_assignment"),  # Store last assignment for undo reference
            "saved_at": datetime.now().isoformat()
        }
        
        room_state_file = get_room_state_file(room_id)
        
        # Create backup before saving
        if os.path.exists(room_state_file):
            backup_file = room_state_file + ".backup"
            if os.path.exists(backup_file):
                os.remove(backup_file)
            os.rename(room_state_file, backup_file)
        
        with open(room_state_file, "w") as f:
            json.dump(state_to_save, f, indent=2)
        
        app.logger.info(f"💾 Auction state saved for room {room_id} to {room_state_file}")
        return True
    except Exception as e:
        app.logger.error(f"Error saving auction state for room {room_id}: {str(e)}", exc_info=True)
        return False

def load_auction_state(room_id=DEFAULT_ROOM):
    """Load saved auction state for a room from file"""
    try:
        auction_state = get_room_state(room_id)
        room_state_file = get_room_state_file(room_id)
        
        if not os.path.exists(room_state_file):
            app.logger.info(f"No saved state file found for room {room_id}, starting fresh")
            return False
        
        with open(room_state_file, "r") as f:
            saved_state = json.load(f)
        
        # Validate saved state structure
        if not isinstance(saved_state, dict):
            app.logger.warning(f"Invalid state file format for room {room_id}")
            return False
        
        # Load state
        auction_state["remaining"] = saved_state.get("remaining", [])
        auction_state["current"] = saved_state.get("current")
        auction_state["balances"] = saved_state.get("balances", {})
        auction_state["teams"] = saved_state.get("teams", {})
        auction_state["skipped"] = saved_state.get("skipped", [])
        auction_state["last_assignment"] = saved_state.get("last_assignment")  # Load last assignment
        
        saved_at = saved_state.get("saved_at", "unknown")
        app.logger.info(f"✅ Loaded saved auction state for room {room_id} from {saved_at}")
        app.logger.info(f"   - Remaining players: {len(auction_state['remaining'])}")
        app.logger.info(f"   - Skipped players: {len(auction_state['skipped'])}")
        app.logger.info(f"   - Current player: {auction_state['current']}")
        app.logger.info(f"   - Total assigned: {sum(len(v) for v in auction_state['teams'].values())}")
        
        return True
    except Exception as e:
        app.logger.error(f"Error loading auction state for room {room_id}: {str(e)}", exc_info=True)
        # Try to load from backup
        room_state_file = get_room_state_file(room_id)
        backup_file = room_state_file + ".backup"
        if os.path.exists(backup_file):
            try:
                app.logger.warning(f"Attempting to load from backup file for room {room_id}...")
                with open(backup_file, "r") as f:
                    saved_state = json.load(f)
                auction_state = get_room_state(room_id)
                auction_state["remaining"] = saved_state.get("remaining", [])
                auction_state["current"] = saved_state.get("current")
                auction_state["balances"] = saved_state.get("balances", {})
                auction_state["teams"] = saved_state.get("teams", {})
                auction_state["skipped"] = saved_state.get("skipped", [])
                auction_state["last_assignment"] = saved_state.get("last_assignment")  # Restore last assignment from backup
                app.logger.info(f"✅ Loaded from backup file for room {room_id}")
                return True
            except Exception as backup_error:
                app.logger.error(f"Failed to load from backup for room {room_id}: {str(backup_error)}")
        return False

def initialize_auction(room_id=DEFAULT_ROOM, auction_id=None):
    """Initialize auction state for a room or auction"""
    # Get captains list and initial points - from auction config if available, otherwise use default
    initial_points = INITIAL_POINTS
    if auction_id:
        config = get_auction_config(auction_id)
        captains_list = config.get("captains_list", DEFAULT_CAPTAINS) if config else DEFAULT_CAPTAINS
        initial_points = config.get("initial_points", INITIAL_POINTS) if config else INITIAL_POINTS
    else:
        captains_list = DEFAULT_CAPTAINS
    
    auction_state = get_room_state(room_id)
    if not auction_state["initialized"]:
        # Try to load saved state first
        state_loaded = load_auction_state(room_id)
        
        if not state_loaded:
            # Start fresh if no saved state
            players = load_players(auction_id) if auction_id else load_players()
            current_player_names = {p["name"] for p in players}
            auction_state["remaining"] = [p["name"] for p in players]
            auction_state["skipped"] = []
            auction_state["current"] = None
            auction_state["balances"] = {c: initial_points for c in captains_list}
            auction_state["teams"] = {c: [] for c in captains_list}
            app.logger.info(f"🚀 Starting fresh auction for room {room_id} with {initial_points} initial points per captain")
        
        # Validate and sync with current players.yaml
        players = load_players(auction_id) if auction_id else load_players()
        current_player_names = {p["name"] for p in players}
        
        # Get all currently assigned players
        assigned_players = set()
        for captain in captains_list:
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
                app.logger.info(f"➕ Added new player to pool for room {room_id}: {player_name}")
        
        # Remove assigned players that no longer exist from teams
        for captain in captains_list:
            if captain not in auction_state.get("teams", {}):
                auction_state.setdefault("teams", {})[captain] = []
            auction_state["teams"][captain] = [
                item for item in auction_state["teams"][captain]
                if isinstance(item, dict) and item.get("player") in current_player_names
            ]
        
        # Ensure all captains have balances
        for captain in captains_list:
            if captain not in auction_state.get("balances", {}):
                auction_state.setdefault("balances", {})[captain] = initial_points
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
        save_auction_state(room_id)
    else:
        # Re-sync remaining list with current players.yaml (remove any players that no longer exist)
        players = load_players(auction_id) if auction_id else load_players()
        current_player_names = {p["name"] for p in players}
        # Remove players from remaining that are no longer in players.yaml
        auction_state["remaining"] = [p for p in auction_state["remaining"] if p in current_player_names]
        # Remove assigned players that are no longer in players.yaml from teams
        for captain in captains_list:
            if captain in auction_state.get("teams", {}):
                auction_state["teams"][captain] = [
                    item for item in auction_state["teams"][captain]
                    if isinstance(item, dict) and item.get("player") in current_player_names
                ]
        # If current player is no longer valid, clear it
        if auction_state["current"] and auction_state["current"] not in current_player_names:
            auction_state["current"] = None

# Import user management functions
import sys
sys.path.insert(0, os.path.dirname(__file__))
from user_manager import (
    authenticate_user, add_user, list_users, 
    update_user_password, delete_user
)

@app.route("/", methods=["GET"])
def root():
    """Root endpoint - API information"""
    return jsonify({
        "name": "SHV Cricket Auction API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "login": "/api/login (POST)",
            "users": "/api/users (GET/POST)",
            "auctions": "/api/auctions (GET/POST)",
            "auction_config": "/api/auctions/<auction_id>/config (GET/PUT)",
            "status": "/api/status?auction_id=<auction_id>",
            "players": "/api/players?auction_id=<auction_id>",
            "pick": "/api/pick (POST, requires auction_id)",
            "skip": "/api/skip (POST, requires auction_id)",
            "assign": "/api/assign (POST, requires auction_id)",
            "reset": "/api/reset (POST, requires auction_id)",
            "export": "/api/export?auction_id=<auction_id>"
        }
    }), 200

# Authentication endpoints
@app.route("/api/login", methods=["POST"])
def login():
    """Authenticate user with username and password"""
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        
        # Simple mode: if no password provided, allow username-only login
        if not password:
            if username:
                return jsonify({
                    "success": True,
                    "username": username,
                    "message": "Logged in (simple mode - no password)"
                })
            else:
                return jsonify({"error": "Username is required"}), 400
        
        # Authenticate user
        user = authenticate_user(username, password)
        if user:
            return jsonify({
                "success": True,
                "username": user.get("username"),
                "role": user.get("role"),
                "message": "Logged in successfully"
            })
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    except Exception as e:
        app.logger.error(f"Error in login: {str(e)}", exc_info=True)
        return jsonify({"error": "Login failed"}), 500

@app.route("/api/users", methods=["GET"])
def get_users():
    """List all users (admin only - for now returns all)"""
    try:
        users = list_users()
        return jsonify({"users": users})
    except Exception as e:
        app.logger.error(f"Error listing users: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to list users"}), 500

@app.route("/api/users", methods=["POST"])
def create_user():
    """Create a new user"""
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        role = data.get("role", "user").strip()
        
        if not username or not password:
            return jsonify({"error": "Username and password are required"}), 400
        
        success, message = add_user(username, password, role)
        if success:
            return jsonify({"success": True, "message": message}), 201
        else:
            return jsonify({"error": message}), 400
    except Exception as e:
        app.logger.error(f"Error creating user: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create user"}), 500

# Auction management endpoints
@app.route("/api/auctions", methods=["GET"])
def list_auctions():
    """List all available auctions"""
    try:
        auctions = []
        if os.path.exists(auctions_dir):
            for filename in os.listdir(auctions_dir):
                if filename.endswith("_config.json"):
                    auction_id = filename.replace("_config.json", "")
                    config = load_auction_config(auction_id)
                    if config:
                        auctions.append({
                            "auction_id": auction_id,
                            "season_name": config.get("season_name", auction_id),
                            "base_price": config.get("base_price", DEFAULT_MIN_PRICE),
                            "created_at": config.get("created_at", "unknown")
                        })
        
        return jsonify({"auctions": auctions})
    except Exception as e:
        app.logger.error(f"Error listing auctions: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to list auctions"}), 500

@app.route("/api/auctions", methods=["POST"])
def create_auction():
    """Create a new auction with configuration"""
    try:
        season_name = request.form.get("season_name", "").strip()
        base_price = int(request.form.get("base_price", DEFAULT_MIN_PRICE))
        
        if not season_name:
            return jsonify({"error": "Season name is required"}), 400
        
        # Generate auction ID
        auction_id = str(uuid.uuid4())[:8]
        
        # Save uploaded files
        players_file = request.files.get("players_file")
        captains_file = request.files.get("captains_file")
        
        players_path = get_auction_players_file(auction_id)
        captains_path = get_auction_captains_file(auction_id)
        
        if players_file:
            players_file.save(players_path)
            app.logger.info(f"Saved players file for auction {auction_id}")
        
        if captains_file:
            captains_file.save(captains_path)
            app.logger.info(f"Saved captains file for auction {auction_id}")
        
        # Extract captains list from captains file
        captains_list = DEFAULT_CAPTAINS
        if os.path.exists(captains_path):
            try:
                with open(captains_path, "r") as f:
                    cfg = yaml.safe_load(f)
                    raw_captains = cfg.get("captains", [])
                    captains_list = []
                    for c in raw_captains:
                        if isinstance(c, dict):
                            name = c.get("name", "").strip()
                            if name:
                                captains_list.append(name)
                        else:
                            captains_list.append(str(c).strip())
                    if not captains_list:
                        captains_list = DEFAULT_CAPTAINS
            except Exception as e:
                app.logger.warning(f"Error parsing captains file: {str(e)}, using defaults")
        
        # Get team size (minimum players per team)
        team_size = int(request.form.get("team_size", MIN_PLAYERS_PER_TEAM))
        if team_size < 1:
            team_size = MIN_PLAYERS_PER_TEAM
        
        # Get initial points (allotted points for each captain)
        initial_points = int(request.form.get("initial_points", INITIAL_POINTS))
        if initial_points < 1:
            initial_points = INITIAL_POINTS
        
        # Save configuration
        config = {
            "season_name": season_name,
            "base_price": base_price,
            "team_size": team_size,
            "initial_points": initial_points,
            "captains_list": captains_list,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        save_auction_config(auction_id, config)
        
        app.logger.info(f"🏠 Created new auction: {auction_id} - {season_name}")
        
        return jsonify({
            "auction_id": auction_id,
            "message": "Auction created successfully",
            "config": config
        }), 201
    except Exception as e:
        app.logger.error(f"Error creating auction: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to create auction: {str(e)}"}), 500

@app.route("/api/auctions/<auction_id>/config", methods=["GET"])
def get_auction_config_endpoint(auction_id):
    """Get auction configuration"""
    try:
        config = get_auction_config(auction_id)
        if not config:
            return jsonify({"error": "Auction not found"}), 404
        
        return jsonify({
            "auction_id": auction_id,
            "season_name": config.get("season_name", ""),
            "base_price": config.get("base_price", DEFAULT_MIN_PRICE),
            "team_size": config.get("team_size", MIN_PLAYERS_PER_TEAM),
            "initial_points": config.get("initial_points", INITIAL_POINTS),
            "captains_list": config.get("captains_list", DEFAULT_CAPTAINS),
            "created_at": config.get("created_at", ""),
            "updated_at": config.get("updated_at", "")
        })
    except Exception as e:
        app.logger.error(f"Error getting auction config: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to get auction config"}), 500

@app.route("/api/auctions/<auction_id>/config", methods=["PUT"])
def update_auction_config(auction_id):
    """Update auction configuration"""
    try:
        config = get_auction_config(auction_id)
        if not config:
            return jsonify({"error": "Auction not found"}), 404
        
        season_name = request.form.get("season_name", config.get("season_name", "")).strip()
        base_price = int(request.form.get("base_price", config.get("base_price", DEFAULT_MIN_PRICE)))
        team_size = int(request.form.get("team_size", config.get("team_size", MIN_PLAYERS_PER_TEAM)))
        initial_points = int(request.form.get("initial_points", config.get("initial_points", INITIAL_POINTS)))
        
        if not season_name:
            return jsonify({"error": "Season name is required"}), 400
        
        if team_size < 1:
            return jsonify({"error": "Team size must be at least 1"}), 400
        
        if initial_points < 1:
            return jsonify({"error": "Initial points must be at least 1"}), 400
        
        # Update files if provided
        players_file = request.files.get("players_file")
        captains_file = request.files.get("captains_file")
        
        if players_file:
            players_path = get_auction_players_file(auction_id)
            players_file.save(players_path)
            app.logger.info(f"Updated players file for auction {auction_id}")
        
        if captains_file:
            captains_path = get_auction_captains_file(auction_id)
            captains_file.save(captains_path)
            app.logger.info(f"Updated captains file for auction {auction_id}")
            
            # Re-extract captains list
            try:
                with open(captains_path, "r") as f:
                    cfg = yaml.safe_load(f)
                    raw_captains = cfg.get("captains", [])
                    captains_list = []
                    for c in raw_captains:
                        if isinstance(c, dict):
                            name = c.get("name", "").strip()
                            if name:
                                captains_list.append(name)
                        else:
                            captains_list.append(str(c).strip())
                    if captains_list:
                        config["captains_list"] = captains_list
            except Exception as e:
                app.logger.warning(f"Error parsing captains file: {str(e)}")
        
        # Update configuration
        config["season_name"] = season_name
        config["base_price"] = base_price
        config["team_size"] = team_size
        config["initial_points"] = initial_points
        config["updated_at"] = datetime.now().isoformat()
        
        save_auction_config(auction_id, config)
        
        app.logger.info(f"Updated auction config: {auction_id}")
        
        return jsonify({
            "auction_id": auction_id,
            "message": "Auction updated successfully",
            "config": config
        })
    except Exception as e:
        app.logger.error(f"Error updating auction config: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to update auction: {str(e)}"}), 500

@app.route("/api/auctions/<auction_id>", methods=["DELETE"])
def delete_auction(auction_id):
    """Delete an auction and all its associated files"""
    try:
        config = get_auction_config(auction_id)
        if not config:
            return jsonify({"error": "Auction not found"}), 404
        
        # Delete config file
        config_file = get_auction_config_file(auction_id)
        if os.path.exists(config_file):
            os.remove(config_file)
        
        # Delete players file
        players_file = get_auction_players_file(auction_id)
        if os.path.exists(players_file):
            os.remove(players_file)
        
        # Delete captains file
        captains_file = get_auction_captains_file(auction_id)
        if os.path.exists(captains_file):
            os.remove(captains_file)
        
        # Remove from cache
        if auction_id in auction_configs:
            del auction_configs[auction_id]
        
        app.logger.info(f"🗑️ Deleted auction: {auction_id}")
        
        return jsonify({
            "success": True,
            "message": "Auction deleted successfully"
        })
    except Exception as e:
        app.logger.error(f"Error deleting auction: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to delete auction: {str(e)}"}), 500

# Room management endpoints
@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    """List all available auction rooms"""
    try:
        rooms = []
        # Get all room files
        if os.path.exists(rooms_dir):
            for filename in os.listdir(rooms_dir):
                if filename.endswith("_state.json"):
                    room_id = filename.replace("_state.json", "")
                    rooms.append({
                        "room_id": room_id,
                        "name": room_id.replace("_", " ").title()
                    })
        
        # Include default room if it exists
        if os.path.exists(state_file):
            rooms.append({
                "room_id": DEFAULT_ROOM,
                "name": "Default Room"
            })
        
        # If no rooms exist, return empty list
        return jsonify({"rooms": rooms})
    except Exception as e:
        app.logger.error(f"Error listing rooms: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to list rooms"}), 500

@app.route("/api/rooms", methods=["POST"])
def create_room():
    """Create a new auction room"""
    try:
        data = request.get_json() or {}
        room_name = data.get("room_name", "").strip()
        
        if not room_name:
            # Generate random room ID
            room_id = str(uuid.uuid4())[:8]
        else:
            # Create room ID from name (sanitize)
            room_id = room_name.lower().replace(" ", "_").replace("-", "_")
            # Remove special characters
            room_id = "".join(c for c in room_id if c.isalnum() or c == "_")
            if not room_id:
                room_id = str(uuid.uuid4())[:8]
        
        # Initialize room state
        auction_state = get_room_state(room_id)
        players = load_players()
        auction_state["remaining"] = [p["name"] for p in players]
        auction_state["skipped"] = []
        auction_state["current"] = None
        auction_state["balances"] = {c: INITIAL_POINTS for c in DEFAULT_CAPTAINS}
        auction_state["teams"] = {c: [] for c in DEFAULT_CAPTAINS}
        auction_state["initialized"] = True
        
        # Save initial state
        save_auction_state(room_id)
        
        app.logger.info(f"🏠 Created new room: {room_id}")
        
        return jsonify({
            "room_id": room_id,
            "message": "Room created successfully"
        }), 201
    except Exception as e:
        app.logger.error(f"Error creating room: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create room"}), 500

@app.route("/api/status", methods=["GET"])
def get_status():
    try:
        auction_id = request.args.get("auction_id")
        room_id = request.args.get("room_id", DEFAULT_ROOM)
        
        # Use auction_id if provided, otherwise use room_id for backward compatibility
        initialize_auction(room_id, auction_id)
        auction_state = get_room_state(room_id)
        players = load_players(auction_id) if auction_id else load_players()
        player_dict = {p["name"]: p for p in players}
        
        total_assigned = sum(len(v) for v in auction_state["teams"].values())
        
        app.logger.debug(f"Status requested for auction {auction_id or room_id} - Total: {len(players)}, Remaining: {len(auction_state['remaining'])}, Assigned: {total_assigned}")
        
        # Load captains photos - function returns tuple (captains_dict, captains_list)
        captains_photos_dict, captains_list = load_captains(auction_id)
        
        # Get base price, team size, and initial points from auction config if available, otherwise use default
        base_price = DEFAULT_MIN_PRICE
        team_size = MIN_PLAYERS_PER_TEAM
        initial_points = INITIAL_POINTS
        if auction_id:
            config = get_auction_config(auction_id)
            if config:
                base_price = config.get("base_price", DEFAULT_MIN_PRICE)
                team_size = config.get("team_size", MIN_PLAYERS_PER_TEAM)
                initial_points = config.get("initial_points", INITIAL_POINTS)
        
        return jsonify({
            "auction_id": auction_id,
            "room_id": room_id,
            "totalPlayers": len(players),
            "remaining": auction_state["remaining"],  # Return array, not count
            "remainingCount": len(auction_state["remaining"]),  # Also include count for convenience
            "skippedCount": len(auction_state.get("skipped", [])),  # Include skipped count
            "assigned": total_assigned,
            "current": auction_state["current"],
            "balances": auction_state["balances"],
            "teams": auction_state["teams"],
            "lastAssignment": auction_state.get("last_assignment"),  # Include last assignment for undo
            "captains": captains_list,
            "captainsPhotos": captains_photos_dict,  # Add captain photos
            "minPrice": base_price,  # Use base_price from auction config
            "basePrice": base_price,  # Also include as basePrice for clarity
            "initialPoints": initial_points,  # Use initial_points from auction config
            "minPlayersPerTeam": team_size  # Use team_size from auction config
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
        data = request.get_json() or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        initialize_auction(room_id)
        auction_state = get_room_state(room_id)
        
        if auction_state["current"] is not None:
            app.logger.warning(f"Pick requested but player already selected in room {room_id}: {auction_state['current']}")
            return jsonify({"error": "A player is already selected"}), 400
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty for room {room_id}. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        if not auction_state["remaining"]:
            app.logger.warning(f"Pick requested but no players left in pool for room {room_id}")
            return jsonify({"error": "No players left in the pool"}), 400
        
        # Add a longer delay to simulate "fetching" process (increased for more suspense)
        time.sleep(2.5)
        
        auction_state["current"] = random.choice(auction_state["remaining"])
        app.logger.info(f"Player picked for room {room_id}: {auction_state['current']} (Remaining: {len(auction_state['remaining'])}, Skipped: {len(auction_state.get('skipped', []))})")
        
        # Auto-save state after picking
        save_auction_state(room_id)
        
        return jsonify({
            "room_id": room_id,
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
        data = request.get_json() or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        initialize_auction(room_id)
        auction_state = get_room_state(room_id)
        
        if auction_state["current"] is None:
            app.logger.warning(f"Skip requested but no player selected in room {room_id}")
            return jsonify({"error": "No player selected"}), 400
        
        cur = auction_state["current"]
        
        # Remove current player from remaining (if still there) and add to skipped
        if cur in auction_state["remaining"]:
            auction_state["remaining"].remove(cur)
        
        # Add to skipped list (only if not already there)
        if cur not in auction_state.get("skipped", []):
            auction_state.setdefault("skipped", []).append(cur)
            app.logger.info(f"Player skipped in room {room_id}: {cur} (Added to skipped pool. Skipped count: {len(auction_state['skipped'])})")
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty for room {room_id}. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        # Pick next player from remaining pool (if any)
        if auction_state["remaining"]:
            # Add a longer delay to simulate "fetching" process
            time.sleep(2.5)
            
            auction_state["current"] = random.choice(auction_state["remaining"])
            app.logger.info(f"New player picked after skip in room {room_id}: {auction_state['current']} (Remaining: {len(auction_state['remaining'])})")
        else:
            auction_state["current"] = None
            app.logger.info(f"No more players available after skip in room {room_id}")
        
        # Auto-save state after skipping
        save_auction_state(room_id)
        
        return jsonify({
            "room_id": room_id,
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
        data = request.json or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        auction_id = data.get("auction_id")
        
        # Get base price from auction config if available
        base_price = DEFAULT_MIN_PRICE
        if auction_id:
            config = get_auction_config(auction_id)
            if config:
                base_price = config.get("base_price", DEFAULT_MIN_PRICE)
        
        initialize_auction(room_id, auction_id)
        auction_state = get_room_state(room_id)
        
        captain = data.get("captain")
        price = int(data.get("price", base_price))
        current_player = auction_state["current"]
        
        app.logger.info(f"Assignment request for room {room_id}, auction {auction_id} - Player: {current_player}, Captain: {captain}, Price: {price} (base: {base_price})")
        
        if not current_player:
            app.logger.warning(f"Assignment requested but no player selected in room {room_id}")
            return jsonify({"error": "No player selected"}), 400
        
        # Get captains list from auction config
        if auction_id:
            config = get_auction_config(auction_id)
            captains_list = config.get("captains_list", DEFAULT_CAPTAINS) if config else DEFAULT_CAPTAINS
        else:
            captains_list = DEFAULT_CAPTAINS
        
        if not captain or captain not in captains_list:
            app.logger.warning(f"Invalid captain in assignment for room {room_id}: {captain}")
            return jsonify({"error": "Invalid captain"}), 400
        
        if price < base_price:
            app.logger.warning(f"Price too low for room {room_id}: {price} (min: {base_price})")
            return jsonify({"error": f"Minimum price is {base_price} (base price for this auction)"}), 400
        
        if price > auction_state["balances"][captain]:
            app.logger.warning(f"Insufficient balance for room {room_id} - Captain: {captain}, Balance: {auction_state['balances'][captain]}, Price: {price}")
            return jsonify({"error": "Not enough balance"}), 400
        
        # Assign player
        old_balance = auction_state["balances"][captain]
        auction_state["balances"][captain] -= price
        auction_state["teams"][captain].append({"player": current_player, "price": price})
        
        # Store last assignment for undo reference
        auction_state["last_assignment"] = {
            "player": current_player,
            "captain": captain,
            "price": price,
            "old_balance": old_balance,
            "new_balance": auction_state["balances"][captain],
            "timestamp": datetime.now().isoformat()
        }
        
        # Remove from remaining
        if current_player in auction_state["remaining"]:
            auction_state["remaining"].remove(current_player)
        
        app.logger.info(f"✅ ASSIGNED in room {room_id}: {current_player} -> {captain} for {price} points (Balance: {old_balance} -> {auction_state['balances'][captain]})")
        
        # Clear current player - user must manually pick next player
        auction_state["current"] = None
        app.logger.info(f"Current player cleared for room {room_id}. Waiting for manual pick.")
        
        # Check if we need to recycle skipped players
        if not auction_state["remaining"] and auction_state.get("skipped"):
            app.logger.info(f"Remaining pool empty for room {room_id}. Recycling {len(auction_state['skipped'])} skipped players...")
            auction_state["remaining"] = auction_state["skipped"].copy()
            random.shuffle(auction_state["remaining"])  # Randomize the skipped players
            auction_state["skipped"] = []  # Clear skipped list
            app.logger.info("✅ Skipped players recycled back into pool")
        
        # Check if all players are assigned
        if not auction_state["remaining"] and not auction_state.get("skipped"):
            app.logger.info(f"🎉 All players have been assigned in room {room_id}!")
        
        # Auto-save state after assignment
        save_auction_state(room_id)
        
        return jsonify({
            "success": True,
            "room_id": room_id,
            "message": f"{current_player} assigned to {captain} for {price} points",
            "current": None,  # Always return None - user must manually pick next
            "balances": auction_state["balances"],
            "teams": auction_state["teams"],
            "remaining": auction_state["remaining"],
            "remainingCount": len(auction_state["remaining"]),
            "skippedCount": len(auction_state.get("skipped", [])),
            "lastAssignment": auction_state.get("last_assignment")
        })
    except Exception as e:
        app.logger.error(f"Error in assign_player: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to assign player"}), 500

@app.route("/api/reset", methods=["POST"])
def reset_auction():
    try:
        data = request.get_json() or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        auction_id = data.get("auction_id")
        app.logger.warning(f"🔄 AUCTION RESET REQUESTED for room {room_id}, auction {auction_id}")
        
        # Get captains list and initial points from auction config
        if auction_id:
            config = get_auction_config(auction_id)
            captains_list = config.get("captains_list", DEFAULT_CAPTAINS) if config else DEFAULT_CAPTAINS
            initial_points = config.get("initial_points", INITIAL_POINTS) if config else INITIAL_POINTS
        else:
            captains_list = DEFAULT_CAPTAINS
            initial_points = INITIAL_POINTS
        
        # Force fresh initialization without loading saved state
        players = load_players(auction_id) if auction_id else load_players()
        current_player_names = {p["name"] for p in players}
        
        # Reset all state for this room
        auction_state = get_room_state(room_id)
        auction_state["remaining"] = [p["name"] for p in players]
        auction_state["skipped"] = []
        auction_state["current"] = None
        auction_state["balances"] = {c: initial_points for c in captains_list}
        auction_state["teams"] = {c: [] for c in captains_list}
        auction_state["initialized"] = True  # Mark as initialized so it doesn't try to load saved state
        
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
        save_auction_state(room_id)
        app.logger.info(f"✅ Auction reset successfully for room {room_id} - Fresh start initialized")
        app.logger.info(f"   - Total players: {len(players)}")
        app.logger.info(f"   - Remaining: {len(auction_state['remaining'])}")
        app.logger.info(f"   - Teams reset for {len(DEFAULT_CAPTAINS)} captains")
        
        return jsonify({"success": True, "room_id": room_id, "message": "Auction reset successfully"})
    except Exception as e:
        app.logger.error(f"Error in reset_auction: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to reset auction"}), 500

@app.route("/api/undo", methods=["POST"])
def undo_last_action():
    """Undo last action by restoring from backup file"""
    try:
        data = request.get_json() or {}
        auction_id = data.get("auction_id")
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        
        # For auction-based systems, use DEFAULT_ROOM as room_id (state is stored per auction via room_id)
        # The auction_id is used for configuration (players, captains, etc.) but state uses room_id
        app.logger.info(f"↩️ UNDO REQUESTED for room {room_id}, auction {auction_id}")
        
        # Initialize auction first
        initialize_auction(room_id, auction_id)
        
        # Get the state file path
        room_state_file = get_room_state_file(room_id)
        backup_file = room_state_file + ".backup"
        
        # Check if backup exists
        if not os.path.exists(backup_file):
            app.logger.warning(f"No backup file found for room {room_id}, nothing to undo")
            return jsonify({"error": "No previous state available to undo"}), 404
        
        # Load backup state
        try:
            with open(backup_file, "r") as f:
                backup_state = json.load(f)
            
            # Validate backup state
            if not isinstance(backup_state, dict):
                app.logger.warning(f"Invalid backup state format for room {room_id}")
                return jsonify({"error": "Invalid backup state format"}), 400
            
            # Restore state from backup
            auction_state = get_room_state(room_id)
            auction_state["remaining"] = backup_state.get("remaining", [])
            auction_state["current"] = backup_state.get("current")
            auction_state["balances"] = backup_state.get("balances", {})
            auction_state["teams"] = backup_state.get("teams", {})
            auction_state["skipped"] = backup_state.get("skipped", [])
            auction_state["last_assignment"] = backup_state.get("last_assignment")  # Restore last assignment
            auction_state["initialized"] = True
            
            # Restore the backup file as the current state file
            if os.path.exists(room_state_file):
                os.remove(room_state_file)
            os.rename(backup_file, room_state_file)
            
            # Save the restored state (this will create a new backup)
            save_auction_state(room_id)
            
            app.logger.info("✅ State restored from backup successfully")
            app.logger.info(f"   - Remaining: {len(auction_state['remaining'])}")
            app.logger.info(f"   - Current: {auction_state['current']}")
            app.logger.info(f"   - Total assigned: {sum(len(v) for v in auction_state['teams'].values())}")
            
            return jsonify({
                "success": True,
                "message": "Previous action undone successfully",
                "room_id": room_id,
                "auction_id": auction_id
            })
        except Exception as backup_error:
            app.logger.error(f"Error loading backup file: {str(backup_error)}", exc_info=True)
            return jsonify({"error": "Failed to restore backup state"}), 500
        
    except Exception as e:
        app.logger.error(f"Error in undo_last_action: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to undo action"}), 500

@app.route("/api/save", methods=["POST"])
def save_state():
    """Manually save current auction state"""
    try:
        data = request.get_json() or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        initialize_auction(room_id)
        success = save_auction_state(room_id)
        if success:
            return jsonify({"success": True, "room_id": room_id, "message": "State saved successfully"})
        else:
            return jsonify({"error": "Failed to save state"}), 500
    except Exception as e:
        app.logger.error(f"Error in save_state: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to save state"}), 500

@app.route("/api/load", methods=["POST"])
def load_state():
    """Manually load saved auction state"""
    try:
        data = request.get_json() or {}
        room_id = data.get("room_id", request.args.get("room_id", DEFAULT_ROOM))
        state_loaded = load_auction_state(room_id)
        if state_loaded:
            auction_state = get_room_state(room_id)
            auction_state["initialized"] = False  # Force re-initialization
            initialize_auction(room_id)
            return jsonify({"success": True, "room_id": room_id, "message": "State loaded successfully"})
        else:
            return jsonify({"error": "No saved state found or failed to load"}), 404
    except Exception as e:
        app.logger.error(f"Error in load_state: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to load state"}), 500

@app.route("/api/export", methods=["GET"])
def export_teams():
    """Export teams data as CSV or JSON"""
    try:
        room_id = request.args.get("room_id", DEFAULT_ROOM)
        initialize_auction(room_id)
        auction_state = get_room_state(room_id)
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
                    "Content-Disposition": f"attachment; filename=auction_results_{room_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
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


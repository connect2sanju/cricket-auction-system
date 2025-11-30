"""
User Management Module
Handles user authentication and user data storage
"""
import json
import os
import re
from datetime import datetime

# Path to users file
USERS_FILE = os.path.join(os.path.dirname(__file__), "users.json")

# Password validation constants
MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 50
REQUIRE_UPPERCASE = False
REQUIRE_LOWERCASE = False
REQUIRE_NUMBER = False
REQUIRE_SPECIAL = False

def validate_password(password):
    """
    Validate password strength
    Returns: (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"
    
    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters long"
    
    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must be no more than {MAX_PASSWORD_LENGTH} characters long"
    
    errors = []
    
    if REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
        errors.append("at least one uppercase letter")
    
    if REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
        errors.append("at least one lowercase letter")
    
    if REQUIRE_NUMBER and not re.search(r'[0-9]', password):
        errors.append("at least one number")
    
    if REQUIRE_SPECIAL and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        errors.append("at least one special character")
    
    if errors:
        return False, f"Password must contain {', '.join(errors)}"
    
    # Common weak passwords check
    weak_passwords = ['password', '123456', '12345678', 'qwerty', 'abc123', 'password123']
    if password.lower() in weak_passwords:
        return False, "Password is too common. Please choose a stronger password."
    
    return True, "Password is valid"

def load_users():
    """Load users from environment variables or JSON file (environment variables take priority)"""
    users = []
    
    # Method 1: Load from AUCTION_USERS environment variable (JSON format)
    # This is the recommended method for deployment
    env_users_json = os.environ.get("AUCTION_USERS")
    if env_users_json:
        try:
            users = json.loads(env_users_json)
            # Validate that it's a list
            if not isinstance(users, list):
                raise ValueError("AUCTION_USERS must be a JSON array")
            # Validate each user has required fields
            for user in users:
                if not isinstance(user, dict) or "username" not in user or "password" not in user:
                    raise ValueError("Each user must have 'username' and 'password' fields")
            return users
        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Invalid AUCTION_USERS environment variable: {e}. Please provide a valid JSON array.")
    
    # Method 2: Load from individual environment variables for admin
    # This is useful for simple deployments with just an admin user
    env_admin_user = os.environ.get("AUCTION_ADMIN_USER")
    env_admin_pass = os.environ.get("AUCTION_ADMIN_PASSWORD")
    if env_admin_user and env_admin_pass:
        users = [
            {
                "username": env_admin_user,
                "password": env_admin_pass,
                "role": "admin",
                "created_at": datetime.now().isoformat()
            }
        ]
        # Check for additional users in AUCTION_USERS_JSON (alternative name)
        additional_users_json = os.environ.get("AUCTION_USERS_JSON")
        if additional_users_json:
            try:
                additional_users = json.loads(additional_users_json)
                if isinstance(additional_users, list):
                    users.extend(additional_users)
            except json.JSONDecodeError:
                pass  # Ignore invalid additional users
        return users
    
    # Method 3: Load from users.json file (for local development only)
    # This should only be used in development, not in production
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r") as f:
                users = json.load(f)
            # Override any credentials from environment variables if set
            env_admin_user = os.environ.get("AUCTION_ADMIN_USER")
            env_admin_pass = os.environ.get("AUCTION_ADMIN_PASSWORD")
            if env_admin_user and env_admin_pass:
                # Update admin user password from environment
                for user in users:
                    if user.get("username") == env_admin_user:
                        user["password"] = env_admin_pass
                        break
            return users
        except Exception as e:
            print(f"Error loading users from file: {e}")
            raise ValueError(f"Failed to load users from file: {e}")
    
    # No users found - this is an error in production
    # In production, environment variables must be set
    is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("ENV") == "production"
    if is_production:
        raise ValueError(
            "No user credentials found. For production deployment, please set one of:\n"
            "  - AUCTION_USERS: JSON array of users\n"
            "  - AUCTION_ADMIN_USER and AUCTION_ADMIN_PASSWORD: For admin user"
        )
    
    # For local development, create a warning but allow empty users
    print("WARNING: No user credentials configured. Please set AUCTION_USERS or AUCTION_ADMIN_USER/AUCTION_ADMIN_PASSWORD")
    print("For local development, you can create users.json file from users.json.example")
    return []

def save_users(users):
    """Save users to JSON file"""
    try:
        with open(USERS_FILE, "w") as f:
            json.dump(users, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving users: {e}")
        return False

def get_user(username):
    """Get user by username"""
    users = load_users()
    for user in users:
        if user.get("username") == username:
            return user
    return None

def authenticate_user(username, password):
    """Authenticate user with username and password"""
    user = get_user(username)
    if user and user.get("password") == password:
        return user
    return None

def add_user(username, password, role="user"):
    """Add a new user"""
    users = load_users()
    
    # Check if user already exists
    if get_user(username):
        return False, "User already exists"
    
    # Validate username
    if not username or len(username.strip()) < 3:
        return False, "Username must be at least 3 characters long"
    
    if len(username.strip()) > 50:
        return False, "Username must be no more than 50 characters long"
    
    # Validate password
    is_valid, error_msg = validate_password(password)
    if not is_valid:
        return False, error_msg
    
    new_user = {
        "username": username.strip(),
        "password": password,
        "role": role,
        "created_at": datetime.now().isoformat()
    }
    
    users.append(new_user)
    if save_users(users):
        return True, "User added successfully"
    return False, "Failed to save user"

def update_user_password(username, new_password):
    """Update user password"""
    users = load_users()
    for user in users:
        if user.get("username") == username:
            # Validate new password
            is_valid, error_msg = validate_password(new_password)
            if not is_valid:
                return False, error_msg
            
            user["password"] = new_password
            if save_users(users):
                return True, "Password updated successfully"
            return False, "Failed to save password"
    return False, "User not found"

def delete_user(username):
    """Delete a user"""
    users = load_users()
    users = [u for u in users if u.get("username") != username]
    if save_users(users):
        return True, "User deleted successfully"
    return False, "Failed to delete user"

def list_users():
    """List all users (without passwords)"""
    users = load_users()
    return [
        {
            "username": u.get("username"),
            "role": u.get("role"),
            "created_at": u.get("created_at")
        }
        for u in users
    ]


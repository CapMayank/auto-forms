import json
import os
from pathlib import Path

# Path to the config file
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

# Default configuration
DEFAULT_CONFIG = {
    "watch_directory": str(Path(__file__).parent.parent / "watch_folder"),
    "processed_directory": str(Path(__file__).parent.parent / "data" / "processed"),
    "ocr_api_key": "",
    "confidence_threshold": 80
}

def load_config():
    if not os.path.exists(CONFIG_FILE):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
        
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
            # Ensure all default keys exist
            for key, value in DEFAULT_CONFIG.items():
                if key not in config:
                    config[key] = value
            return config
    except Exception as e:
        print(f"Error loading config: {e}. Using defaults.")
        return DEFAULT_CONFIG

def save_config(config_data):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config_data, f, indent=4)

# Initial load
config = load_config()

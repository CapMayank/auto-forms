import os
import sys

# Add backend directory to sys.path so we can import processor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from backend.processor import process_pdf

file_path = r"C:\Users\StrawHat\MasterRepo\web_develpoment\boardformmgmt\data\processed\doc4.pdf"
if not os.path.exists(file_path):
    # Try watch folder
    file_path = r"C:\Users\StrawHat\MasterRepo\web_develpoment\boardformmgmt\watch_folder\doc4.pdf"

if os.path.exists(file_path):
    print(f"Testing process_pdf on {file_path}")
    try:
        process_pdf(file_path)
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print("File not found")

import time
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from processor import process_pdf
from config import load_config

class PDFHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        
        filepath = event.src_path
        if filepath.lower().endswith(".pdf"):
            print(f"New PDF detected: {filepath}")
            # Add a small delay to ensure the file is completely written by the scanner
            time.sleep(2) 
            try:
                process_pdf(filepath)
                print(f"Successfully processed: {filepath}")
            except Exception as e:
                print(f"Error processing {filepath}: {e}")

def main():
    config = load_config()
    WATCH_DIR = config["watch_directory"]
    
    if not os.path.exists(WATCH_DIR):
        os.makedirs(WATCH_DIR)
        print(f"Created watch directory at {WATCH_DIR}")

    event_handler = PDFHandler()
    observer = Observer()
    observer.schedule(event_handler, WATCH_DIR, recursive=False)
    
    print(f"Starting watcher on directory: {WATCH_DIR}")
    observer.start()
    
    try:
        while True:
            # We could implement a check here to reload config and restart observer if WATCH_DIR changes
            # For simplicity, we just keep it running. Admin can restart the service if watch dir changes.
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("Watcher stopped.")
    
    observer.join()

if __name__ == "__main__":
    main()

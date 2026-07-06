import os
import json
import fitz  # PyMuPDF
import cv2
import numpy as np
from google.cloud import vision
from database import SessionLocal
import models
import shutil
import requests
import math
from pyzbar.pyzbar import decode
from datetime import datetime

def send_progress(filename: str, status: str, progress: int, total_pages: int, current_page: int):
    try:
        payload = {
            "filename": filename,
            "status": status,
            "progress": progress,
            "total_pages": total_pages,
            "current_page": current_page
        }
        try:
            requests.post("http://localhost:8000/api/internal/progress", json=payload, timeout=2)
        except requests.ConnectionError:
            requests.post("http://backend:8000/api/internal/progress", json=payload, timeout=2)
    except Exception as e:
        print(f"Failed to send progress: {e}")


DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
FAILED_DIR = os.path.join(DATA_DIR, "failed")

# Precise coordinates calculated from OCR bounding boxes (X, Y, W, H)
CROP_ZONES = {
    "9th": {"photo": [1950, 850, 450, 460], "signature": [1950, 1310, 450, 160]},
    "10th": {"photo": [1950, 850, 450, 460], "signature": [1950, 1310, 450, 160]},
    "11th": {"photo": [1950, 850, 450, 460], "signature": [1950, 1310, 450, 160]},
    "12th": {"photo": [1950, 850, 450, 460], "signature": [1950, 1310, 450, 160]},
}

def identify_form(img_path: str, pdf_path: str) -> str:
    # 1. Try QR Code with pre-processing to improve detection
    try:
        img = cv2.imread(img_path)
        
        # PERFORMANCE OPTIMIZATION: QR codes are always at the top of the form.
        # Crop the image to the top 30% to prevent PyZbar from taking 60+ seconds 
        # scanning noisy text on the rest of the page.
        h, w = img.shape[:2]
        crop_img = img[0:int(h*0.3), 0:w]
        
        decoded_objects = decode(crop_img)
        
        # If normal decode fails, try thresholding
        if not decoded_objects:
            gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
            _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
            decoded_objects = decode(thresh)
            
        for obj in decoded_objects:
            data = obj.data.decode('utf-8')
            try:
                json_data = json.loads(data)
                if "class" in json_data:
                    return json_data["class"]
            except json.JSONDecodeError:
                pass
    except Exception as e:
        print(f"QR decode error: {e}")
        
    print("No valid QR code found in image, falling back to text matching.")
    
    # 2. Fallback to text matching
    try:
        doc = fitz.open(pdf_path)
        text = doc[0].get_text("text").lower()
        doc.close()
        if "9th" in text or "ix" in text or "नामांकन आवेदन पत्र कक्षा 9वीं" in text:
            return "9th"
        elif "10th" in text or "x" in text:
            return "10th"
        elif "11th" in text or "xi" in text:
            return "11th"
        elif "12th" in text or "xii" in text:
            return "12th"
    except Exception as e:
        print(f"Fallback text matching error: {e}")
        
    return "10th" # Ultimate fallback

def process_image(img_path: str) -> str:
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    coords = np.column_stack(np.where(img > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle > 45:
        angle = angle - 90
    if 0.5 < abs(angle) < 15:
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(img)
    enhanced_path = img_path.replace(".png", "_enhanced.png")
    cv2.imwrite(enhanced_path, enhanced)
    return enhanced_path

def generate_mock_ocr_data(form_class: str):
    return {
        "student_name": "", "father_name": "", "mother_name": "", "dob": "",
        "village": "", "mobile": "", "admission_no": "", "words": []
    }

def extract_real_ocr(img_path: str, form_class: str):
    try:
        from google.api_core.client_options import ClientOptions
        import json
        config_path = os.path.join(os.path.dirname(__file__), 'config.json')
        with open(config_path, 'r') as f:
            config = json.load(f)
            
        api_key = config.get("ocr_api_key")
        if api_key:
            client_options = ClientOptions(api_key=api_key)
            client = vision.ImageAnnotatorClient(client_options=client_options)
        else:
            client = vision.ImageAnnotatorClient()
            
        with open(img_path, "rb") as image_file:
            content = image_file.read()
        image = vision.Image(content=content)
        
        response = client.document_text_detection(image=image)
        if response.error.message:
            print(f"Vision API Error: {response.error.message}")
            return generate_mock_ocr_data(form_class)
            
        text = response.full_text_annotation.text
        
        results = {
            "student_name": "", "father_name": "", "mother_name": "", "dob": "",
            "village": "", "mobile": "", "admission_no": "", "words": []
        }
        
        # Extract word bounding boxes for the frontend selectable UI
        if response.text_annotations:
            # Skip the first element which is the entire block of text
            for word_annotation in response.text_annotations[1:]:
                # Bounding box coordinates
                vertices = [{"x": vertex.x, "y": vertex.y} for vertex in word_annotation.bounding_poly.vertices]
                results["words"].append({
                    "text": word_annotation.description,
                    "bbox": vertices
                })
        
        # Parse basic metadata using the smart parser
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        def find_idx(substring):
            for i, line in enumerate(lines):
                if substring in line.lower():
                    return i
            return -1
            
        idx2 = find_idx("2. full name of candidate")
        idx3 = find_idx("3. full name of father")
        idx4 = find_idx("4. full name of mother")
        idx5 = find_idx("5. date of birth")
        idx_dob_words = find_idx("date of birth (in words)")
        
        noise_words = ["roll number", "result", "board name", "year", "a", "b", "c"]
        
        def extract_between(start_idx, end_idx):
            if start_idx == -1 or end_idx == -1 or start_idx >= end_idx:
                return ""
            extracted = []
            for j in range(start_idx + 1, end_idx):
                val = lines[j]
                if val.lower() not in noise_words and len(val) > 1:
                    extracted.append(val)
            return " ".join(extracted)
            
        results["student_name"] = extract_between(idx2, idx3)
        results["father_name"] = extract_between(idx3, idx4)
        results["mother_name"] = extract_between(idx4, idx5)
        raw_dob = extract_between(idx5, idx_dob_words)
        results["dob"] = raw_dob.replace(" ", "")
            
        return results
        
    except Exception as e:
        print(f"Google Cloud Vision failed: {e}")
        return generate_mock_ocr_data(form_class)

def process_pdf(file_path: str, existing_form_id: int = None):
    filename = os.path.basename(file_path)
    print(f"Processing new file: {filename}")
    
    send_progress(filename, "Starting processing...", 0, 1, 1)
    
    doc = fitz.open(file_path)
    
    temp_page = doc[0]
    temp_pix = temp_page.get_pixmap(dpi=300)
    temp_img_path = os.path.join(PROCESSED_DIR, f"temp_qr_{filename}.png")
    temp_pix.save(temp_img_path)
    
    form_class = identify_form(temp_img_path, file_path)
    os.remove(temp_img_path)
    
    if form_class == "unknown":
        print(f"Could not identify form class for {filename}. Moving to failed.")
        doc.close()
        shutil.move(file_path, os.path.join(FAILED_DIR, filename))
        send_progress(filename, "Failed to identify form.", 100, 1, 1)
        return
        
    print(f"Identified as {form_class} form.")
    
    total_pages = len(doc)
    total_forms = math.ceil(total_pages / 2)
    
    send_progress(filename, f"Identified {total_forms} form(s).", 5, total_forms, 1)
    
    for i in range(0, total_pages, 2):
        current_form = (i // 2) + 1
        page_index = i
        back_page_index = i + 1
        base_progress = int((current_form - 1) / total_forms * 100)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_name = os.path.splitext(filename)[0]
        form_filename_base = f"{timestamp}_{base_name}_form{current_form}" if total_forms > 1 else f"{timestamp}_{base_name}"
        
        class_dir = os.path.join(PROCESSED_DIR, form_class)
        pdf_dir = os.path.join(class_dir, "pdf")
        img_dir = os.path.join(class_dir, "images")
        crop_dir = os.path.join(class_dir, "crops")
        os.makedirs(pdf_dir, exist_ok=True)
        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(crop_dir, exist_ok=True)
        
        # FRONT PAGE
        send_progress(filename, f"Converting front page...", base_progress + 5, total_forms, current_form)
        front_pix = doc[page_index].get_pixmap(dpi=300)
        front_img_path = os.path.join(img_dir, f"{form_filename_base}_front.png")
        front_pix.save(front_img_path)
        front_enhanced_path = process_image(front_img_path)
        
        # BACK PAGE
        back_enhanced_path = None
        if back_page_index < total_pages:
            send_progress(filename, f"Converting back page...", base_progress + 10, total_forms, current_form)
            back_pix = doc[back_page_index].get_pixmap(dpi=300)
            back_img_path = os.path.join(img_dir, f"{form_filename_base}_back.png")
            back_pix.save(back_img_path)
            back_enhanced_path = process_image(back_img_path)
        
        # CROP PHOTO/SIG (Front Page)
        send_progress(filename, "Extracting photo & signature...", base_progress + 20, total_forms, current_form)
        img = cv2.imread(front_enhanced_path)
        h, w = img.shape[:2]
        
        # 1. Fetch Learned Crop Coordinates (or fallback to defaults)
        db_session = SessionLocal()
        learned_zone = db_session.query(models.LearnedCropZone).filter(models.LearnedCropZone.form_class == form_class).first()
        
        if learned_zone and learned_zone.photo_x is not None:
            photo_coords = [learned_zone.photo_x, learned_zone.photo_y, learned_zone.photo_width, learned_zone.photo_height]
            # When the user manually crops, they usually crop BOTH photo and signature at the same time.
            # We'll use the same coords for sig, or extrapolate if we wanted to split them. 
            # We'll split the manual crop in half: top 75% photo, bottom 25% signature.
            sig_coords = [
                learned_zone.sig_x, 
                learned_zone.sig_y + int(learned_zone.sig_height * 0.75), 
                learned_zone.sig_width, 
                int(learned_zone.sig_height * 0.25)
            ]
            photo_coords[3] = int(photo_coords[3] * 0.75) # Adjust photo height
        else:
            photo_coords = CROP_ZONES.get(form_class, CROP_ZONES["10th"])["photo"]
            sig_coords = CROP_ZONES.get(form_class, CROP_ZONES["10th"])["signature"]
            
        # 2. Apply Face Detection to dynamically snap the photo box!
        try:
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            search_roi = img[0:int(h*0.6), int(w*0.5):w] # Search top right
            faces = face_cascade.detectMultiScale(search_roi, scaleFactor=1.1, minNeighbors=5, minSize=(100, 100))
            
            if len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)
                fx, fy, fw, fh = faces[0]
                full_fx = fx + int(w*0.5)
                full_fy = fy
                
                pad_w = int(fw * 0.4)
                pad_top = int(fh * 0.5)
                pad_bottom = int(fh * 1.0)
                
                photo_coords = [
                    max(0, full_fx - pad_w),
                    max(0, full_fy - pad_top),
                    fw + (pad_w * 2),
                    fh + pad_top + pad_bottom
                ]
                print(f"Face detected! Updated photo crop to {photo_coords}")
        except Exception as e:
            print(f"Face detection failed: {e}")
        
        db_session.close()
        
        photo_crop, sig_crop, combined_path = None, None, None
        
        if photo_coords[1]+photo_coords[3] <= h and photo_coords[0]+photo_coords[2] <= w:
            photo_crop = img[photo_coords[1]:photo_coords[1]+photo_coords[3], photo_coords[0]:photo_coords[0]+photo_coords[2]]
        if sig_coords[1]+sig_coords[3] <= h and sig_coords[0]+sig_coords[2] <= w:
            sig_crop = img[sig_coords[1]:sig_coords[1]+sig_coords[3], sig_coords[0]:sig_coords[0]+sig_coords[2]]
            
        if photo_crop is not None and sig_crop is not None:
            if photo_crop.shape[1] != sig_crop.shape[1]:
                sig_crop = cv2.resize(sig_crop, (photo_crop.shape[1], sig_crop.shape[0]))
            combined = cv2.vconcat([photo_crop, sig_crop])
            combined_path = os.path.join(crop_dir, f"{form_filename_base}_photo_sig.jpg")
            cv2.imwrite(combined_path, combined, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
        elif photo_crop is not None:
            combined_path = os.path.join(crop_dir, f"{form_filename_base}_photo_sig.jpg")
            cv2.imwrite(combined_path, photo_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
            
        # OCR Extraction
        send_progress(filename, "Running OCR Front...", base_progress + 50, total_forms, current_form)
        ocr_front = extract_real_ocr(front_enhanced_path, form_class)
        
        ocr_back = {"words": []}
        if back_enhanced_path:
            send_progress(filename, "Running OCR Back...", base_progress + 70, total_forms, current_form)
            ocr_back = extract_real_ocr(back_enhanced_path, form_class)
        
        # Combine extracted bounding box data
        extracted_data = {
            "page1": ocr_front["words"],
            "page2": ocr_back["words"]
        }
        
        # Save to DB
        send_progress(filename, "Saving to database...", base_progress + 90, total_forms, current_form)
        db = SessionLocal()
        try:
            if existing_form_id:
                form = db.query(models.Form).filter(models.Form.id == existing_form_id).first()
                if form:
                    form.scan_image_path = front_enhanced_path
                    form.scan_image_back_path = back_enhanced_path
                    form.photo_path = combined_path
                    form.signature_path = combined_path
                    form.extracted_data = extracted_data
                    form.student_name = ocr_front["student_name"]
                    form.father_name = ocr_front["father_name"]
                    form.mother_name = ocr_front["mother_name"]
                    form.dob = ocr_front["dob"]
                    db.commit()
            else:
                new_form = models.Form(
                    filename=form_filename_base,
                    form_type=f"{form_class} Examination" if form_class in ["10th", "12th"] else f"{form_class} Enrollment",
                    form_class=form_class,
                    status="OCR Done",
                    scan_image_path=front_enhanced_path,
                    scan_image_back_path=back_enhanced_path,
                    photo_path=combined_path,
                    signature_path=combined_path,
                    student_name=ocr_front["student_name"],
                    father_name=ocr_front["father_name"],
                    mother_name=ocr_front["mother_name"],
                    dob=ocr_front["dob"],
                    extracted_data=extracted_data
                )
                db.add(new_form)
                db.commit()
                db.refresh(new_form)
                db.add(models.TimelineEvent(form_id=new_form.id, action="Received", user="System"))
                db.add(models.TimelineEvent(form_id=new_form.id, action="Processed Dual Pages", user="System"))
                db.commit()
        except Exception as e:
            print(f"Database error: {e}")
            db.rollback()
        finally:
            db.close()
    
    send_progress(filename, "Completed", 100, total_forms, total_forms)
    doc.close()
    
    timestamp_prefix = datetime.now().strftime("%Y%m%d_%H%M%S")
    class_dir = os.path.join(PROCESSED_DIR, form_class)
    pdf_dir = os.path.join(class_dir, "pdf")
    os.makedirs(pdf_dir, exist_ok=True)
    shutil.move(file_path, os.path.join(pdf_dir, f"{timestamp_prefix}_{filename}"))

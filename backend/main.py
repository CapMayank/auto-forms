from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import models
from database import engine, get_db
from datetime import datetime
import os
import shutil
import uuid
from config import load_config, save_config
from processor import process_pdf
import zipfile
import io
from fastapi.responses import StreamingResponse

# Create DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Board Form Tracker API")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Create a copy of the list to iterate over
        connections = list(self.active_connections)
        for connection in connections:
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()


# Setup CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files to serve images from the data directory
data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
if not os.path.exists(data_dir):
    os.makedirs(data_dir)

class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        return response

app.mount("/data", CORSStaticFiles(directory=data_dir), name="data")

# Pydantic models
class FormBase(BaseModel):
    filename: str
    form_type: Optional[str] = None
    academic_year: Optional[str] = "2026-2027"
    form_class: str
    student_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    dob: Optional[str] = None
    village: Optional[str] = None
    mobile: Optional[str] = None
    admission_no: Optional[str] = None
    status: str
    verification_status: str
    submission_status: str
    notes: Optional[str] = None
    portal_status: Optional[str] = "Not Filled"
    portal_issue_description: Optional[str] = None
    application_number: Optional[str] = None
    scan_image_path: Optional[str] = None
    scan_image_back_path: Optional[str] = None
    photo_path: Optional[str] = None
    signature_path: Optional[str] = None
    extracted_data: dict

class FormResponse(FormBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class FormUpdate(BaseModel):
    status: Optional[str] = None
    verification_status: Optional[str] = None
    submission_status: Optional[str] = None
    notes: Optional[str] = None
    portal_status: Optional[str] = None
    portal_issue_description: Optional[str] = None
    application_number: Optional[str] = None
    extracted_data: Optional[dict] = None
    student_name: Optional[str] = None
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    dob: Optional[str] = None
    village: Optional[str] = None
    mobile: Optional[str] = None
    admission_no: Optional[str] = None

class TimelineEventResponse(BaseModel):
    id: int
    form_id: int
    action: str
    timestamp: str
    user: str

    class Config:
        from_attributes = True

class BulkAction(BaseModel):
    form_ids: List[int]
    action: str # "Mark Verified", "Move to Ready", "Delete"

class LoginRequest(BaseModel):
    username: str
    password: str

class SettingsUpdate(BaseModel):
    watch_directory: str
    processed_directory: str
    ocr_api_key: str
    confidence_threshold: int

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(models.Form).count()
    completed = db.query(models.Form).filter(models.Form.status == "Completed").count()
    pending = db.query(models.Form).filter(models.Form.status.in_(["Received", "Scanned", "OCR Done"])).count()
    ready = db.query(models.Form).filter(models.Form.status == "Ready").count()
    submitted = db.query(models.Form).filter(models.Form.status == "Submitted").count()
    rejected = db.query(models.Form).filter(models.Form.status == "Rejected").count()
    pending_rescan = db.query(models.Form).filter(models.Form.status == "Pending Rescan").count()
    
    classes = ["9th", "10th", "11th", "12th"]
    class_stats = {}
    for cls in classes:
        cls_total = db.query(models.Form).filter(models.Form.form_class == cls).count()
        cls_completed = db.query(models.Form).filter(models.Form.form_class == cls, models.Form.status == "Completed").count()
        class_stats[cls] = {
            "total": cls_total,
            "completed": cls_completed,
            "percent": int((cls_completed / cls_total * 100)) if cls_total > 0 else 0
        }

    return {
        "overview": {
            "Total": total,
            "Completed": completed,
            "Pending Verification": pending,
            "Ready for Entry": ready,
            "Submitted": submitted,
            "Rejected": rejected
        },
        "pending_rescan": pending_rescan,
        "class_stats": class_stats
    }

@app.get("/api/forms", response_model=List[FormResponse])
def get_forms(
    db: Session = Depends(get_db), 
    form_class: Optional[str] = None, 
    status: Optional[str] = None,
    portal_status: Optional[str] = None,
    search: Optional[str] = None
):
    query = db.query(models.Form)
    if form_class:
        query = query.filter(models.Form.form_class == form_class)
    if status:
        query = query.filter(models.Form.status == status)
    if portal_status:
        query = query.filter(models.Form.portal_status == portal_status)
    if search:
        search = f"%{search}%"
        query = query.filter(
            (models.Form.student_name.ilike(search)) |
            (models.Form.father_name.ilike(search)) |
            (models.Form.village.ilike(search)) |
            (models.Form.mobile.ilike(search)) |
            (models.Form.admission_no.ilike(search))
        )
    
    forms = query.all()
    # convert datetime to string for response
    for f in forms:
        f.created_at = f.created_at.isoformat()
        f.updated_at = f.updated_at.isoformat()
    return forms

@app.get("/api/forms/{form_id}", response_model=FormResponse)
def get_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    form.created_at = form.created_at.isoformat()
    form.updated_at = form.updated_at.isoformat()
    return form

@app.get("/api/forms/{form_id}/timeline", response_model=List[TimelineEventResponse])
def get_form_timeline(form_id: int, db: Session = Depends(get_db)):
    events = db.query(models.TimelineEvent).filter(models.TimelineEvent.form_id == form_id).order_by(models.TimelineEvent.timestamp.desc()).all()
    for e in events:
        e.timestamp = e.timestamp.isoformat()
    return events

@app.put("/api/forms/{form_id}", response_model=FormResponse)
def update_form(form_id: int, form_update: FormUpdate, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    update_data = form_update.dict(exclude_unset=True)
    status_changed = False
    
    for key, value in update_data.items():
        if key == 'status' and getattr(form, 'status') != value:
            status_changed = True
        setattr(form, key, value)
        
    db.commit()
    
    if status_changed:
        timeline_event = models.TimelineEvent(form_id=form.id, action=f"Status updated to {form.status}", user="User")
        db.add(timeline_event)
        db.commit()

    db.refresh(form)
    form.created_at = form.created_at.isoformat()
    form.updated_at = form.updated_at.isoformat()
    return form

@app.post("/api/forms/bulk")
def bulk_action(action_req: BulkAction, db: Session = Depends(get_db)):
    forms = db.query(models.Form).filter(models.Form.id.in_(action_req.form_ids)).all()
    
    for form in forms:
        if action_req.action == "Delete":
            # Hard Delete
            if form.scan_image_path and os.path.exists(form.scan_image_path):
                os.remove(form.scan_image_path)
            if form.scan_image_back_path and os.path.exists(form.scan_image_back_path):
                os.remove(form.scan_image_back_path)
            if form.photo_path and os.path.exists(form.photo_path):
                os.remove(form.photo_path)
            if form.signature_path and form.signature_path != form.photo_path and os.path.exists(form.signature_path):
                os.remove(form.signature_path)
            
            # Remove original PDF if we can deduce it
            # The original PDF might be in {form_class}/pdf/{filename}
            # For simplicity, if we find it, delete it.
            db.delete(form)
        else:
            if action_req.action == "Mark Verified":
                form.status = "Verified"
                form.verification_status = "Verified"
            elif action_req.action == "Move to Ready":
                form.status = "Ready"
            
            timeline_event = models.TimelineEvent(form_id=form.id, action=f"Bulk action: {action_req.action}", user="User")
            db.add(timeline_event)
            
    db.commit()
    return {"message": f"Successfully applied {action_req.action} to {len(forms)} forms"}

@app.delete("/api/forms/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form_id: int, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Hard Delete
    if form.scan_image_path and os.path.exists(form.scan_image_path):
        os.remove(form.scan_image_path)
    if form.scan_image_back_path and os.path.exists(form.scan_image_back_path):
        os.remove(form.scan_image_back_path)
    if form.photo_path and os.path.exists(form.photo_path):
        os.remove(form.photo_path)
    if form.signature_path and form.signature_path != form.photo_path and os.path.exists(form.signature_path):
        os.remove(form.signature_path)
        
    db.delete(form)
    db.commit()
    return None

class ClassUpdate(BaseModel):
    new_class: str

@app.put("/api/forms/{form_id}/class")
def update_form_class(form_id: int, req: ClassUpdate, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    old_class = form.form_class
    form.form_class = req.new_class
    form.form_type = f"{req.new_class} Examination" if req.new_class in ["10th", "12th"] else f"{req.new_class} Enrollment"
    
    timeline_event = models.TimelineEvent(form_id=form.id, action=f"Class manually changed from {old_class} to {req.new_class}", user="User")
    db.add(timeline_event)
    db.commit()
    return {"message": "Class updated successfully"}

class ExportRequest(BaseModel):
    form_ids: List[int]

@app.post("/api/forms/export-assets")
def export_assets(req: ExportRequest, db: Session = Depends(get_db)):
    forms = db.query(models.Form).filter(models.Form.id.in_(req.form_ids)).all()
    
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w') as zf:
        for form in forms:
            identifier = form.admission_no or f"Form_{form.id}"
            if form.photo_path and os.path.exists(form.photo_path):
                zf.write(form.photo_path, arcname=f"{identifier}_Photo.jpg")
            if form.signature_path and os.path.exists(form.signature_path):
                zf.write(form.signature_path, arcname=f"{identifier}_Signature.jpg")
                
    memory_file.seek(0)
    return StreamingResponse(
        memory_file, 
        media_type="application/zip", 
        headers={"Content-Disposition": "attachment; filename=assets_export.zip"}
    )

# --- NEW ENDPOINTS ---

@app.post("/api/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == req.username).first()
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "fake-jwt-token", "role": user.role, "username": user.username}

@app.get("/api/settings")
def get_settings():
    return load_config()

@app.put("/api/settings")
def update_settings(settings: SettingsUpdate):
    save_config(settings.dict())
    return {"message": "Settings updated successfully"}

@app.get("/api/activity", response_model=List[TimelineEventResponse])
def get_global_activity(db: Session = Depends(get_db), limit: int = 50):
    events = db.query(models.TimelineEvent).order_by(models.TimelineEvent.timestamp.desc()).limit(limit).all()
    for e in events:
        e.timestamp = e.timestamp.isoformat()
    return events

@app.post("/api/forms/{form_id}/rescan")
async def upload_rescan(form_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    config = load_config()
    incoming_dir = os.path.join(os.path.dirname(__file__), "..", "data", "incoming")
    os.makedirs(incoming_dir, exist_ok=True)
    
    temp_path = os.path.join(incoming_dir, f"rescan_{form_id}_{uuid.uuid4().hex[:8]}.pdf")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Reprocess this specific file, overriding the current form record
        process_pdf(temp_path, existing_form_id=form_id)
        
        # Reload form from DB
        db.refresh(form)
        form.status = "OCR Done"
        
        timeline_event = models.TimelineEvent(form_id=form.id, action="Replacement scan uploaded & processed", user="Staff")
        db.add(timeline_event)
        db.commit()
        
        return {"message": "Rescan processed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/forms/{form_id}/update-photo")
async def update_photo(
    form_id: int, 
    file: UploadFile = File(...), 
    x: Optional[int] = Form(None),
    y: Optional[int] = Form(None),
    w: Optional[int] = Form(None),
    h: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    class_folder = form.form_class if form.form_class else "Unknown"
    crops_dir = os.path.join(os.path.dirname(__file__), "..", "data", "processed", class_folder, "crops")
    os.makedirs(crops_dir, exist_ok=True)
    
    # Save the custom cropped photo
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_manual_crop.jpg"
    file_path = os.path.join(crops_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update paths in database
    form.photo_path = file_path
    form.signature_path = file_path
    
    # Learn the crop coordinates
    if form.form_class and x is not None and y is not None:
        zone = db.query(models.LearnedCropZone).filter(models.LearnedCropZone.form_class == form.form_class).first()
        if not zone:
            zone = models.LearnedCropZone(form_class=form.form_class)
            db.add(zone)
        # Update learned coordinates
        zone.photo_x = x
        zone.photo_y = y
        zone.photo_width = w
        zone.photo_height = h
        zone.sig_x = x
        zone.sig_y = y
        zone.sig_width = w
        zone.sig_height = h
    
    timeline_event = models.TimelineEvent(form_id=form.id, action="Manually cropped Photo/Signature", user="User")
    db.add(timeline_event)
    db.commit()
    
    return {"message": "Crop saved successfully"}

class ProgressUpdate(BaseModel):
    filename: str
    status: str
    progress: int
    total_pages: int = 1
    current_page: int = 1

@app.websocket("/api/ws/progress")
async def websocket_progress_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect messages from client, but we must receive to keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/api/internal/progress")
async def internal_progress_update(update: ProgressUpdate):
    await manager.broadcast(update.dict())
    return {"status": "ok"}

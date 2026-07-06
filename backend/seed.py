import random
from database import SessionLocal
import models
from processor import generate_mock_ocr_data

def seed_db():
    from database import engine
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Create users if they don't exist
    if not db.query(models.User).first():
        admin = models.User(username="admin", password_hash="admin", role="Admin")
        staff = models.User(username="staff", password_hash="staff", role="Staff")
        db.add_all([admin, staff])
        db.commit()
    classes = ["9th", "10th", "11th", "12th"]
    statuses = ["Received", "Scanned", "OCR Done", "Verified", "Ready", "Submitted", "Completed", "Rejected"]
    
    for i in range(20):
        form_class = random.choice(classes)
        status = random.choice(statuses)
        ocr_results = generate_mock_ocr_data(form_class)
        
        new_form = models.Form(
            filename=f"scan_{i:03d}.pdf",
            form_type=f"{form_class} Examination" if form_class in ["10th", "12th"] else f"{form_class} Enrollment",
            form_class=form_class,
            status=status,
            verification_status="Verified" if status in ["Ready", "Submitted", "Completed"] else "Pending",
            submission_status="Submitted" if status in ["Submitted", "Completed"] else "Not Submitted",
            student_name=ocr_results["student_name"],
            father_name=ocr_results["father_name"],
            mother_name=ocr_results["mother_name"],
            dob=ocr_results["dob"],
            village=ocr_results["village"],
            mobile=ocr_results["mobile"],
            admission_no=ocr_results["admission_no"],
            extracted_data=ocr_results["extracted_data"],
            notes="Sample notes generated during seeding." if random.random() > 0.5 else ""
        )
        db.add(new_form)
        db.commit()
        db.refresh(new_form)
        
        # Add timeline events based on status
        events = ["Received", "Scanned", "OCR Done"]
        if status in ["Verified", "Ready", "Submitted", "Completed"]:
            events.append("Verified")
        if status in ["Ready", "Submitted", "Completed"]:
            events.append("Ready")
        if status in ["Submitted", "Completed"]:
            events.append("Submitted")
        
        for action in events:
            db.add(models.TimelineEvent(form_id=new_form.id, action=action, user="System" if action != "Verified" else "Office Staff"))
            
        db.commit()

    db.close()
    print("Database seeded with 20 dummy forms!")

if __name__ == "__main__":
    seed_db()

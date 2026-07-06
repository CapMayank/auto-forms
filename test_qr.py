import fitz
import cv2
import json
import os
from pyzbar.pyzbar import decode

def test_qr(pdf_path):
    print(f"Testing {pdf_path}")
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(dpi=300)
    img_path = "test_qr_out.png"
    pix.save(img_path)
    
    img = cv2.imread(img_path)
    
    print("--- Testing PyZbar ---")
    decoded = decode(img)
    if decoded:
        for obj in decoded:
            print(obj.data.decode('utf-8'))
    else:
        print("PyZbar found nothing.")
        
    print("--- Testing OpenCV ---")
    detector = cv2.QRCodeDetector()
    data, bbox, _ = detector.detectAndDecode(img)
    if data:
        print(f"OpenCV found: {data}")
    else:
        print("OpenCV found nothing.")
        
    # Also test WechatQRCode if available (it's much better)
    try:
        detector_wechat = cv2.wechat_qrcode_WeChatQRCode()
        res, points = detector_wechat.detectAndDecode(img)
        if res:
            print(f"WeChatQRCode found: {res}")
        else:
            print("WeChatQRCode found nothing.")
    except AttributeError:
        print("WeChatQRCode not installed/available in this OpenCV version.")
        
    print("--- Text Fallback Test ---")
    text = doc[0].get_text("text").lower()
    print("Text snippet:", text[:100].replace("\n", " "))
    if "9th" in text or "ix" in text or "नामांकन आवेदन पत्र कक्षा 9वीं" in text:
        print("Text fallback: 9th")
    elif "10th" in text or "x" in text:
        print("Text fallback: 10th")
    elif "11th" in text or "xi" in text:
        print("Text fallback: 11th")
    elif "12th" in text or "xii" in text:
        print("Text fallback: 12th")
    else:
        print("Text fallback: None")

if __name__ == "__main__":
    test_file = r"C:\Users\StrawHat\MasterRepo\web_develpoment\boardformmgmt\watch_folder\doc4.pdf"
    if not os.path.exists(test_file):
        test_file = r"C:\Users\StrawHat\MasterRepo\web_develpoment\boardformmgmt\data\processed\doc4.pdf"
    if os.path.exists(test_file):
        test_qr(test_file)
    else:
        print("File not found")

import sys
import os
import json
from google.cloud import vision
from google.api_core.client_options import ClientOptions

def test_ocr():
    with open("C:\\Users\\StrawHat\\MasterRepo\\web_develpoment\\boardformmgmt\\backend\\config.json", "r") as f:
        config = json.load(f)
    api_key = config.get("ocr_api_key")
    
    if not api_key:
        print("No API key")
        return
        
    try:
        client_options = ClientOptions(api_key=api_key)
        client = vision.ImageAnnotatorClient(client_options=client_options)
        
        img_path = "C:\\Users\\StrawHat\\MasterRepo\\web_develpoment\\boardformmgmt\\data\\processed\\doc2.pdf_full_enhanced.png"
        with open(img_path, "rb") as image_file:
            content = image_file.read()
        image = vision.Image(content=content)
        
        response = client.document_text_detection(image=image)
        if response.error.message:
            print(f"API Error: {response.error.message}")
        else:
            print("Success! Extracted text length:", len(response.full_text_annotation.text))
            
    except Exception as e:
        print(f"Exception: {e}")

test_ocr()

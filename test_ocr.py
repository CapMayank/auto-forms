import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
from processor import extract_real_ocr

img_path = "C:\\Users\\StrawHat\\MasterRepo\\web_develpoment\\boardformmgmt\\data\\processed\\doc2.pdf_full_enhanced.png"
print(extract_real_ocr(img_path, "9th"))

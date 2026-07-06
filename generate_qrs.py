import qrcode
import os

classes = ["9th", "10th", "11th", "12th"]
output_dir = "templates"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for cls in classes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    # The data can be simple JSON to be easily parsed by the processor later
    data = f'{{"class": "{cls}"}}'
    qr.add_data(data)
    qr.make(fit=True)

    # Convert to RGB to save as JPEG
    img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
    
    # Save as JPG in templates directory
    filename = os.path.join(output_dir, f"QR_{cls}_Form.jpg")
    img.save(filename)
    print(f"Generated {filename}")

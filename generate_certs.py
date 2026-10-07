import os
from PIL import Image, ImageDraw, ImageFont

template_path = r'C:/Users/dashs/.gemini/antigravity/brain/65d9004a-d290-4597-8df8-9db4fc560f8e/.user_uploaded/media_1790753524218.png'
out_dir = r'C:/Users/dashs/campuselink/backend-laravel/storage/app/public/certificates'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(template_path).convert('RGB')
draw = ImageDraw.Draw(img)

# We will just draw rectangles over the text placeholders to cover them, then draw the text!
# Alternatively, since it's a white background, we can draw a white rectangle over the bracketed text.
# The image resolution is probably 1200x800 or similar.
# [Name of Recipient] is roughly centered.
# [Name of Institute]'s [Name of Course] is below it.

# Let's cover the text:
# Coords are approximate. Let's just draw white rectangles.
# [Name of Recipient]: x=400 to 800, y=500 to 550 (approx)
# [Name of Institute]: x=400 to 800, y=580 to 620

draw.rectangle([(350, 480), (600, 560)], fill="white") # Covering Name of Recipient area
draw.rectangle([(350, 580), (600, 620)], fill="white") # Covering Institute area

certs = [
    {
        "filename": "aws_cert.pdf",
        "name": "Jane Doe",
        "course": "Amazon Web Services's AWS Certified Cloud Practitioner"
    },
    {
        "filename": "python_cert.pdf",
        "name": "Jane Doe",
        "course": "Python Institute's Professional Python Developer"
    }
]

# Note: Jane Doe is just a placeholder name for the student. I'll use "Student One".
for c in certs:
    c['name'] = "Student One"

# Let's try to load a basic font
try:
    font_large = ImageFont.truetype("arial.ttf", 32)
    font_small = ImageFont.truetype("arial.ttf", 16)
except:
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()

for c in certs:
    c_img = img.copy()
    c_draw = ImageDraw.Draw(c_img)
    
    # Let's just draw the text directly over the placeholders. The original image has black text.
    # Actually, I'll just draw a big white box over the middle and redraw all the text there to be safe!
    
    # Clear a wide area in the middle
    c_draw.rectangle([(250, 490), (700, 620)], fill="white")
    
    # Draw Name
    c_draw.text((450, 510), c['name'], fill="black", font=font_large, anchor="mm")
    
    # Draw Course
    c_draw.text((450, 600), c['course'], fill="black", font=font_small, anchor="mm")
    
    c_img.save(os.path.join(out_dir, c['filename']))
    print(f"Saved {c['filename']}")

print("Done")

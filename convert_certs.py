import os
from PIL import Image

aws_img_path = r'C:/Users/dashs/.gemini/antigravity/brain/65d9004a-d290-4597-8df8-9db4fc560f8e/.user_uploaded/media_1790759348546.jpg'
python_img_path = r'C:/Users/dashs/.gemini/antigravity/brain/65d9004a-d290-4597-8df8-9db4fc560f8e/.user_uploaded/media_1790759359364.jpg'

out_dir = r'C:/Users/dashs/campuselink/backend-laravel/storage/app/public/certificates'
aws_out_path = os.path.join(out_dir, 'aws_cert.pdf')
python_out_path = os.path.join(out_dir, 'python_cert.pdf')

aws_img = Image.open(aws_img_path).convert('RGB')
aws_img.save(aws_out_path, "PDF", resolution=100.0)
print(f"Saved {aws_out_path}")

python_img = Image.open(python_img_path).convert('RGB')
python_img.save(python_out_path, "PDF", resolution=100.0)
print(f"Saved {python_out_path}")

print("Done")

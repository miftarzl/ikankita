import os
import io
import base64
import json
from flask import Flask, request, jsonify, render_template, send_from_directory
from PIL import Image
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)

# Load model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'runs', 'detect', 'train', 'weights', 'best.pt')
model = YOLO(MODEL_PATH)

CLASS_NAMES = ['Fresh', 'Non-Fresh']
CONFIDENCE_THRESHOLD = 0.50   # Above this = high-confidence result
LOW_CONF_THRESHOLD = 0.30    # Between LOW_CONF and CONFIDENCE = show result with warning
NON_FISH_THRESHOLD = 0.20    # Below this = not a fish at all


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/detect')
def detect_page():
    return render_template('detect.html')


@app.route('/api/detect', methods=['POST'])
def detect():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode base64 image
        image_data = data['image']
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes)).convert('RGB')

        # Run YOLOv8 inference
        results = model(img, verbose=False)[0]

        detections = []
        if results.boxes is not None and len(results.boxes) > 0:
            for box in results.boxes:
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0]]

                detections.append({
                    'class': CLASS_NAMES[cls] if cls < len(CLASS_NAMES) else 'Unknown',
                    'confidence': round(conf * 100, 1),
                    'bbox': [x1, y1, x2, y2]
                })

        # Sort by confidence descending
        detections.sort(key=lambda x: x['confidence'], reverse=True)

        # Determine result status
        low_confidence = False
        if not detections:
            status = 'not_fish'
            message = 'Objek tidak dikenali sebagai ikan'
            label = None
        elif detections[0]['confidence'] / 100 < NON_FISH_THRESHOLD:
            status = 'not_fish'
            message = 'Kemungkinan bukan ikan atau kualitas gambar kurang baik'
            label = None
        else:
            best = detections[0]
            label = best['class']
            status = 'fresh' if label == 'Fresh' else 'not_fresh'
            if best['confidence'] / 100 < CONFIDENCE_THRESHOLD:
                # Low confidence: still show best-guess label but flag it
                low_confidence = True
                message = ('Kemungkinan Ikan Segar' if label == 'Fresh'
                           else 'Kemungkinan Ikan Tidak Segar')
            else:
                message = 'Ikan Segar' if label == 'Fresh' else 'Ikan Tidak Segar'

        # Get image dimensions for bbox normalization
        img_w, img_h = img.size

        return jsonify({
            'status': status,
            'message': message,
            'label': label,
            'low_confidence': low_confidence,
            'detections': detections,
            'image_size': {'width': img_w, 'height': img_h}
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)

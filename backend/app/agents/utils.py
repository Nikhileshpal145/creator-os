# backend/app/agents/utils.py

"""Utility helpers for vision processing used by VisionAgent.
These are lightweight implementations that avoid heavy dependencies.
"""

import base64
import cv2
import numpy as np


def decode_image(b64: str) -> np.ndarray:
    """Decode a base64‑encoded image string to a NumPy BGR array.
    Returns an OpenCV image (numpy ndarray)."""
    if not b64:
        return None
    try:
        # Handle header if present
        if "," in b64:
            b64 = b64.split(",")[1]
            
        img_bytes = base64.b64decode(b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Image decode error: {e}")
        return None


def detect_face(img: np.ndarray) -> bool:
    """Detect at least one face in the given image using Haar cascade.
    Returns ``True`` if a face is found, otherwise ``False``.
    """
    if img is None or img.size == 0:
        return False
        
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
        return len(faces) > 0
    except Exception as e:
        print(f"Face detection error: {e}")
        return False

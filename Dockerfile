# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Create Python runtime and serve FastAPI backend + frontend
FROM python:3.10-slim
WORKDIR /app

# Install native requirements (Tesseract OCR, OpenCV, etc.)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built React frontend files
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend application source
COPY backend/ ./backend/

# Copy Golden Images catalog reference dataset
COPY Golden_Images/ ./Golden_Images/

EXPOSE 8080
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]

# 🚀 VeriVision-AI Backend — Setup & Development Guide

This is the backend server for **VeriVision-AI**, an AI-powered manufacturing compliance and parts fraud detection platform. It uses FastAPI, OpenCV, PyTorch (EasyOCR), SQLite (SQLAlchemy), and LangGraph.

---

## 🛠️ Installation & Setup

### 1. Configure Environment Variables (`.env`)
The application relies on environment variables for API integrations and security configurations. A template `.env.example` is provided.

To set up your local environment:
```bash
# Copy the template file to active .env
copy .env.example .env
```

Open the newly created `.env` file and configure the settings:
- **`OPENROUTER_API_KEY`**: Your OpenRouter API key for LLM Judge (Agent 4) & LLM Explainer (Agent 5). If left blank, the pipeline will fallback to local mathematical rules.
- **`SECRET_KEY`**: Secret key for signing JWT tokens. Change this to a secure random string in production.

---

### 2. Install Dependencies
Ensure you have Python 3.9+ installed. Set up a virtual environment and install the required modules:

```bash
# Create python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

---

### 3. Initialize & Seed the Database
We use SQLite (`verivision.db`) for lightweight local storage. Run the seed script to clean, recreate database schema tables, and populate baseline users and Golden Reference templates:

```bash
python seed_data.py
```

This registers two default credentials for logging into the dashboard:
* **Admin Account:** `admin@verivision.com` / `admin123`
* **Operator/User Account:** `user@verivision.com` / `user123`

---

## 🚀 Running the Server
Start the FastAPI development server with reload enabled:

```bash
uvicorn app.main:app --reload
```

The API documentation will be available locally at:
* Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
* Redoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 📋 5-Node Agentic Pipeline Architecture
The verification flow executes step-by-step through a LangGraph StateGraph:
1. **Agent 1: Ingest & Triage Agent (`agent_1_triage.py`)** — Validates image resolution, brightness, clarity (Laplacian variance), and performs homography warping.
2. **Agent 2: Reference Selector Agent (`agent_2_selector.py`)** — Automatically queries the catalog to match golden reference metrics.
3. **Agent 3: Anomaly Detection Agent (`agent_3_detector.py`)** — Computes SSIM difference map overlays, ORB descriptor matches, template sticker checks, and 3D Color Histograms.
4. **Agent 4: Policy & Decision Agent (`agent_4_decision.py`)** — Evaluates ensemble metrics using an LLM Compliance Judge (or local rule fallbacks) to output compliance verdicts (`clean`, `tampered`, `missing`, `mismatched`, `reused`).
5. **Agent 5: Explainer Agent (`agent_5_explainer.py`)** — Synthesizes natural language technical justifications for QC audit logging.

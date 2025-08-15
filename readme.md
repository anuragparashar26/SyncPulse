# Distributed Hardware Monitoring System

### Directory Structure

```
PROJECT/
│
├── agent/
│   ├── agent.py           # The monitoring agent
│   ├── requirements.txt   # Agent dependencies
│
├── backend/
│   ├── main.py            # FastAPI backend server
│   ├── requirements.txt   # Backend dependencies
│
└── .gitignore             # Ignores virtual environments, caches, etc.
```

---

## 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 2. Agent Setup

On each machine to monitor:

```bash
cd agent
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python agent.py --server http://<BACKEND_IP>:8000 #For eg: python agent.py --server http://localhost:8000
```

Replace `<BACKEND_IP>` with the address of your backend server.

---

## 3. Accessing Data & Alerts

- The backend exposes:
  - POST `/metrics` — Receives agent metrics
  - GET `/metrics` — Returns latest metrics per device
  - GET `/alerts` — Returns recent alerts

---

## Notes

- Virtual environments (`venv/`) and Python cache files are not included in the repository.
- Agent and backend can run independently on different machines.
- No GPU code or dashboard is included in this minimal setup.

---

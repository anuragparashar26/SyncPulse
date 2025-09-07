# ProjectX Monitoring – Technical Documentation

Version: 1.0

This document describes the architecture, setup, APIs, and operational guidance for ProjectX, a lightweight, extensible system for monitoring hosts. The system comprises:
- Agent: Collects host metrics and sends snapshots to the backend.
- Backend: FastAPI service that ingests, aggregates, and exposes APIs.
- Frontend: React + MUI dashboard for visualization.

Table of Contents
1. Introduction
2. Architecture Overview
3. Directory Structure
4. Quick Start
5. Configuration
6. Backend API Reference
7. Frontend Guide
8. Agent Guide
9. Operations & Maintenance
10. Security Considerations
11. Troubleshooting
12. Roadmap

1. Introduction
- Purpose: Provide real-time visibility into system health (CPU, memory, disks, network, sensors, processes), GPUs, and core service reachability.
- Scope: Single backend with multiple agents reporting; frontend consumes backend APIs via a proxy.
- Non-goals: Long-term storage/analytics (in-memory only), multi-tenant auth (out-of-scope here).

2. Architecture Overview
- Data flow:
  - Agent → POST /metrics (every 1–5s typical)
  - Backend buffers last 100 snapshots per agent (in-memory).
  - Frontend polls health, metrics, history, services, and GPU endpoints.
- Technologies:
  - Backend: FastAPI, Uvicorn
  - Frontend: React, MUI, Chart.js
  - Optional: Docker CLI presence for Docker checks

3. Directory Structure
The layout below reflects the repository on disk (based on the provided screenshot):

```
ProjectX/
├─ agent/                         # Local metrics collector (imported by backend)
│  ├─ __pycache__/
│  └─ agent.py
│
├─ backend/                       # FastAPI backend
│  ├─ __pycache__/
│  └─ main.py
│
├─ frontend/                      # React + MUI frontend
│  ├─ node_modules/
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  └─ pages/
│  │     ├─ Alerts.js
│  │     ├─ Dashboard.js
│  │     └─ Metrics.js
│  │  ├─ App.js
│  │  ├─ index.js
│  │  └─ setupProxy.js           # Dev proxy for /api → backend
│  ├─ package.json
│  └─ package-lock.json
│
├─ venv/                          # Optional local virtualenv
├─ requirements.txt               # Optional, project-level
├─ .gitignore
└─ readme.md                      # This document
```

4. Quick Start
Backend
- Create venv, install deps, run:
  - cd backend
  - python -m venv venv
  - source venv/bin/activate
  - pip install -r requirements.txt
  - uvicorn main:app --host 0.0.0.0 --port 8000

Frontend
- cd frontend
- npm install
- Ensure dev proxy routes /api to backend (see src/setupProxy.js)
- npm start

Agent
- cd agent
- python -m venv venv
- source venv/bin/activate
- pip install -r requirements.txt (if exists)
- python agent.py --server http://<BACKEND_HOST>:8000

5. Configuration
- Reverse proxy (recommended):
  - Map /api → http://localhost:8000 on your web server or use the React dev proxy (src/setupProxy.js).
- CORS:
  - Backend currently allows all origins for development; restrict allow_origins in production.
- Intervals:
  - Agent send interval: 1–5s recommended.
  - Frontend polling: metrics (1s), history/services (5–10s typical).
- Persistence:
  - In-memory buffers only. For long-term history, add a DB and extend /history.

6. Backend API Reference
Base URLs
- Direct: http://localhost:8000
- Via frontend proxy: /api/...

6.1 GET /
- Description: Backend liveness.
- Response (generic):
  { "msg": "Backend is running" }

6.2 GET /health
- Description: Basic server health summary (in-memory).
- Response (generic):
  {
    "status": "ok",
    "devices_reporting": 0,
    "total_alerts": 0,
    "server_time": 0
  }

6.3 POST /metrics
- Description: Ingest a metrics snapshot from an agent (last 100 samples retained).
- Request body (generic):
  {
    "agent_id": "string",
    "device": "string",
    "cpu": { "total_percent": 0, "per_core_percent": [0] },
    "memory": {
      "percent": 0, "used": 0, "total": 0,
      "swap_percent": 0, "swap_used": 0, "swap_total": 0
    },
    "disks": [{ "mountpoint": "/", "percent": 0, "inode_percent": 0, "used": 0, "total": 0 }],
    "network": [{ "interface": "string", "bytes_recv": 0, "bytes_sent": 0, "errin": 0, "errout": 0 }],
    "processes": [{ "pid": 0, "name": "string", "cpu": 0, "memory": 0 }],
    "sensors_temperature": { "group": [{ "label": "string", "current": 0, "high": 0 }] },
    "gpus": [{
      "vendor": "string", "name": "string",
      "load": 0, "utilization": 0,
      "used_memory_MB": 0, "total_memory_MB": 0,
      "vram_usage_MB": 0, "vram_total_MB": 0,
      "temperature_C": 0
    }],
    "time_drift": { "drift_seconds": 0 },
    "timestamp": 0
  }
- Response:
  { "ok": true }

6.4 GET /metrics
- Description: Latest snapshot per reporting agent.
- Response (generic array):
  [
    {
      "agent_id": "string",
      "device": "string",
      "cpu": { "total_percent": 0, "per_core_percent": [0] },
      "memory": { "percent": 0 },
      "disks": [], "network": [], "processes": [],
      "sensors_temperature": {}, "gpus": [],
      "timestamp": 0
    }
  ]

6.5 GET /metrics/{agent_id}
- Description: Latest snapshot for a specific agent.
- Response (generic):
  {
    "agent_id": "string",
    "device": "string",
    "cpu": { "total_percent": 0, "per_core_percent": [0] },
    "memory": { "percent": 0 },
    "disks": [], "network": [], "processes": [],
    "sensors_temperature": {}, "gpus": [],
    "timestamp": 0
  }

6.6 GET /history/{agent_id}?samples=24
- Description: Fixed-length arrays for CPU and Memory trends.
- Response (generic):
  {
    "cpu": [0, 0],
    "mem": [0, 0],
    "interval_sec": 5
  }

6.7 GET /gpu
- Description: Host GPU info (NVIDIA/AMD/Intel if available).
- Response (generic):
  {
    "gpus": [{
      "vendor": "string", "name": "string",
      "load": 0, "utilization": 0,
      "used_memory_MB": 0, "total_memory_MB": 0,
      "vram_usage_MB": 0, "vram_total_MB": 0,
      "temperature_C": 0
    }]
  }

6.8 GET /overview
- Description: Server overview; Linux distro parsed via /etc/os-release.
- Response (generic):
  {
    "device_name": "string",
    "hostname": "string",
    "os_name": "string",
    "os_version": "string",
    "cpu": "string",
    "gpu": "string",
    "ram": "string"
  }

6.9 GET /services
- Description: Reachability snapshot for core services/ports on the host.
- Response (generic):
  {
    "ports": {
      "ssh": { "port": 22,   "open": false },
      "http": { "port": 80,  "open": false },
      "https": { "port": 443,"open": false },
      "mysql": { "port": 3306,"open": false },
      "postgresql": { "port": 5432,"open": false },
      "redis": { "port": 6379,"open": false },
      "mongo": { "port": 27017,"open": false }
    },
    "docker": { "running": false, "running_containers": 0 },
    "databases": {
      "mysql": { "reachable": false },
      "postgresql": { "reachable": false },
      "mongo": { "reachable": false }
    },
    "sshd": { "listening": false },
    "essentials": {
      "nginx": { "reachable": false },
      "apache": { "reachable": false },
      "redis": { "reachable": false },
      "rabbitmq": { "reachable": false },
      "kafka": { "reachable": false }
    }
  }
- Notes:
  - “Essentials” are quick TCP reachability checks for common infra.
  - Extend by adding ports/services in backend/main.py.

7. Frontend Guide
- Tech: React 18, MUI, Chart.js.
- Pages:
  - Dashboard: Health summary, device selector, server overview.
  - Metrics: Overview cards (CPU/Memory/Swap/Uptime), time-series charts, GPU cards (horizontal with load/memory bars, temperature), network activity, sensors, processes, services lists.
- Dev Proxy:
  - src/setupProxy.js should route /api to the backend during development.

8. Agent Guide
- Purpose: Collect system metrics and POST to /metrics at fixed intervals.
- Key Data: CPU, memory, network, disks, processes, sensors, GPUs, timestamp.
- Reliability: Add retry/backoff when backend is unreachable.

9. Operations & Maintenance
- Polling cadence (frontend):
  - Metrics: ~1s
  - History: 5s
  - Services: 10s
- Rotation: Backend buffer is capped at last 100 snapshots per agent.
- Scaling: Front with reverse proxy; consider persistence and horizontal scale for larger fleets.

10. Security Considerations
- Restrict CORS to trusted origins.
- Place FastAPI behind a reverse proxy.
- Protect /services if exposing publicly (it reveals host reachability).
- Consider mTLS/API keys for agent → backend.

11. Troubleshooting
- Frontend can’t reach backend:
  - Verify src/setupProxy.js or reverse proxy mapping /api → backend.
- No metrics shown:
  - Ensure agent sends to correct backend URL and agent_id is set.
- GPU data missing:
  - Confirm GPU collection functions exist on host and are callable.

12. Roadmap
- Optional persistence for long-term history.
- AuthN/AuthZ for APIs and UI.
- Per-agent staleness indicators and richer charts.
- Extend /services (TLS checks, DNS/NTP status, cert expiry).

End of document.

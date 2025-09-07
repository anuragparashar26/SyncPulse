# ProjectX Monitoring – Technical Documentation

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009485?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node-16+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-informational)](#)
[![OS](https://img.shields.io/badge/OS-Linux-inactive?logo=linux&logoColor=white)](#)

Version: 1.0

> Purpose: Real‑time visibility into system health (CPU, memory, disks, network, sensors, processes), GPUs, and core service reachability across hosts.

---

## Table of Contents
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

---

## 1. Introduction
- Scope: Single backend, multiple agents; frontend uses a proxy to consume APIs.
- Non‑goals: Long‑term storage/analytics (in‑memory), multi‑tenant auth.

---

## 2. Architecture Overview
- Data flow:
  - Agent → POST /metrics (1–5s typical)
  - Backend keeps last 100 snapshots per agent (in‑memory)
  - Frontend polls health, metrics, history, services, GPU
- Tech stack: FastAPI + Uvicorn, React + MUI + Chart.js, optional Docker CLI

> Tip: Start with 5s polling for history/services to reduce load.

---

## 3. Directory Structure
```bash
ProjectX/
├─ agent/                         # Local metrics collector (imported by backend)
│  └─ agent.py
│
├─ backend/                       # FastAPI backend
│  └─ main.py
│
├─ frontend/                      # React + MUI frontend
│  ├─ public/
│  ├─ src/
│  │  ├─ components/
│  │  └─ pages/
│  │     ├─ Alerts.js
│  │     ├─ Dashboard.js
│  │     └─ Metrics.js
│  │  ├─ App.js
│  │  ├─ index.js
│  │  └─ setupProxy.js            # Dev proxy for /api → backend
│  └─ package.json
│
└─ readme.md                      # This document
```

---

## 4. Quick Start

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
# Ensure dev proxy routes /api to backend (see src/setupProxy.js)
npm start
```

### Agent
```bash
cd agent
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt  # if present
python agent.py --server http://<BACKEND_HOST>:8000
```

> Note: Replace <BACKEND_HOST> with the backend address (localhost/LAN IP).

---

## 5. Configuration
- Reverse proxy: map /api → http://localhost:8000 (dev proxy or web server)
- CORS: open for dev, restrict allow_origins in production
- Intervals: Agent 1–5s; Frontend: metrics 1s, history/services 5–10s
- Persistence: In‑memory only; add DB if long‑term history required

---

## 6. Backend API Reference
Base URLs:
- Direct: http://localhost:8000
- Via frontend proxy: /api/...

<details>
  <summary><b>6.1 GET /</b> – Liveness</summary>

```json
{ "msg": "Backend is running" }
```
</details>

<details>
  <summary><b>6.2 GET /health</b> – Server health summary</summary>

```json
{
  "status": "ok",
  "devices_reporting": 0,
  "total_alerts": 0,
  "server_time": 0
}
```
</details>

<details>
  <summary><b>6.3 POST /metrics</b> – Ingest snapshot (keeps last 100)</summary>

```json
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
```

Response:
```json
{ "ok": true }
```
</details>

<details>
  <summary><b>6.4 GET /metrics</b> – Latest per agent</summary>

```json
[
  {
    "agent_id": "string",
    "device": "string",
    "cpu": { "total_percent": 0, "per_core_percent": [0] },
    "memory": { "percent": 0 },
    "disks": [],
    "network": [],
    "processes": [],
    "sensors_temperature": {},
    "gpus": [],
    "timestamp": 0
  }
]
```
</details>

<details>
  <summary><b>6.5 GET /metrics/{agent_id}</b> – Latest for one agent</summary>

```json
{
  "agent_id": "string",
  "device": "string",
  "cpu": { "total_percent": 0, "per_core_percent": [0] },
  "memory": { "percent": 0 },
  "disks": [],
  "network": [],
  "processes": [],
  "sensors_temperature": {},
  "gpus": [],
  "timestamp": 0
}
```
</details>

<details>
  <summary><b>6.6 GET /history/{agent_id}?samples=24</b> – Trend arrays</summary>

```json
{
  "cpu": [0, 0],
  "mem": [0, 0],
  "interval_sec": 5
}
```
</details>

<details>
  <summary><b>6.7 GET /gpu</b> – Host GPU info</summary>

```json
{
  "gpus": [{
    "vendor": "string", "name": "string",
    "load": 0, "utilization": 0,
    "used_memory_MB": 0, "total_memory_MB": 0,
    "vram_usage_MB": 0, "vram_total_MB": 0,
    "temperature_C": 0
  }]
}
```
</details>

<details>
  <summary><b>6.8 GET /overview</b> – Server overview (Linux distro aware)</summary>

```json
{
  "device_name": "string",
  "hostname": "string",
  "os_name": "string",
  "os_version": "string",
  "cpu": "string",
  "gpu": "string",
  "ram": "string"
}
```
</details>

<details>
  <summary><b>6.9 GET /services</b> – Core services/ports reachability</summary>

```json
{
  "ports": {
    "ssh": { "port": 22, "open": false },
    "http": { "port": 80, "open": false },
    "https": { "port": 443, "open": false },
    "mysql": { "port": 3306, "open": false },
    "postgresql": { "port": 5432, "open": false },
    "redis": { "port": 6379, "open": false },
    "mongo": { "port": 27017, "open": false }
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
```
</details>

<details>
  <summary><b>6.10 GET /all</b> – Aggregate (health, metrics, overview, GPU, services, optional history)</summary>

Query:
- agent_id (optional): include history for this agent
- samples (optional, default 24): history length

```json
{
  "health": { "status": "ok", "devices_reporting": 0, "total_alerts": 0, "server_time": 0 },
  "metrics": [ { "agent_id": "string", "device": "string", "cpu": { "total_percent": 0 }, "timestamp": 0 } ],
  "overview": { "device_name": "string", "hostname": "string", "os_name": "string", "os_version": "string", "cpu": "string", "gpu": "string", "ram": "string" },
  "gpu": { "gpus": [ { "vendor": "string", "name": "string" } ] },
  "services": { "ports": {}, "docker": {}, "databases": {}, "sshd": {}, "essentials": {} },
  "history": { "cpu": [0], "mem": [0], "interval_sec": 5 }
}
```
</details>

---

## 7. Frontend Guide
- React 18, MUI, Chart.js
- Pages:
  - Dashboard: Health summary, device selector, server overview
  - Metrics: Overview cards (CPU/Memory/Swap/Uptime), trends (CPU/Memory), GPU cards (horizontal), network activity, sensors, processes, services
- Dev Proxy: src/setupProxy.js should map /api → backend

---

## 8. Agent Guide
- Sends CPU, memory, network, disks, processes, sensors, GPUs, timestamp
- Recommended: Retry/backoff when backend unreachable

---

## 9. Operations & Maintenance
- Polling cadence: metrics 1s, history 5s, services 10s
- Buffering: last 100 snapshots per agent in memory
- Scale via reverse proxy; add persistence for longer history

---

## 10. Security Considerations
- Restrict CORS in production
- Reverse proxy the backend
- Protect /services if exposed publicly (reveals reachability)
- Consider mTLS/API keys for agent → backend

---

## 11. Troubleshooting
- Frontend can’t reach backend: verify /api proxy (setupProxy.js or reverse proxy)
- No metrics: ensure agent URL and agent_id are correct
- No GPU: check host capabilities and agent GPU calls

---

## 12. Roadmap
- Optional persistence for history
- AuthN/AuthZ for APIs/UI
- Per‑agent staleness and richer charts
- Extend /services (TLS, DNS/NTP, cert expiry)

---
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

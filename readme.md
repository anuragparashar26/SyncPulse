# Distributed Hardware Monitoring System

A minimal, extensible system for monitoring hardware and system health across a fleet of machines. Each machine runs an agent that periodically sends metrics to a FastAPI backend, which generates alerts and provides endpoints for a frontend dashboard.

---

## Directory Structure

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

Start the backend server (on your monitoring/server machine):

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 2. Agent Setup

Install and run the agent on each machine you want to monitor:

```bash
cd agent
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python agent.py --server http://<BACKEND_IP>:8000
```

Replace `<BACKEND_IP>` with the address of your backend server, e.g. `localhost` or the server's LAN IP.

---

## 3. API Reference

### Base URL

- Default: `http://localhost:8000/`

---

### Endpoints

#### `POST /metrics`

Agents POST their latest metrics here. The backend checks for abnormal values and generates alerts.

**Request Example:**

```json
{
  "agent_id": "demo-agent",
  "cpu": { "total_percent": 95 },
  "memory": { "percent": 92, "swap_percent": 55 },
  "disks": [{ "mountpoint": "/", "percent": 95, "inode_percent": 95 }],
  "sensors_temperature": {
    "coretemp": [{ "label": "Core 0", "current": 90, "high": 85 }]
  },
  "time_drift": { "drift_seconds": 120 },
  "network": [{ "bytes_recv": 0, "bytes_sent": 0, "errin": 150, "errout": 0 }],
  "custom_alert": true,
  "zombie_processes": 2,
  "critical_processes": { "nginx": false, "sshd": true }
}
```

**Response:**

```json
{ "ok": true }
```

---

#### `GET /metrics`

Returns the latest metric sample for each reporting device/agent.

**Response Example:**

```json
[
  {
    "agent_id": "demo-agent",
    "cpu": { "total_percent": 95 },
    "memory": { "percent": 92, "swap_percent": 55 },
    ...
    "timestamp": 1755289024.2304418
  },
  ...
]
```

---

#### `GET /alerts`

Returns the 20 most recent alerts (both new and recovered).

**Response Example:**

```json
[
  {
    "device": "demo-agent",
    "alert": "High CPU usage",
    "severity": "critical",
    "timestamp": 1755289024.2304418
  },
  {
    "device": "demo-agent",
    "alert": "High CPU usage - recovered",
    "severity": "warning",
    "timestamp": 1755289102.8178039
  },
  ...
]
```

**Alert fields:**

- `device`: Agent/device ID reporting the metric
- `alert`: Description of the issue (or `" - recovered"` if resolved)
- `severity`: `"critical"` or `"warning"`
- `timestamp`: Unix epoch timestamp (seconds, float)

---

#### `GET /health`

Simple health check and system status.

**Response Example:**

```json
{
  "status": "ok",
  "devices_reporting": 2,
  "total_alerts": 35,
  "server_time": 1755289102.8178039
}
```

---

#### `GET /`

Root endpoint, simple status message.

**Response:**

```json
{ "msg": "Backend is running" }
```

---

## Alert Types and Triggers

Alerts are generated when metrics cross certain thresholds:

| Alert Type                             | Severity | Trigger Example                                |
| -------------------------------------- | -------- | ---------------------------------------------- |
| High CPU usage                         | critical | `cpu.total_percent > 90`                       |
| High Memory usage                      | critical | `memory.percent > 90`                          |
| High swap usage                        | warning  | `memory.swap_percent > 50`                     |
| Low Disk Space                         | critical | `disks[].percent > 90`                         |
| High inode usage                       | warning  | `disks[].inode_percent > 90`                   |
| Overheat detected                      | critical | `sensors_temperature` exceeds `high` threshold |
| High time drift                        | warning  | `abs(time_drift.drift_seconds) > 60`           |
| All network interfaces inactive        | warning  | All `network[].bytes_recv + bytes_sent == 0`   |
| Network interface errors detected      | warning  | Any `network[].errin > 100` or `errout > 100`  |
| Custom Alert triggered                 | critical | `custom_alert == true`                         |
| Zombie processes detected              | warning  | `zombie_processes > 0`                         |
| Critical process <name> is not running | critical | `critical_processes[<name>] == false`          |

- **Recovered alerts**: When a problem returns to normal, a `- recovered` alert is appended and severity downgraded to "warning".

---

## CORS

- All endpoints have CORS enabled for demo/dev (all origins, all methods, all headers).

---

## Frontend Integration Tips

- **Show all current problems:** Filter `/alerts` for alerts _without_ the `" - recovered"` suffix.
- **Show alert history:** Display all `/alerts` (optionally group by device or alert type).
- **Show latest agent status:** Use `/metrics`, one entry per agent.
- **Show system health:** Use `/health`.

**To add new alert types or fields, coordinate with the backend developer!**

---

## Notes

- Virtual environments (`venv/`) and Python cache files are not included in the repository.
- Agent and backend can run independently on different machines.
- No dashboard UI is included in this setup—see API above for frontend integration.

---

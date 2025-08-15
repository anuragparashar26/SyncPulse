from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import time

app = FastAPI()

# Enable CORS for all origins, methods, and headers (for demo/dev use)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for metrics and alerts
metrics_db: Dict[str, List[dict]] = {}
alerts: List[dict] = []

def check_abnormal(metrics):
    """Check metrics for abnormal CPU, memory, or disk usage and return alert strings."""
    alerts_local = []
    cpu = metrics.get("cpu", {})
    memory = metrics.get("memory", {})
    disks = metrics.get("disks", [])
    if isinstance(cpu, dict) and cpu.get("total_percent", 0) > 90:
        alerts_local.append("High CPU usage")
    if isinstance(memory, dict) and memory.get("percent", 0) > 90:
        alerts_local.append("High Memory usage")
    for d in disks:
        if d.get("percent", 0) > 90:
            alerts_local.append(f"Low Disk Space on {d.get('mountpoint', d.get('device', 'unknown'))}")
    return alerts_local

@app.post("/metrics")
async def receive_metrics(data: dict):
    """Receive metrics from agents, check for alerts, and store the last 100 per agent."""
    device = data.get("agent_id") or data.get("device", "unknown")
    if "timestamp" not in data:
        data["timestamp"] = time.time()
    metrics_db.setdefault(device, []).append(data)
    metrics_db[device] = metrics_db[device][-100:]
    for alert in check_abnormal(data):
        alerts.append({
            "device": device,
            "alert": alert,
            "timestamp": time.time()
        })
    return {"ok": True}

@app.get("/metrics")
async def get_metrics():
    """Return the latest metric sample for each device."""
    result = []
    for device, entries in metrics_db.items():
        if entries:
            result.append(entries[-1])
    return result

@app.get("/alerts")
async def get_alerts():
    """Return the 20 most recent alerts."""
    return alerts[-20:]

@app.get("/")
async def root():
    """Root endpoint: simple message."""
    return {"msg": "Backend is running"}

@app.get("/health")
async def health():
    """Health check endpoint: returns status and metrics count."""
    return {
        "status": "ok",
        "devices_reporting": len(metrics_db),
        "total_alerts": len(alerts),
        "server_time": time.time()
    }

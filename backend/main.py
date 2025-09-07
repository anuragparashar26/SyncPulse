from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../agent')))
import agent
from typing import Dict, List, Optional
import time
import threading

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

metrics_db: Dict[str, List[dict]] = {}
alerts: List[dict] = []
last_alert_state: Dict[str, set] = {}
lock = threading.Lock()

def check_abnormal(metrics, prev_alerts: Optional[set] = None):
    alerts_local = []
    cpu = metrics.get("cpu", {})
    memory = metrics.get("memory", {})
    swap = memory.get("swap_percent", 0) if isinstance(memory, dict) else 0
    disks = metrics.get("disks", [])
    sensors = metrics.get("sensors_temperature", {})
    time_drift = (metrics.get("time_drift") or {}).get("drift_seconds", 0)
    net = metrics.get("network", [])
    # CPU
    if isinstance(cpu, dict) and cpu.get("total_percent", 0) > 90:
        alerts_local.append({"alert": "High CPU usage", "severity": "critical"})
    # Memory
    if isinstance(memory, dict) and memory.get("percent", 0) > 90:
        alerts_local.append({"alert": "High Memory usage", "severity": "critical"})
    # Swap
    if swap > 50:
        alerts_local.append({"alert": "High swap usage", "severity": "warning"})
    # Disks
    for d in disks:
        # Only alert for root mountpoint
        if d.get("mountpoint", "") == "/" and d.get("percent", 0) > 90:
            alerts_local.append({"alert": f"Low Disk Space on {d.get('mountpoint', d.get('device', 'unknown'))}", "severity": "critical"})
        # Inode usage can still be for all
        if d.get("inode_percent", 0) and d.get("inode_percent", 0) > 90:
            alerts_local.append({"alert": f"High inode usage on {d.get('mountpoint', d.get('device', 'unknown'))}", "severity": "warning"})
    # Custom alert
    if metrics.get("custom_alert"):
        alerts_local.append({"alert": "Custom Alert triggered", "severity": "critical"})
    # Zombie processes
    if metrics.get("zombie_processes", 0) > 0:
        alerts_local.append({"alert": f"Zombie processes detected: {metrics['zombie_processes']}", "severity": "warning"})
    # Critical processes
    critical = metrics.get("critical_processes", {})
    if isinstance(critical, dict):
        for proc, running in critical.items():
            if not running:
                alerts_local.append({"alert": f"Critical process {proc} is not running", "severity": "critical"})
    # Temperature sensors
    for group, sensors_list in sensors.items():
        for s in sensors_list:
            curr = s.get("current")
            high = s.get("high") or 80  # Fallback threshold if not set
            if curr and high and curr > high:
                alerts_local.append({"alert": f"Overheat detected on {group} ({curr}°C)", "severity": "critical"})
    # Time drift
    if time_drift and abs(time_drift) > 60:
        alerts_local.append({"alert": f"High time drift: {round(time_drift)}s", "severity": "warning"})
    # Network down/degraded
    if net:
        all_zero = all((n.get("bytes_recv", 0) + n.get("bytes_sent", 0)) == 0 for n in net)
        high_err = any(n.get("errin", 0) > 100 or n.get("errout", 0) > 100 for n in net)
        if all_zero:
            alerts_local.append({"alert": "All network interfaces inactive", "severity": "warning"})
        if high_err:
            alerts_local.append({"alert": "Network interface errors detected", "severity": "warning"})
    # Deduplication logic
    if prev_alerts is not None:
        alerts_local = [a for a in alerts_local if a["alert"] not in prev_alerts]
    return alerts_local

@app.post("/metrics")
async def receive_metrics(data: dict):
    device = data.get("agent_id") or data.get("device", "unknown")
    if "timestamp" not in data:
        data["timestamp"] = time.time()
    with lock:
        metrics_db.setdefault(device, []).append(data)
        metrics_db[device] = metrics_db[device][-100:]
        current_alerts = last_alert_state.get(device, set())
        alert_objs = check_abnormal(data, prev_alerts=current_alerts)
        for alert in alert_objs:
            alerts.append({
                "device": device,
                "alert": alert["alert"],
                "severity": alert["severity"],
                "timestamp": time.time()
            })
            current_alerts.add(alert["alert"])
        # Handle recoveries
        active_alerts = set(a["alert"] for a in check_abnormal(data))
        for old_alert in list(current_alerts):
            if old_alert not in active_alerts:
                alerts.append({
                    "device": device,
                    "alert": f"{old_alert} - recovered",
                    "severity": "warning",
                    "timestamp": time.time()
                })
                current_alerts.remove(old_alert)
        last_alert_state[device] = current_alerts
    return {"ok": True}

@app.get("/metrics")
async def get_metrics():
    # Add sensors_temperature to the returned metrics for each agent
    result = []
    for entries in metrics_db.values():
        if entries:
            latest = entries[-1]
            # Ensure sensors_temperature is present (for backward compatibility)
            if "sensors_temperature" not in latest:
                latest["sensors_temperature"] = {}
            result.append(latest)
    return result

@app.get("/metrics/{agent_id}")
async def get_metrics_for_agent(agent_id: str):
    entries = metrics_db.get(agent_id)
    if not entries:
        return {}
    latest = entries[-1]
    # Ensure sensors_temperature is present
    if "sensors_temperature" not in latest:
        latest["sensors_temperature"] = {}
    return latest

@app.get("/alerts")
async def get_alerts():
    return alerts[-20:]

@app.get("/")
async def root():
    return {"msg": "Backend is running"}

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "devices_reporting": len(metrics_db),
        "total_alerts": len(alerts),
        "server_time": time.time()
    }

# New endpoint for GPU info
@app.get("/gpu")
async def get_gpu_info():
    gpus = []
    try:
        gpus.extend(agent.get_nvidia_gpus())
    except Exception:
        pass
    try:
        gpus.extend(agent.get_amd_gpus())
    except Exception:
        pass
    try:
        gpus.extend(agent.get_intel_gpus())
    except Exception:
        pass
    return {"gpus": gpus}

@app.get("/history/{agent_id}")
async def get_history(agent_id: str, samples: int = 24):
    """
    Return exactly `samples` historical points (CPU & Memory).
    Returns fixed-size arrays, padding with the first available value or zero.
    """
    if agent_id not in metrics_db:
        return {"cpu": [0] * samples, "mem": [0] * samples, "interval_sec": 5}
    
    entries = metrics_db[agent_id]
    
    # Estimate interval from timestamps
    interval = 5  # default
    if len(entries) > 1:
        timestamps = [e.get("timestamp", 0) for e in entries if "timestamp" in e]
        if len(timestamps) > 1:
            diffs = [timestamps[i] - timestamps[i-1] for i in range(1, len(timestamps))]
            diffs = [d for d in diffs if 0 < d < 120]  # reasonable interval range
            if diffs:
                interval = max(1, min(int(round(sum(diffs) / len(diffs))), 60))
    
    # Extract CPU and memory data from available entries
    cpu_data = []
    mem_data = []
    for e in entries:  # process all entries, we'll slice later
        cpu_val = 0
        mem_val = 0
        if "cpu" in e and isinstance(e["cpu"], dict):
            cpu_val = e["cpu"].get("total_percent", 0)
        if "memory" in e and isinstance(e["memory"], dict):
            mem_val = e["memory"].get("percent", 0)
        cpu_data.append(cpu_val)
        mem_data.append(mem_val)
    
    # Take the last 'samples' entries or pad if we have fewer
    if len(cpu_data) >= samples:
        cpu_result = cpu_data[-samples:]
        mem_result = mem_data[-samples:]
    else:
        # Pad with first value or zero to reach 'samples' length
        pad_value_cpu = cpu_data[0] if cpu_data else 0
        pad_value_mem = mem_data[0] if mem_data else 0
        padding_needed = samples - len(cpu_data)
        cpu_result = [pad_value_cpu] * padding_needed + cpu_data
        mem_result = [pad_value_mem] * padding_needed + mem_data
    
    return {"cpu": cpu_result, "mem": mem_result, "interval_sec": interval}

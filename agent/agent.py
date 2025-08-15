import argparse
import platform
import socket
import time
import requests
import psutil
import uuid
import logging
from typing import Dict, Any

def setup_logger():
    logger = logging.getLogger("AgentLogger")
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger

logger = setup_logger()

def get_unique_id():
    try:
        import os
        if platform.system() == "Linux" and os.path.exists("/etc/machine-id"):
            with open("/etc/machine-id", "r") as f:
                return f.read().strip()
        elif platform.system() == "Windows":
            import winreg
            reg = winreg.ConnectRegistry(None, winreg.HKEY_LOCAL_MACHINE)
            key = winreg.OpenKey(reg, r"SOFTWARE\Microsoft\Cryptography")
            value, _ = winreg.QueryValueEx(key, "MachineGuid")
            return value
    except Exception:
        pass
    try:
        import os
        AGENT_ID_FILE = "agent_id.txt"
        if os.path.exists(AGENT_ID_FILE):
            with open(AGENT_ID_FILE, "r") as f:
                return f.read().strip()
        else:
            agent_id = str(uuid.uuid4())
            with open(AGENT_ID_FILE, "w") as f:
                f.write(agent_id)
            return agent_id
    except Exception:
        pass
    return socket.gethostname()

def collect_metrics() -> Dict[str, Any]:
    uptime = time.time() - psutil.boot_time()
    try:
        load_avg = psutil.getloadavg()
    except (AttributeError, NotImplementedError):
        load_avg = (0, 0, 0)
    cpu_perc = psutil.cpu_percent(percpu=True)
    cpu_total = psutil.cpu_percent()
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    disks = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
            io = psutil.disk_io_counters(perdisk=True).get(part.device, {})
            disks.append({
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent,
                "read_bytes": io.get("read_bytes", 0),
                "write_bytes": io.get("write_bytes", 0),
                "read_count": io.get("read_count", 0),
                "write_count": io.get("write_count", 0),
            })
        except Exception:
            continue
    net_io = psutil.net_io_counters(pernic=True)
    net_stats = []
    for nic, stats in net_io.items():
        net_stats.append({
            "interface": nic,
            "bytes_sent": stats.bytes_sent,
            "bytes_recv": stats.bytes_recv,
            "packets_sent": stats.packets_sent,
            "packets_recv": stats.packets_recv,
            "errin": stats.errin,
            "errout": stats.errout,
            "dropin": stats.dropin,
            "dropout": stats.dropout,
        })
    processes = []
    for p in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']),
                   key=lambda p: (p.info.get('cpu_percent', 0), p.info.get('memory_percent', 0)),
                   reverse=True)[:5]:
        try:
            processes.append({
                "pid": p.info["pid"],
                "name": p.info["name"],
                "cpu": p.info["cpu_percent"],
                "memory": p.info["memory_percent"]
            })
        except Exception:
            continue

    data = {
        "agent_id": get_unique_id(),
        "device": socket.gethostname(),
        "platform": platform.system(),
        "platform_release": platform.release(),
        "platform_version": platform.version(),
        "cpu": {
            "total_percent": cpu_total,
            "per_core_percent": cpu_perc,
            "load_avg": load_avg
        },
        "memory": {
            "total": mem.total,
            "available": mem.available,
            "percent": mem.percent,
            "used": mem.used,
            "free": mem.free,
            "swap_total": swap.total,
            "swap_used": swap.used,
            "swap_percent": swap.percent
        },
        "disks": disks,
        "network": net_stats,
        "uptime_sec": int(uptime),
        "processes": processes,
        "timestamp": time.time(),
    }
    return data

def main(server_url, interval=5):
    logger.info("Agent started. Posting to %s every %ss", server_url, interval)
    while True:
        metrics = collect_metrics()
        try:
            res = requests.post(f"{server_url}/metrics", json=metrics, timeout=5)
            logger.info("Metrics sent: status %s", res.status_code)
        except Exception as e:
            logger.error("Failed to send metrics: %s", e)
        time.sleep(interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--server", type=str, required=True, help="Backend server URL")
    parser.add_argument("--interval", type=int, default=5, help="Seconds between metric reports")
    args = parser.parse_args()
    main(args.server, args.interval)

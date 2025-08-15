import argparse
import platform
import socket
import time
import requests
import psutil
import uuid
import logging
import subprocess
from typing import Dict, Any, List

# Set up logger for agent output
def setup_logger():
    logger = logging.getLogger("AgentLogger")
    handler = logging.StreamHandler()
    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger

logger = setup_logger()

# Generate a unique agent ID (machine-id, Windows GUID, or persistent file fallback)
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

# ----------- GPU Info Section -----------

# Try to get NVIDIA GPU stats via GPUtil or nvidia-smi as a fallback
def get_nvidia_gpus():
    try:
        import GPUtil
        gpus = []
        for gpu in GPUtil.getGPUs():
            gpus.append({
                "vendor": "NVIDIA",
                "name": gpu.name,
                "id": gpu.id,
                "load": round(gpu.load * 100, 1),
                "total_memory_MB": gpu.memoryTotal,
                "used_memory_MB": gpu.memoryUsed,
                "free_memory_MB": gpu.memoryFree,
                "temperature_C": gpu.temperature,
                "driver": gpu.driver,
                "uuid": gpu.uuid
            })
        return gpus
    except Exception:
        # Fallback: use nvidia-smi CLI if GPUtil is unavailable
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.total,memory.used,memory.free,temperature.gpu,driver_version,uuid", "--format=csv,noheader,nounits"],
                capture_output=True, check=True, text=True
            )
            gpus = []
            for line in result.stdout.strip().splitlines():
                name, util, mem_total, mem_used, mem_free, temp, driver, uuid = [x.strip() for x in line.split(",")]
                gpus.append({
                    "vendor": "NVIDIA",
                    "name": name,
                    "utilization": float(util),
                    "total_memory_MB": float(mem_total),
                    "used_memory_MB": float(mem_used),
                    "free_memory_MB": float(mem_free),
                    "temperature_C": float(temp),
                    "driver": driver,
                    "uuid": uuid
                })
            return gpus
        except Exception:
            return []

# Try to get AMD GPU stats via pyamdgpuinfo or rocm-smi as a fallback
def get_amd_gpus():
    try:
        import pyamdgpuinfo
        gpus = []
        count = pyamdgpuinfo.detect_gpus()
        for i in range(count):
            gpus.append({
                "vendor": "AMD",
                "name": pyamdgpuinfo.get_gpu_name(i),
                "vram_total_MB": pyamdgpuinfo.get_vram_total(i) // 1024 // 1024,
                "vram_usage_MB": pyamdgpuinfo.get_vram_usage(i) // 1024 // 1024,
                "temperature_C": pyamdgpuinfo.get_temp(i),
                "bus": pyamdgpuinfo.get_bus(i)
            })
        return gpus
    except Exception:
        # Fallback: use rocm-smi CLI if pyamdgpuinfo is unavailable
        try:
            result = subprocess.run(
                ["rocm-smi", "--showproductname", "--showuse", "--showmemuse", "--showtemp", "--json"],
                capture_output=True, check=True, text=True
            )
            import json
            data = json.loads(result.stdout)
            gpus = []
            for gpu_id, gpu_info in data.items():
                gpus.append({
                    "vendor": "AMD",
                    "name": gpu_info.get("Card series", ""),
                    "utilization": gpu_info.get("GPU use (%)", 0),
                    "total_memory_MB": gpu_info.get("VRAM Total Memory (B)", 0) // 1024 // 1024,
                    "used_memory_MB": gpu_info.get("VRAM Used Memory (B)", 0) // 1024 // 1024,
                    "temperature_C": gpu_info.get("Temperature (Sensor edge) (C)", 0),
                })
            return gpus
        except Exception:
            return []

# Try to get Intel GPU stats via intel_gpu_top (Linux only)
def get_intel_gpus():
    if platform.system() != "Linux":
        return []
    try:
        result = subprocess.run(
            ["timeout", "1", "intel_gpu_top", "-J"],
            capture_output=True, check=True, text=True
        )
        import json
        data = json.loads(result.stdout)
        gpus = []
        for card in data.get("cards", []):
            gpus.append({
                "vendor": "Intel",
                "name": card.get("card", "Intel GPU"),
                "utilization": card.get("busy", 0),
                "engines": card.get("engines", []),
            })
        return gpus
    except Exception:
        return []

# Try to get GPU stats on Windows via WMIC command
def get_windows_gpus():
    if platform.system() != "Windows":
        return []
    try:
        result = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "Name,AdapterRAM,DriverVersion", "/format:csv"],
            capture_output=True, check=True, text=True, encoding="utf-8"
        )
        lines = [l for l in result.stdout.strip().splitlines() if l and "Node" not in l]
        gpus = []
        for line in lines[1:]:
            fields = line.split(",")
            if len(fields) >= 4:
                _, name, ram, driver = fields
                gpus.append({
                    "vendor": "Unknown",
                    "name": name,
                    "adapter_ram_MB": int(ram) // 1024 // 1024 if ram.isdigit() else None,
                    "driver": driver
                })
        return gpus
    except Exception:
        return []

# Dispatch function: gather all GPU info for this platform
def get_all_gpus():
    gpus = []
    if platform.system() == "Windows":
        gpus += get_nvidia_gpus()
        gpus += get_windows_gpus()
    elif platform.system() == "Linux":
        gpus += get_nvidia_gpus()
        gpus += get_amd_gpus()
        gpus += get_intel_gpus()
    elif platform.system() == "Darwin":
        try:
            result = subprocess.run(
                ["system_profiler", "SPDisplaysDataType", "-json"],
                capture_output=True, check=True, text=True
            )
            import json
            data = json.loads(result.stdout)["SPDisplaysDataType"]
            for gpu in data:
                gpus.append({
                    "vendor": "Apple/Intel/AMD/NVIDIA",
                    "name": gpu.get("sppci_model", ""),
                    "vram": gpu.get("spdisplays_vram", ""),
                })
        except Exception:
            pass
    return gpus

# ----------- Hardware Names Section -----------

# Get CPU name/brand string using platform-appropriate methods
def get_cpu_name():
    try:
        if platform.system() == "Windows":
            import wmi
            return wmi.WMI().Win32_Processor()[0].Name
        elif platform.system() == "Linux":
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        return line.split(":", 1)[1].strip()
        elif platform.system() == "Darwin":
            result = subprocess.check_output(["sysctl", "-n", "machdep.cpu.brand_string"])
            return result.decode().strip()
    except Exception:
        pass
    return platform.processor() or "Unknown"

# List disk devices and mountpoints
def get_disk_names():
    names = []
    try:
        for part in psutil.disk_partitions(all=False):
            names.append({"device": part.device, "mountpoint": part.mountpoint, "fstype": part.fstype})
    except Exception:
        pass
    return names

# List network interface names
def get_nic_names():
    try:
        return list(psutil.net_if_addrs().keys())
    except Exception:
        return []

# Get RAM info: total and (optionally) module info on Windows/Linux
def get_ram_info():
    info = {}
    try:
        vm = psutil.virtual_memory()
        info["total_MB"] = vm.total // 1024 // 1024
        if platform.system() == "Linux":
            try:
                with open('/proc/meminfo') as f:
                    lines = f.readlines()
                for l in lines:
                    if "MemTotal" in l:
                        info["meminfo_total"] = l.strip()
            except Exception:
                pass
        elif platform.system() == "Windows":
            try:
                import wmi
                w = wmi.WMI()
                mems = w.Win32_PhysicalMemory()
                if mems:
                    info["modules"] = []
                    for m in mems:
                        info["modules"].append({
                            "capacity_MB": int(m.Capacity) // 1024 // 1024,
                            "type": m.MemoryType,
                            "speed": m.Speed,
                            "manufacturer": m.Manufacturer
                        })
            except Exception:
                pass
    except Exception:
        pass
    return info

# ----------- Metrics Collection -----------

def collect_metrics() -> Dict[str, Any]:
    # Uptime since last boot
    uptime = time.time() - psutil.boot_time()
    # Try to get load averages (Linux/Unix), fallback to zeros
    try:
        load_avg = psutil.getloadavg()
    except (AttributeError, NotImplementedError):
        load_avg = (0, 0, 0)
    # CPU percent usage (aggregate and per core)
    cpu_perc = psutil.cpu_percent(percpu=True)
    cpu_total = psutil.cpu_percent()
    # Memory stats
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    # Disk usage and I/O stats
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
    # Network I/O stats per NIC
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
    # Top 5 processes by CPU and memory usage
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

    # Hardware summary dictionary (excluding motherboard)
    hardware = {
        "cpu": get_cpu_name(),
        "gpus": [gpu["name"] for gpu in get_all_gpus()],
        "disks": get_disk_names(),
        "network_interfaces": get_nic_names(),
        "ram": get_ram_info(),
        # "motherboard": get_motherboard_info(),  # Removed as requested
    }

    # Compose metrics payload
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
        "gpus": get_all_gpus(),
        "hardware": hardware
    }
    return data

# Main loop: collect and POST metrics to backend at the specified interval
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

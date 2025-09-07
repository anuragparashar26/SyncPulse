export const formatSensorName = (name, type = 'group') => {
  if (!name) return '';

  const groupMap = {
    coretemp: "CPU Cores",
    acpitz: "ACPI Thermal Zone",
    amdgpu: "AMD GPU",
    nouveau: "Nouveau (NVIDIA) GPU",
    nvme: "NVMe Drive",
    k10temp: "AMD K10 CPU",
  };

  if (type === 'group') {
    return groupMap[name] || name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  if (type === 'label') {
    const labelMap = {
      "Package id 0": "CPU Package",
      "Physical id 0": "CPU Physical",
    };
    return labelMap[name] || name;
  }

  return name;
};

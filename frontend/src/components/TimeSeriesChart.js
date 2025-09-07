import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function TimeSeriesChart({ dataPoints, labels, label='Value', color='rgba(75,192,192,1)', height=90, unit }) {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return <div style={{ height, display:'flex',alignItems:'center',justifyContent:'center',color:'#888' }}>No data</div>;
  }
  const normalized = dataPoints.map(d => {
    if (typeof d === 'number') return d;
    if (d && typeof d === 'object') return d.v ?? d.value ?? d.y ?? 0;
    return 0;
  });
  const finalLabels = Array.isArray(labels) && labels.length === normalized.length
    ? labels
    : normalized.map((_d,i)=>i+1);
  const data = {
    labels: finalLabels,
    datasets: [{
      label: unit ? `${label} (${unit})` : label,
      data: normalized,
      tension: 0.3,
      borderColor: color,
      pointRadius: 0,
      fill: true,
      backgroundColor: color.replace(/1\)$/, '0.15)')
    }]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
    scales: { x: { ticks: { display:false }, grid: { display: false } }, y: { ticks: { color:'#888' }, grid: { color: 'rgba(0,0,0,0.05)' } } }
  };
  return <div style={{ height }}><Line data={data} options={options} /></div>;
}

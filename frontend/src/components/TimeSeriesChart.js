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

export default function TimeSeriesChart({ dataPoints, label='Value', color='rgba(75,192,192,1)', height=90, unit }) {
  const data = {
    labels: dataPoints.map((_d,i)=>i+1), 
    datasets: [
      {
        label: unit ? `${label} (${unit})` : label,
        data: dataPoints.map(d => d.v),
        tension: 0.3,
        borderColor: color,
        pointRadius: 0,
        fill: true,
        backgroundColor: color.replace('1)', '0.15)')
      }
    ]
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: { x: { ticks: { display:false }, grid: { display: false } }, y: { ticks: { color:'#888' }, grid: { color: 'rgba(0,0,0,0.05)' } } }
  };
  return <div style={{ height }}><Line data={data} options={options} /></div>;
}

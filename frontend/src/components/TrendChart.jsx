import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TrendChart({ daily = [] }) {
  const chartData = useMemo(() => {
    if (!daily || daily.length === 0) return null;

    const labels = daily.map((d) => d.date);
    const meanTemps = daily.map((d) => d.temp_mean_c);
    const maxTemps = daily.map((d) => d.temp_max_c);
    const minTemps = daily.map((d) => d.temp_min_c);

    // Compute 7-day rolling average
    const rollingAvg = daily.map((_, idx) => {
      const start = Math.max(0, idx - 6);
      const window = daily.slice(start, idx + 1);
      const sum = window.reduce((acc, curr) => acc + (curr.temp_mean_c ?? 0), 0);
      return +(sum / window.length).toFixed(2);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Daily Max (°C)',
          data: maxTemps,
          borderColor: 'rgba(2, 132, 199, 0.25)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.15,
        },
        {
          label: 'Min-Max Range',
          data: minTemps,
          borderColor: 'rgba(2, 132, 199, 0.25)',
          borderWidth: 1,
          pointRadius: 0,
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          fill: '-1',
          tension: 0.15,
        },
        {
          label: 'Daily Mean (°C)',
          data: meanTemps,
          borderColor: '#0284c7', // Flat light blue
          backgroundColor: '#0284c7',
          borderWidth: 1.8,
          pointRadius: daily.length > 90 ? 0 : 2,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.15,
        },
        {
          label: '7-Day Rolling Trend',
          data: rollingAvg,
          borderColor: '#ef4444', // Flat red
          backgroundColor: '#ef4444',
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.2,
        },
      ],
    };
  }, [daily]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Temperature Trend & Rolling Average',
        font: { family: "'Inter', sans-serif", size: 14, weight: '600' },
        color: '#475569',
        align: 'start',
        padding: { bottom: 16 },
      },
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          color: '#64748b',
          font: { family: "'Inter', sans-serif", size: 12 },
          filter: (item) => item.text !== 'Daily Max (°C)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            return ` ${context.dataset.label}: ${val !== null && val !== undefined ? val.toFixed(1) : '--'} °C`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: '#94a3b8',
          maxTicksLimit: 10,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: '#94a3b8',
          font: { family: "'Inter', sans-serif", size: 11 },
          callback: (value) => `${value}°C`,
        },
      },
    },
  };

  if (!chartData) {
    return <div className="empty-chart">No temperature data available for this range.</div>;
  }

  return (
    <div className="chart-card-inner">
      <div className="chart-canvas-container" style={{ height: '320px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

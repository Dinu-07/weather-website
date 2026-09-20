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

    // Compute 7-day rolling average (min_periods = 1)
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
          borderColor: 'rgba(76, 114, 176, 0.25)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Daily Min-Max Range',
          data: minTemps,
          borderColor: 'rgba(76, 114, 176, 0.25)',
          borderWidth: 1,
          pointRadius: 0,
          backgroundColor: 'rgba(76, 114, 176, 0.18)',
          fill: '-1', // Fill between this dataset (Min) and the previous dataset (Max)
          tension: 0.1,
        },
        {
          label: 'Daily Mean Temp (°C)',
          data: meanTemps,
          borderColor: 'rgba(76, 114, 176, 0.65)',
          borderWidth: 1.2,
          pointRadius: daily.length > 90 ? 0 : 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#4C72B0',
          fill: false,
          tension: 0.1,
        },
        {
          label: '7-Day Rolling Average (°C)',
          data: rollingAvg,
          borderColor: '#C44E52',
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#C44E52',
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
        text: 'Temperature Trend Over Time',
        font: { size: 16, weight: 'bold' },
        color: '#1e293b',
        padding: { bottom: 15 },
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          filter: (item) => item.text !== 'Daily Max (°C)', // clean up duplicate legend item for the filled band
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            return ` ${context.dataset.label}: ${val !== null && val !== undefined ? val.toFixed(1) : 'N/A'} °C`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          maxTicksLimit: 12,
          font: { size: 11 },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Temperature (°C)',
          font: { weight: 'bold' },
        },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
      },
    },
  };

  if (!chartData) {
    return <div className="card empty-chart">No trend data available.</div>;
  }

  return (
    <div className="card chart-card">
      <div className="chart-container" style={{ height: '360px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ForecastChart({ daily = [], forecast = [] }) {
  const { chartData, separatorIndex } = useMemo(() => {
    if (!daily || daily.length === 0 || !forecast || forecast.length === 0) {
      return { chartData: null, separatorIndex: -1 };
    }

    // Last 30 days of actuals
    const recentActuals = daily.slice(-30);
    const labels = [
      ...recentActuals.map((d) => d.date),
      ...forecast.map((f) => f.date),
    ];

    // Actuals dataset
    const actualsData = [
      ...recentActuals.map((d) => d.temp_mean_c),
      ...forecast.map(() => null),
    ];

    // Forecast dataset
    const forecastData = [
      ...recentActuals.slice(0, -1).map(() => null),
      recentActuals[recentActuals.length - 1].temp_mean_c,
      ...forecast.map((f) => f.forecast_temp_c),
    ];

    const data = {
      labels,
      datasets: [
        {
          label: 'Historical Actuals (°C)',
          data: actualsData,
          borderColor: '#0284c7', // Flat blue
          backgroundColor: '#0284c7',
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.15,
        },
        {
          label: `${forecast.length}-Day Linear Projection`,
          data: forecastData,
          borderColor: '#f97316', // Flat orange
          backgroundColor: '#f97316',
          borderDash: [5, 4],
          borderWidth: 2.2,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.1,
        },
      ],
    };

    return { chartData: data, separatorIndex: recentActuals.length - 1 };
  }, [daily, forecast]);

  // Plugin to draw subtle vertical marker separating actuals from forecast
  const separatorPlugin = useMemo(() => {
    return {
      id: 'separatorPlugin',
      afterDatasetsDraw(chart) {
        if (separatorIndex < 0) return;
        const {
          ctx,
          chartArea: { top, bottom },
          scales: { x },
        } = chart;

        const xPos = x.getPixelForValue(separatorIndex);

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#f97316';
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Forecast Start', xPos, top - 6);
        ctx.restore();
      },
    };
  }, [separatorIndex]);

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
        text: 'Short-Term Forecast (Linear Projection)',
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
          maxTicksLimit: 12,
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
    return <div className="empty-chart">No forecast projection available.</div>;
  }

  return (
    <div className="chart-card-inner">
      <div className="chart-canvas-container" style={{ height: '320px' }}>
        <Line data={chartData} options={options} plugins={[separatorPlugin]} />
      </div>
    </div>
  );
}

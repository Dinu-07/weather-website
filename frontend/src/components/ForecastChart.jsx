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

    // Forecast dataset - connects with the last actual data point
    const forecastData = [
      ...recentActuals.slice(0, -1).map(() => null),
      recentActuals[recentActuals.length - 1].temp_mean_c,
      ...forecast.map((f) => f.forecast_temp_c),
    ];

    const data = {
      labels,
      datasets: [
        {
          label: 'Recent Actual Temps (°C)',
          data: actualsData,
          borderColor: '#4C72B0',
          backgroundColor: '#4C72B0',
          borderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1,
        },
        {
          label: `${forecast.length}-Day Forecast (Trend Projection)`,
          data: forecastData,
          borderColor: '#DD8452',
          backgroundColor: '#DD8452',
          borderDash: [6, 6],
          borderWidth: 2.2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.1,
        },
      ],
    };

    return { chartData: data, separatorIndex: recentActuals.length - 1 };
  }, [daily, forecast]);

  // Plugin to draw vertical marker separating actuals from forecast
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
        ctx.strokeStyle = '#64748b';
        ctx.stroke();

        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Historical / Forecast', xPos, bottom - 10);
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
        text: 'Basic Short-Term Temperature Forecast',
        font: { size: 16, weight: 'bold' },
        color: '#1e293b',
        padding: { bottom: 15 },
      },
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            if (val === null || val === undefined) return null;
            return ` ${context.dataset.label}: ${val.toFixed(2)} °C`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: {
          maxTicksLimit: 14,
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
    return <div className="card empty-chart">No forecast data available.</div>;
  }

  return (
    <div className="card chart-card">
      <div className="chart-container" style={{ height: '340px' }}>
        <Line data={chartData} options={options} plugins={[separatorPlugin]} />
      </div>
    </div>
  );
}

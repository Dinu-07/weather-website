import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Histogram({ daily = [], stats = {} }) {
  const { chartData, bins, avgTemp } = useMemo(() => {
    if (!daily || daily.length === 0) return { chartData: null, bins: [], avgTemp: null };

    const temps = daily
      .map((d) => d.temp_mean_c)
      .filter((t) => t !== null && t !== undefined && !isNaN(t));

    if (temps.length === 0) return { chartData: null, bins: [], avgTemp: null };

    const min = Math.floor(Math.min(...temps));
    const max = Math.ceil(Math.max(...temps));
    const numBins = Math.min(16, Math.max(6, Math.round(Math.sqrt(temps.length))));
    const binWidth = (max - min) / numBins;

    const binList = [];
    for (let i = 0; i < numBins; i++) {
      const bMin = min + i * binWidth;
      const bMax = min + (i + 1) * binWidth;
      binList.push({
        min: bMin,
        max: bMax,
        label: `${bMin.toFixed(0)}-${bMax.toFixed(0)}°`,
        count: 0,
      });
    }

    temps.forEach((t) => {
      let idx = Math.floor((t - min) / binWidth);
      if (idx >= numBins) idx = numBins - 1;
      if (idx < 0) idx = 0;
      binList[idx].count++;
    });

    const avg = stats?.avg_temp_c ?? (temps.reduce((a, b) => a + b, 0) / temps.length);

    const data = {
      labels: binList.map((b) => b.label),
      datasets: [
        {
          label: 'Days Observed',
          data: binList.map((b) => b.count),
          backgroundColor: '#10b981', // Clean flat green
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: '#059669',
        },
      ],
    };

    return { chartData: data, bins: binList, avgTemp: avg };
  }, [daily, stats]);

  // Plugin to draw subtle dashed vertical line at mean temperature
  const meanLinePlugin = useMemo(() => {
    return {
      id: 'meanLinePlugin',
      afterDatasetsDraw(chart) {
        if (avgTemp === null || avgTemp === undefined || bins.length === 0) return;
        const {
          ctx,
          chartArea: { top, bottom },
          scales: { x },
        } = chart;

        const binIdx = bins.findIndex(
          (b) => avgTemp >= b.min && avgTemp <= b.max
        );
        if (binIdx === -1) return;

        const bin = bins[binIdx];
        const span = bin.max - bin.min;
        const frac = span > 0 ? (avgTemp - bin.min) / span : 0.5;
        const catWidth = x.width / bins.length;
        const barLeft = x.getPixelForValue(binIdx) - catWidth / 2;
        const xPos = barLeft + frac * catWidth;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = '500 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Mean: ${avgTemp.toFixed(1)}°C`, xPos, top - 6);
        ctx.restore();
      },
    };
  }, [avgTemp, bins]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Temperature Frequency Distribution',
        font: { family: "'Inter', sans-serif", size: 14, weight: '600' },
        color: '#475569',
        align: 'start',
        padding: { bottom: 16 },
      },
      legend: {
        display: false,
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
          title: (items) => `Temperature: ${items[0].label}C`,
          label: (context) => ` ${context.parsed.y} days`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: {
          color: '#94a3b8',
          precision: 0,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
    },
  };

  if (!chartData) {
    return <div className="empty-chart">No distribution data available.</div>;
  }

  return (
    <div className="chart-card-inner">
      <div className="chart-canvas-container" style={{ height: '320px' }}>
        <Bar data={chartData} options={options} plugins={[meanLinePlugin]} />
      </div>
    </div>
  );
}

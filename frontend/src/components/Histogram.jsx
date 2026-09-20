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
    const numBins = Math.min(20, Math.max(8, Math.round(Math.sqrt(temps.length))));
    const binWidth = (max - min) / numBins;

    const binList = [];
    for (let i = 0; i < numBins; i++) {
      const bMin = min + i * binWidth;
      const bMax = min + (i + 1) * binWidth;
      binList.push({
        min: bMin,
        max: bMax,
        label: `${bMin.toFixed(1)} - ${bMax.toFixed(1)}°`,
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
          label: 'Frequency (days)',
          data: binList.map((b) => b.count),
          backgroundColor: 'rgba(85, 168, 104, 0.85)', // Matplotlib #55A868
          borderColor: '#3b8b4c',
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    };

    return { chartData: data, bins: binList, avgTemp: avg };
  }, [daily, stats]);

  // Plugin to draw dashed vertical line at mean temperature
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
        ctx.setLineDash([5, 5]);
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#C44E52';
        ctx.stroke();

        ctx.fillStyle = '#C44E52';
        ctx.font = 'bold 11px sans-serif';
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
        text: 'Distribution of Daily Mean Temperatures',
        font: { size: 16, weight: 'bold' },
        color: '#1e293b',
        padding: { bottom: 15 },
      },
      legend: {
        position: 'top',
        labels: { boxWidth: 12 },
      },
      tooltip: {
        callbacks: {
          title: (items) => `Temperature Range: ${items[0].label}C`,
          label: (item) => ` ${item.parsed.y} days`,
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Temperature Range (°C)',
          font: { weight: 'bold' },
        },
        grid: { display: false },
        ticks: {
          maxRotation: 45,
          minRotation: 30,
          font: { size: 10 },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Frequency (days)',
          font: { weight: 'bold' },
        },
        grid: { color: 'rgba(0, 0, 0, 0.08)' },
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  if (!chartData) {
    return <div className="card empty-chart">No distribution data available.</div>;
  }

  return (
    <div className="card chart-card">
      <div className="chart-container" style={{ height: '340px' }}>
        <Bar data={chartData} options={options} plugins={[meanLinePlugin]} />
      </div>
    </div>
  );
}

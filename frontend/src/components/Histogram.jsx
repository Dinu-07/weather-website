import React, { useMemo, useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 560px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 560px)');
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const { chartData, bins, avgTemp, hasInsufficientTemps } = useMemo(() => {
    if (!daily || daily.length === 0) {
      return { chartData: null, bins: [], avgTemp: null, hasInsufficientTemps: false };
    }

    const temps = daily
      .map((d) => d.temp_mean_c)
      .filter((t) => t !== null && t !== undefined && !isNaN(t));

    if (temps.length < 7) {
      return { chartData: null, bins: [], avgTemp: null, hasInsufficientTemps: true };
    }

    const rawMin = Math.min(...temps);
    const rawMax = Math.max(...temps);
    const spread = rawMax - rawMin;
    const isLowSpread = spread < 6;

    // Sturges' rule: ceil(log2(n)) + 1, min 3, max 13
    const sturges = Math.ceil(Math.log2(temps.length)) + 1;
    const numBins = Math.min(13, Math.max(3, sturges));

    let min, max, binWidth;
    if (isLowSpread) {
      min = rawMin;
      max = rawMax;
      binWidth = spread > 0 ? spread / numBins : 1;
    } else {
      min = Math.floor(rawMin);
      max = Math.ceil(rawMax);
      binWidth = (max - min) / numBins;
    }

    const binList = [];
    const usedLabels = new Set();

    for (let i = 0; i < numBins; i++) {
      const bMin = min + i * binWidth;
      const bMax = (i === numBins - 1 && isLowSpread) ? max : min + (i + 1) * binWidth;

      let label;
      if (isLowSpread) {
        let startStr = bMin.toFixed(1);
        let endStr = bMax.toFixed(1);
        if (startStr === endStr) {
          endStr = (parseFloat(startStr) + 0.1).toFixed(1);
        }
        label = `${startStr}-${endStr}°`;
        let bump = 0.1;
        while (usedLabels.has(label)) {
          let altEnd = (parseFloat(endStr) + bump).toFixed(1);
          label = `${startStr}-${altEnd}°`;
          bump += 0.1;
        }
      } else {
        label = `${bMin.toFixed(0)}-${bMax.toFixed(0)}°`;
        let bump = 1;
        while (usedLabels.has(label)) {
          label = `${bMin.toFixed(0)}-${(bMax + bump).toFixed(0)}°`;
          bump += 1;
        }
      }
      usedLabels.add(label);

      binList.push({
        min: bMin,
        max: bMax,
        label,
        count: 0,
      });
    }

    temps.forEach((t) => {
      let idx = binWidth > 0 ? Math.floor((t - min) / binWidth) : 0;
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

    return { chartData: data, bins: binList, avgTemp: avg, hasInsufficientTemps: false };
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
    interaction: isMobile
      ? {
          mode: 'nearest',
          intersect: false,
        }
      : undefined,
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
          autoSkip: isMobile ? true : undefined,
          maxTicksLimit: isMobile ? 6 : undefined,
          minRotation: isMobile ? 0 : undefined,
          maxRotation: isMobile ? 0 : undefined,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
      y: {
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        beginAtZero: true,
        ticks: {
          color: '#94a3b8',
          precision: 0,
          stepSize: 1,
          callback: (val) => (Number.isInteger(val) ? val : null),
          maxTicksLimit: isMobile ? 6 : undefined,
          font: { family: "'Inter', sans-serif", size: 11 },
        },
      },
    },
  };

  if (!daily || daily.length === 0) {
    return <div className="empty-chart">No distribution data available.</div>;
  }

  if (daily.length < 7 || hasInsufficientTemps) {
    return <div className="empty-chart">Select at least 7 days to see a distribution.</div>;
  }

  if (!chartData) {
    return <div className="empty-chart">No distribution data available.</div>;
  }

  return (
    <div className="chart-card-inner">
      <div className="chart-canvas-container" style={{ height: isMobile ? '280px' : '320px', minHeight: '260px' }}>
        <Bar data={chartData} options={options} plugins={[meanLinePlugin]} />
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { computeSourceData } from '../../lib/analytics';
import { chartGridColor, chartTextColor } from '../../lib/theme';

export default function SourceChart({ records, dark, onSelectSource }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const top = computeSourceData(records);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: { labels: top.map((t) => t[0]), datasets: [{ data: top.map((t) => t[1]), backgroundColor: '#2b7fff', borderRadius: 6, maxBarThickness: 22 }] },
      options: {
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: chartGridColor(dark) }, ticks: { color: chartTextColor(dark), font: { family: 'JetBrains Mono', size: 10 } } },
          y: { grid: { display: false }, ticks: { color: chartTextColor(dark), font: { family: 'Vazirmatn', size: 11 } } },
        },
      },
    });
    canvas.onclick = (evt) => {
      const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!points.length) return;
      onSelectSource(top[points[0].index][0], top);
    };
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, dark]);

  return (
    <div className="crm-section">
      <div className="crm-section-title">منابع سرنخ</div>
      <div className="crm-chart-canvas-wrap"><canvas ref={canvasRef} id="crmSourceChart"></canvas></div>
      <div className="crm-chart-chips" id="crmSourceChips">
        {top.map((t, idx) => (
          <button key={t[0]} type="button" className="crm-chart-chip" onClick={() => onSelectSource(t[0], top)}>{t[0]} ({t[1].toLocaleString('en-US')})</button>
        ))}
      </div>
    </div>
  );
}

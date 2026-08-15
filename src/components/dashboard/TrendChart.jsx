'use client';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { computeTrendData } from '../../lib/analytics.js';
import { chartGridColor, chartTextColor } from '../../lib/theme.js';
import { useUiStore } from '../../lib/uiStore.js';

export default function TrendChart({ records, dark, onSelectMonth }) {
  const calendar = useUiStore((u) => u.calendar);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { keys, labels, data, ranges } = computeTrendData(records, calendar);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#64748b', borderRadius: 6, maxBarThickness: 34 }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => c.parsed.y + ' تماس' } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartTextColor(dark), font: { family: 'Vazirmatn', size: 11 } } },
          y: { grid: { color: chartGridColor(dark) }, ticks: { color: chartTextColor(dark), precision: 0, font: { family: 'JetBrains Mono', size: 10 } } },
        },
      },
    });
    canvas.onclick = (evt) => {
      const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!points.length) return;
      const idx = points[0].index;
      onSelectMonth(ranges[idx].from, ranges[idx].to, labels[idx]);
    };
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, dark, calendar]);

  return (
    <div className="crm-section">
      <div className="crm-section-title">روند ماهانه تماس‌ها</div>
      <div className="crm-chart-canvas-wrap"><canvas ref={canvasRef} id="crmTrendChart"></canvas></div>
      <div className="crm-chart-chips" id="crmTrendChips">
        {keys.map((k, idx) => (
          <button key={k} type="button" className="crm-chart-chip" onClick={() => onSelectMonth(ranges[idx].from, ranges[idx].to, labels[idx])}>
            {labels[idx]} ({data[idx].toLocaleString('en-US')})
          </button>
        ))}
      </div>
    </div>
  );
}

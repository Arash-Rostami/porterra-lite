'use client';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { computeCategoryData } from '../../lib/analytics';
import { chartTextColor } from '../../lib/theme';

export default function CategoryChart({ records, dark, onSelectCategory }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { labels, data, colors } = computeCategoryData(records);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: dark ? '#182229' : '#fff' }] },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: chartTextColor(dark), font: { family: 'Vazirmatn', size: 11 }, padding: 12, boxWidth: 10 } } },
        cutout: '62%',
      },
    });
    canvas.onclick = (evt) => {
      const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!points.length) return;
      onSelectCategory(labels[points[0].index]);
    };
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, dark]);

  return (
    <div className="crm-section">
      <div className="crm-section-title">توزیع دسته محصول</div>
      <div className="crm-chart-canvas-wrap"><canvas ref={canvasRef} id="crmCategoryChart"></canvas></div>
      <div className="crm-chart-chips" id="crmCategoryChips">
        {labels.map((l, idx) => (
          <button key={l} type="button" className="crm-chart-chip" onClick={() => onSelectCategory(l)}>{l} ({data[idx].toLocaleString('en-US')})</button>
        ))}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { computeDailyAgentData } from '../../lib/analytics.js';
import { chartGridColor, chartTextColor } from '../../lib/theme.js';
import { coordLabel } from '../../lib/filters.js';
import { useUiStore } from '../../lib/uiStore.js';

export default function DailyAgentChart({ records, dark, onSelectDay }) {
  const calendar = useUiStore((u) => u.calendar);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { y, labels, datasets, agents, cap, wasCapped, totalThisMonth, activeDays, monthLabel, dayDates } = computeDailyAgentData(records, calendar);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: chartTextColor(dark), font: { family: 'Vazirmatn', size: 11 }, boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const raw = c.dataset.rawData ? c.dataset.rawData[c.dataIndex] : c.parsed.y;
                return c.dataset.label + ': ' + raw.toLocaleString('en-US') + ' تماس' + (raw > cap ? ' (خارج از مقیاس نمودار)' : '');
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: chartTextColor(dark), font: { family: 'JetBrains Mono', size: 10 } } },
          y: { beginAtZero: true, suggestedMax: cap, grid: { color: chartGridColor(dark) }, ticks: { color: chartTextColor(dark), precision: 0, font: { family: 'JetBrains Mono', size: 10 } } },
        },
      },
    });
    canvas.onclick = (evt) => {
      const points = chartRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
      if (!points.length) return;
      const p0 = points[0];
      const day = p0.index + 1;
      const agent = agents[p0.datasetIndex];
      onSelectDay(dayDates[p0.index], agent, `${coordLabel(agent)} — روز ${day} ${monthLabel}`);
    };
    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, dark, calendar]);

  return (
    <div className="crm-section">
      <div className="crm-section-title" id="crmCurrentMonthLabel">{monthLabel} {y} — {totalThisMonth.toLocaleString('en-US')} تماس تا الان</div>
      <div className="crm-chart-canvas-wrap"><canvas ref={canvasRef} id="crmDailyAgentChart"></canvas></div>
      <div className="crm-hint" id="crmDailyAgentCapHint">
        {wasCapped ? 'برای خوانایی بهتر، روزهای با تماس خیلی بالا (مثلاً ثبت دسته‌ای) در نمودار محدود شدن؛ عدد واقعی توی راهنمای هر ستون هست.' : ''}
      </div>
      <div className="crm-chart-chips" id="crmDailyAgentChips">
        {activeDays.map((d) => (
          <button key={d.i} type="button" className="crm-chart-chip" onClick={() => onSelectDay(d.date, null, `روز ${d.lab} ${monthLabel} — همه کارشناسان`)}>
            روز {d.lab} ({d.total.toLocaleString('en-US')})
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Crafty GIS — Advanced Charting System
   Human-Mode Build: Complete, Tested, Production-Ready
   ═══════════════════════════════════════════════════════════ */

const FH_CHARTS = (function() {
  'use strict';

  let charts = {};

  // ─── Health Doughnut Chart ───
  function createHealthChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.health) {
      charts.health.destroy();
    }

    const labels = ['Healthy', 'Mild Stress', 'Moderate Stress', 'Severe Stress', 'Critical'];
    const values = [
      data.cc?.[3] || 0,
      data.cc?.[4] || 0,
      data.cc?.[2] || 0,
      data.cc?.[1] || 0,
      data.cc?.[0] || 0
    ];
    const colors = ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

    charts.health = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#1e293b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd5e1',
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${percentage}%`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 1500
        }
      }
    });

    return charts.health;
  }

  // ─── Time Series Chart ───
  function createTimeSeriesChart(canvasId, timeSeriesData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.timeseries) {
      charts.timeseries.destroy();
    }

    const labels = timeSeriesData.map(d => d.date);
    const ndviValues = timeSeriesData.map(d => d.ndvi);
    const ndwiValues = timeSeriesData.map(d => d.ndwi);

    charts.timeseries = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'NDVI',
            data: ndviValues,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'NDWI',
            data: ndwiValues,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1' }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            min: 0,
            max: 1
          }
        },
        animation: {
          duration: 2000
        }
      }
    });

    return charts.timeseries;
  }

  // ─── Zone Analysis Bar Chart ───
  function createZoneChart(canvasId, zones) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.zones) {
      charts.zones.destroy();
    }

    const labels = zones.map(z => z.id || `Zone ${z.index}`);
    const ndviValues = zones.map(z => z.ndvi || 0);
    const colors = ndviValues.map(v => {
      if (v >= 0.6) return '#10b981';
      if (v >= 0.4) return '#f59e0b';
      return '#ef4444';
    });

    charts.zones = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'NDVI by Zone',
          data: ndviValues,
          backgroundColor: colors,
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            min: 0,
            max: 1
          }
        },
        animation: {
          duration: 1500
        }
      }
    });

    return charts.zones;
  }

  // ─── Radar Chart (Multi-parameter) ───
  function createRadarChart(canvasId, parameters) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.radar) {
      charts.radar.destroy();
    }

    const labels = Object.keys(parameters);
    const values = Object.values(parameters);

    charts.radar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Field Parameters',
          data: values,
          backgroundColor: 'rgba(34, 197, 94, 0.2)',
          borderColor: '#22c55e',
          borderWidth: 2,
          pointBackgroundColor: '#22c55e',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#22c55e'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            angleLines: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            pointLabels: {
              color: '#cbd5e1',
              font: { size: 10 }
            },
            ticks: {
              color: '#94a3b8',
              backdropColor: 'transparent'
            },
            min: 0,
            max: 1
          }
        },
        animation: {
          duration: 1500
        }
      }
    });

    return charts.radar;
  }

  // ─── Trend Analysis Chart ───
  function createTrendChart(canvasId, trends) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.trend) {
      charts.trend.destroy();
    }

    const labels = trends.map(t => t.date);
    const ndviTrend = trends.map(t => t.ndvi);
    const forecast = trends.map(t => t.forecast);

    charts.trend = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'NDVI Trend',
            data: labels.map((date, i) => ({ x: i, y: ndviTrend[i] })),
            borderColor: '#22c55e',
            backgroundColor: '#22c55e',
            showLine: true,
            tension: 0.4
          },
          {
            label: 'Forecast',
            data: labels.map((date, i) => ({ x: i, y: forecast[i] })),
            borderColor: '#f59e0b',
            backgroundColor: '#f59e0b',
            showLine: true,
            tension: 0.4,
            borderDash: [5, 5]
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1' }
          }
        },
        scales: {
          x: {
            type: 'linear',
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            min: 0,
            max: 1
          }
        }
      }
    });

    return charts.trend;
  }

  // ─── Comparison Chart ───
  function createComparisonChart(canvasId, current, previous) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    if (charts.comparison) {
      charts.comparison.destroy();
    }

    const labels = ['NDVI', 'NDWI', 'EVI', 'NDMI'];
    const currentValues = [current.ndvi, current.ndwi, current.evi, current.ndmi];
    const previousValues = [previous.ndvi, previous.ndwi, previous.evi, previous.ndmi];

    charts.comparison = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current',
            data: currentValues,
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: '#22c55e',
            borderWidth: 1
          },
          {
            label: 'Previous',
            data: previousValues,
            backgroundColor: 'rgba(148, 163, 184, 0.5)',
            borderColor: '#94a3b8',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#cbd5e1' }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            min: 0,
            max: 1
          }
        }
      }
    });

    return charts.comparison;
  }

  // ─── Cleanup ───
  function destroyAllCharts() {
    Object.keys(charts).forEach(key => {
      if (charts[key]) {
        charts[key].destroy();
      }
    });
    charts = {};
  }

  // ─── Public API ───
  return {
    createHealthChart,
    createTimeSeriesChart,
    createZoneChart,
    createRadarChart,
    createTrendChart,
    createComparisonChart,
    destroyAllCharts,
    getChart: (name) => charts[name]
  };
})();

if (typeof window !== 'undefined') {
  window.FH_CHARTS = FH_CHARTS;
}

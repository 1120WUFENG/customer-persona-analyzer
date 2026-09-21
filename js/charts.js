/**
 * 图表渲染模块 v2
 * 支持 15 种图表类型
 */

class ChartRenderer {
  constructor() {
    this.charts = {};
    this.colors = [
      '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff',
      '#fd79a8', '#a29bfe', '#55efc4', '#fab1a0', '#81ecec',
      '#ffeaa7', '#dfe6e9', '#636e72', '#b2bec3', '#2d3436'
    ];
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#8b8fa3', font: { size: 12 }, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#1a1d27',
          titleColor: '#e4e6f0',
          bodyColor: '#e4e6f0',
          borderColor: '#2d3148',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12
        }
      }
    };
  }

  destroyAll() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }

  renderClusterChart(canvasId, clusters) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: clusters.map(c => `${c.emoji} ${c.label}`),
        datasets: [{
          data: clusters.map(c => c.members.length),
          backgroundColor: clusters.map(c => c.color),
          borderWidth: 2, borderColor: '#1a1d27'
        }]
      },
      options: {
        ...this.defaultOptions,
        cutout: '60%',
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } }
        }
      }
    });
  }

  renderBarChart(canvasId, data, label = '人数', horizontal = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label, data: data.values,
          backgroundColor: this.colors.slice(0, data.labels.length),
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        ...this.defaultOptions,
        indexAxis: horizontal ? 'y' : 'x',
        scales: {
          x: { grid: { color: 'rgba(45,49,72,0.5)' }, ticks: { color: '#8b8fa3' } },
          y: { grid: { color: 'rgba(45,49,72,0.5)' }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }

  renderPieChart(canvasId, data, customColors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: customColors || this.colors.slice(0, data.labels.length),
          borderWidth: 2, borderColor: '#1a1d27'
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } }
        }
      }
    });
  }

  renderRadarChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '偏好度', data: data.values,
          backgroundColor: 'rgba(108,92,231,0.2)',
          borderColor: '#6c5ce7',
          pointBackgroundColor: '#6c5ce7',
          pointBorderColor: '#1a1d27',
          pointBorderWidth: 2
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          r: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            angleLines: { color: 'rgba(45,49,72,0.5)' },
            pointLabels: { color: '#8b8fa3', font: { size: 11 } },
            ticks: { display: false }
          }
        }
      }
    });
  }

  renderGaugeChart(canvasId, value, max, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    const pct = (value / max) * 100;
    const color = pct > 70 ? '#e17055' : pct > 40 ? '#fdcb6e' : '#00b894';

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [value, max - value],
          backgroundColor: [color, 'rgba(45,49,72,0.3)'],
          borderWidth: 0
        }]
      },
      options: {
        ...this.defaultOptions,
        cutout: '75%',
        rotation: -90,
        circumference: 180,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  renderAll(results) {
    this.destroyAll();

    // 核心图表
    if (results.clusters.length > 0) this.renderClusterChart('clusterChart', results.clusters);
    if (results.distributions.rfm) this.renderPieChart('rfmChart', results.distributions.rfm);
    if (results.distributions.age) this.renderBarChart('ageChart', results.distributions.age);
    if (results.distributions.region) this.renderBarChart('regionChart', results.distributions.region, '人数', true);
    if (results.distributions.consumption) this.renderBarChart('consumptionChart', results.distributions.consumption);
    if (results.distributions.frequency) this.renderPieChart('frequencyChart', results.distributions.frequency, ['#e17055', '#fdcb6e', '#00b894']);
    if (results.distributions.preference) this.renderRadarChart('preferenceChart', results.distributions.preference);
    if (results.distributions.channel) this.renderPieChart('channelChart', results.distributions.channel);

    // 新增图表
    if (results.distributions.clv) this.renderBarChart('clvChart', results.distributions.clv, '客户数');
    if (results.distributions.churn) this.renderBarChart('churnChart', results.distributions.churn, '客户数');
    if (results.distributions.aov) this.renderBarChart('aovChart', results.distributions.aov, '客户数');
    if (results.distributions.returnRate) this.renderBarChart('returnRateChart', results.distributions.returnRate, '客户数');
    if (results.distributions.score) this.renderBarChart('scoreChart', results.distributions.score, '客户数');
    if (results.distributions.loyalty) this.renderPieChart('loyaltyChart', results.distributions.loyalty);
    if (results.distributions.trend) this.renderPieChart('trendChart', results.distributions.trend, ['#00b894', '#e17055', '#74b9ff', '#fdcb6e']);
  }
}

window.ChartRenderer = ChartRenderer;

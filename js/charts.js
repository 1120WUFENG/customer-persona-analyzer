/**
 * 图表渲染模块 - 信用卡客户画像专用
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
        legend: { labels: { color: '#8b8fa3', font: { size: 12 }, padding: 16 } },
        tooltip: {
          backgroundColor: '#1a1d27', titleColor: '#e4e6f0', bodyColor: '#e4e6f0',
          borderColor: '#2d3148', borderWidth: 1, cornerRadius: 8, padding: 12
        }
      }
    };
  }

  destroyAll() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }

  _bar(canvasId, data, label = '人数', horizontal = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{ label, data: data.values, backgroundColor: this.colors.slice(0, data.labels.length), borderRadius: 6, borderSkipped: false }]
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

  _pie(canvasId, data, customColors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    this.charts[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{ data: data.values, backgroundColor: customColors || this.colors.slice(0, data.labels.length), borderWidth: 2, borderColor: '#1a1d27' }]
      },
      options: {
        ...this.defaultOptions,
        plugins: { ...this.defaultOptions.plugins, legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } } }
      }
    });
  }

  _doughnut(canvasId, data, customColors) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{ data: data.values, backgroundColor: customColors || this.colors.slice(0, data.labels.length), borderWidth: 2, borderColor: '#1a1d27' }]
      },
      options: {
        ...this.defaultOptions, cutout: '60%',
        plugins: { ...this.defaultOptions.plugins, legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } } }
      }
    });
  }

  _radar(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (this.charts[canvasId]) this.charts[canvasId].destroy();
    this.charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [{ label: '评分', data: data.values, backgroundColor: 'rgba(108,92,231,0.2)', borderColor: '#6c5ce7', pointBackgroundColor: '#6c5ce7', pointBorderColor: '#1a1d27', pointBorderWidth: 2 }]
      },
      options: {
        ...this.defaultOptions,
        scales: { r: { grid: { color: 'rgba(45,49,72,0.5)' }, angleLines: { color: 'rgba(45,49,72,0.5)' }, pointLabels: { color: '#8b8fa3', font: { size: 11 } }, ticks: { display: false } } }
      }
    });
  }

  renderAll(results) {
    this.destroyAll();

    // 核心图表
    if (results.clusters.length > 0) this._doughnut('clusterChart', results.clusters.map(c => ({ labels: [`${c.emoji} ${c.label}`], values: [c.members.length] })).reduce((acc, c) => { return { labels: [...acc.labels, ...c.labels], values: [...acc.values, ...c.values] }; }, { labels: [], values: [] }), results.clusters.map(c => c.color));

    // 简化 clusterChart 渲染
    if (results.clusters.length > 0) {
      const ctx = document.getElementById('clusterChart');
      if (ctx) {
        if (this.charts['clusterChart']) this.charts['clusterChart'].destroy();
        this.charts['clusterChart'] = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: results.clusters.map(c => `${c.emoji} ${c.label}`),
            datasets: [{ data: results.clusters.map(c => c.members.length), backgroundColor: results.clusters.map(c => c.color), borderWidth: 2, borderColor: '#1a1d27' }]
          },
          options: { ...this.defaultOptions, cutout: '60%', plugins: { ...this.defaultOptions.plugins, legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } } } }
        });
      }
    }

    if (results.distributions.riskLevel) this._pie('riskLevelChart', results.distributions.riskLevel, ['#00b894', '#fdcb6e', '#e17055', '#ff6b6b']);
    if (results.distributions.age) this._bar('ageChart', results.distributions.age);
    if (results.distributions.region) this._bar('regionChart', results.distributions.region, '人数', true);
    if (results.distributions.creditLimit) this._bar('creditLimitChart', results.distributions.creditLimit);
    if (results.distributions.overdue) this._bar('overdueChart', results.distributions.overdue);
    if (results.distributions.overdueAmount) this._bar('overdueAmountChart', results.distributions.overdueAmount);
    if (results.distributions.repayment) this._pie('repaymentChart', results.distributions.repayment, ['#00b894', '#fdcb6e', '#e17055', '#ff6b6b']);
    if (results.distributions.repayAbility) this._bar('repayAbilityChart', results.distributions.repayAbility, '客户数');
    if (results.distributions.repayWilling) this._bar('repayWillingChart', results.distributions.repayWilling, '客户数');
    if (results.distributions.cashOut) this._pie('cashOutChart', results.distributions.cashOut, ['#00b894', '#e17055']);
    if (results.distributions.complaint) this._pie('complaintChart', results.distributions.complaint, ['#00b894', '#e17055']);
    if (results.distributions.phoneStatus) this._pie('phoneStatusChart', results.distributions.phoneStatus);
    if (results.distributions.mortgage) this._pie('mortgageChart', results.distributions.mortgage, ['#00b894', '#74b9ff']);
    if (results.distributions.cardOrg) this._bar('cardOrgChart', results.distributions.cardOrg, '人数', true);
    if (results.distributions.cardAge) this._bar('cardAgeChart', results.distributions.cardAge);
    if (results.distributions.consumption) this._pie('consumptionChart', results.distributions.consumption, ['#00b894', '#74b9ff', '#fdcb6e', '#e17055']);
  }
}

window.ChartRenderer = ChartRenderer;

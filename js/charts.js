/**
 * 图表渲染 - 催收回款专用
 */
class ChartRenderer {
  constructor() {
    this.charts = {};
    this.colors = ['#6c5ce7','#00b894','#fdcb6e','#e17055','#74b9ff','#fd79a8','#a29bfe','#55efc4','#fab1a0','#81ecec','#ffeaa7','#dfe6e9'];
    this.defaultOptions = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8b8fa3', font: { size: 12 }, padding: 16 } }, tooltip: { backgroundColor: '#1a1d27', titleColor: '#e4e6f0', bodyColor: '#e4e6f0', borderColor: '#2d3148', borderWidth: 1, cornerRadius: 8, padding: 12 } }
    };
  }
  destroyAll() { Object.values(this.charts).forEach(c => c.destroy()); this.charts = {}; }

  _bar(id, data, label='人数') {
    const ctx = document.getElementById(id); if (!ctx) return;
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, { type: 'bar', data: { labels: data.labels, datasets: [{ label, data: data.values, backgroundColor: this.colors.slice(0, data.labels.length), borderRadius: 6, borderSkipped: false }] }, options: { ...this.defaultOptions, scales: { x: { grid: { color: 'rgba(45,49,72,0.5)' }, ticks: { color: '#8b8fa3' } }, y: { grid: { color: 'rgba(45,49,72,0.5)' }, ticks: { color: '#8b8fa3' } } } } });
  }

  _doughnut(id, data, customColors) {
    const ctx = document.getElementById(id); if (!ctx) return;
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, { type: 'doughnut', data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: customColors || this.colors.slice(0, data.labels.length), borderWidth: 2, borderColor: '#1a1d27' }] }, options: { ...this.defaultOptions, cutout: '60%', plugins: { ...this.defaultOptions.plugins, legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } } } } });
  }

  _pie(id, data, customColors) {
    const ctx = document.getElementById(id); if (!ctx) return;
    if (this.charts[id]) this.charts[id].destroy();
    this.charts[id] = new Chart(ctx, { type: 'pie', data: { labels: data.labels, datasets: [{ data: data.values, backgroundColor: customColors || this.colors.slice(0, data.labels.length), borderWidth: 2, borderColor: '#1a1d27' }] }, options: { ...this.defaultOptions, plugins: { ...this.defaultOptions.plugins, legend: { position: 'bottom', labels: { ...this.defaultOptions.plugins.legend.labels, usePointStyle: true } } } } });
  }

  renderAll(results) {
    this.destroyAll();
    if (results.clusters.length > 0) {
      this._doughnut('clusterChart',
        { labels: results.clusters.map(c => `${c.emoji} ${c.label}`), values: results.clusters.map(c => c.members.length) },
        results.clusters.map(c => c.color)
      );
    }

    // 回款率分布
    const recoveryBuckets = { '0-20%': 0, '20-40%': 0, '40-60%': 0, '60-80%': 0, '80%+': 0 };
    analyzer.processedData.forEach(d => {
      if (d.recoveryRate < 20) recoveryBuckets['0-20%']++;
      else if (d.recoveryRate < 40) recoveryBuckets['20-40%']++;
      else if (d.recoveryRate < 60) recoveryBuckets['40-60%']++;
      else if (d.recoveryRate < 80) recoveryBuckets['60-80%']++;
      else recoveryBuckets['80%+']++;
    });
    this._bar('recoveryChart', { labels: Object.keys(recoveryBuckets), values: Object.values(recoveryBuckets) }, '客户数');

    // 法诉适配度
    const courtBuckets = { '低(0-30)': 0, '中低(30-50)': 0, '中(50-70)': 0, '高(70+)': 0 };
    analyzer.processedData.forEach(d => {
      if (d.courtSuitability < 30) courtBuckets['低(0-30)']++;
      else if (d.courtSuitability < 50) courtBuckets['中低(30-50)']++;
      else if (d.courtSuitability < 70) courtBuckets['中(50-70)']++;
      else courtBuckets['高(70+)']++;
    });
    this._bar('courtChart', { labels: Object.keys(courtBuckets), values: Object.values(courtBuckets) }, '客户数');

    // 联系状态
    const phoneData = {};
    analyzer.processedData.forEach(d => { phoneData[d.phoneStatus] = (phoneData[d.phoneStatus] || 0) + 1; });
    this._pie('phoneChart', { labels: Object.keys(phoneData), values: Object.values(phoneData) });

    // 逾期月数
    const overdueBuckets = { '1-2月': 0, '2-3月': 0, '3-4月': 0, '4-6月': 0, '6月+': 0 };
    analyzer.processedData.forEach(d => {
      if (d.overdueMonths < 2) overdueBuckets['1-2月']++;
      else if (d.overdueMonths < 3) overdueBuckets['2-3月']++;
      else if (d.overdueMonths < 4) overdueBuckets['3-4月']++;
      else if (d.overdueMonths < 6) overdueBuckets['4-6月']++;
      else overdueBuckets['6月+']++;
    });
    this._bar('overdueChart', { labels: Object.keys(overdueBuckets), values: Object.values(overdueBuckets) }, '客户数');

    // 逾期金额
    const amountBuckets = { '0-5K': 0, '5K-2W': 0, '2W-5W': 0, '5W-10W': 0, '10W+': 0 };
    analyzer.processedData.forEach(d => {
      if (d.overdueAmount < 5000) amountBuckets['0-5K']++;
      else if (d.overdueAmount < 20000) amountBuckets['5K-2W']++;
      else if (d.overdueAmount < 50000) amountBuckets['2W-5W']++;
      else if (d.overdueAmount < 100000) amountBuckets['5W-10W']++;
      else amountBuckets['10W+']++;
    });
    this._bar('amountChart', { labels: Object.keys(amountBuckets), values: Object.values(amountBuckets) }, '客户数');
  }
}

window.ChartRenderer = ChartRenderer;

/**
 * 图表渲染模块
 * 使用 Chart.js 绘制各种可视化图表
 */

class ChartRenderer {
  constructor() {
    this.charts = {};
    this.colors = [
      '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff',
      '#fd79a8', '#a29bfe', '#55efc4', '#fab1a0', '#81ecec',
      '#ffeaa7', '#dfe6e9'
    ];
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8b8fa3',
            font: { size: 12 },
            padding: 16
          }
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

  /**
   * 销毁所有图表
   */
  destroyAll() {
    Object.values(this.charts).forEach(chart => chart.destroy());
    this.charts = {};
  }

  /**
   * 渲染客户分群饼图
   */
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
          borderWidth: 2,
          borderColor: '#1a1d27'
        }]
      },
      options: {
        ...this.defaultOptions,
        cutout: '60%',
        plugins: {
          ...this.defaultOptions.plugins,
          legend: {
            position: 'bottom',
            labels: {
              ...this.defaultOptions.plugins.legend.labels,
              usePointStyle: true,
              pointStyleWidth: 12
            }
          }
        }
      }
    });
  }

  /**
   * 渲染年龄分布柱状图
   */
  renderAgeChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '人数',
          data: data.values,
          backgroundColor: this.colors.slice(0, data.labels.length),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          x: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            ticks: { color: '#8b8fa3' }
          },
          y: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            ticks: { color: '#8b8fa3' }
          }
        }
      }
    });
  }

  /**
   * 渲染地域分布柱状图（水平）
   */
  renderRegionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    // 取前8个地区
    const topN = 8;
    const labels = data.labels.slice(0, topN);
    const values = data.values.slice(0, topN);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: '人数',
          data: values,
          backgroundColor: this.generateGradient(ctx, labels.length),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.defaultOptions,
        indexAxis: 'y',
        scales: {
          x: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            ticks: { color: '#8b8fa3' }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#8b8fa3' }
          }
        }
      }
    });
  }

  /**
   * 渲染消费水平分布
   */
  renderConsumptionChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '人数',
          data: data.values,
          backgroundColor: [
            'rgba(108,92,231,0.8)',
            'rgba(116,185,255,0.8)',
            'rgba(0,184,148,0.8)',
            'rgba(253,203,110,0.8)',
            'rgba(225,112,85,0.8)'
          ],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        ...this.defaultOptions,
        scales: {
          x: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            ticks: { color: '#8b8fa3' }
          },
          y: {
            grid: { color: 'rgba(45,49,72,0.5)' },
            ticks: { color: '#8b8fa3' }
          }
        }
      }
    });
  }

  /**
   * 渲染活跃频率
   */
  renderFrequencyChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: ['#e17055', '#fdcb6e', '#00b894'],
          borderWidth: 2,
          borderColor: '#1a1d27'
        }]
      },
      options: {
        ...this.defaultOptions,
        plugins: {
          ...this.defaultOptions.plugins,
          legend: {
            position: 'bottom',
            labels: {
              ...this.defaultOptions.plugins.legend.labels,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  /**
   * 渲染偏好标签雷达图
   */
  renderPreferenceChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (this.charts[canvasId]) this.charts[canvasId].destroy();

    this.charts[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.labels,
        datasets: [{
          label: '偏好度',
          data: data.values,
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

  /**
   * 生成渐变色
   */
  generateGradient(ctx, count) {
    return this.colors.slice(0, count);
  }

  /**
   * 渲染所有图表
   */
  renderAll(results) {
    this.destroyAll();

    if (results.clusters.length > 0) {
      this.renderClusterChart('clusterChart', results.clusters);
    }

    if (results.distributions.age) {
      this.renderAgeChart('ageChart', results.distributions.age);
    }

    if (results.distributions.region) {
      this.renderRegionChart('regionChart', results.distributions.region);
    }

    if (results.distributions.consumption) {
      this.renderConsumptionChart('consumptionChart', results.distributions.consumption);
    }

    if (results.distributions.frequency) {
      this.renderFrequencyChart('frequencyChart', results.distributions.frequency);
    }

    if (results.distributions.preference) {
      this.renderPreferenceChart('preferenceChart', results.distributions.preference);
    }
  }
}

// 导出
window.ChartRenderer = ChartRenderer;

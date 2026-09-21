/**
 * 应用主逻辑 v2
 */

(function() {
  'use strict';

  const analyzer = new CustomerAnalyzer();
  const chartRenderer = new ChartRenderer();

  const els = {
    btnImport: document.getElementById('btnImport'),
    btnExport: document.getElementById('btnExport'),
    btnSample: document.getElementById('btnSample'),
    btnAnalyze: document.getElementById('btnAnalyze'),
    btnClear: document.getElementById('btnClear'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    dataPreview: document.getElementById('dataPreview'),
    previewTable: document.getElementById('previewTable'),
    dataStats: document.getElementById('dataStats'),
    analysisPanel: document.getElementById('analysisPanel'),
    results: document.getElementById('results'),
    overviewCards: document.getElementById('overviewCards'),
    personaCards: document.getElementById('personaCards'),
    resultTable: document.getElementById('resultTable'),
    clusterCount: document.getElementById('clusterCount'),
    clusterLabel: document.getElementById('clusterLabel'),
    insights: document.getElementById('insights')
  };

  // 事件绑定
  els.btnImport.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);

  els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.classList.add('drag-over'); });
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag-over'));
  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  });
  els.dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'LABEL') els.fileInput.click(); });

  els.btnSample.addEventListener('click', loadSampleData);
  els.btnAnalyze.addEventListener('click', runAnalysis);
  els.btnExport.addEventListener('click', () => { if (window.lastResults) analyzer.exportReport(window.lastResults); });
  els.btnClear.addEventListener('click', clearData);
  els.clusterCount.addEventListener('input', (e) => { els.clusterLabel.textContent = `${e.target.value} 类`; });

  // 文件处理
  function handleFileSelect(e) { if (e.target.files[0]) processFile(e.target.files[0]); }

  async function processFile(file) {
    try {
      let data;
      if (file.name.endsWith('.csv')) data = await analyzer.parseCSV(file);
      else if (file.name.endsWith('.json')) data = await analyzer.parseJSON(file);
      else { alert('请上传 CSV 或 JSON 文件'); return; }
      showDataPreview(data);
      showAnalysisPanel();
    } catch (err) { alert('文件解析失败: ' + err.message); }
  }

  function showDataPreview(data) {
    els.dataPreview.style.display = 'block';
    els.dataStats.textContent = `📊 ${data.length} 条记录 | ${Object.keys(data[0]).length} 个字段`;

    const fields = Object.keys(data[0]);
    els.previewTable.querySelector('thead').innerHTML = `<tr>${fields.map(f => `<th>${f}</th>`).join('')}</tr>`;
    const previewRows = data.slice(0, 10);
    els.previewTable.querySelector('tbody').innerHTML = previewRows.map(row =>
      `<tr>${fields.map(f => `<td>${row[f] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    if (data.length > 10) {
      els.previewTable.querySelector('tbody').innerHTML +=
        `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 10} 条记录</td></tr>`;
    }
  }

  function showAnalysisPanel() {
    els.analysisPanel.style.display = 'block';
    els.analysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadSampleData() {
    const data = analyzer.loadSampleData();
    showDataPreview(data);
    showAnalysisPanel();
    setTimeout(runAnalysis, 300);
  }

  function runAnalysis() {
    const dimensions = [];
    document.querySelectorAll('#dimensions input:checked').forEach(cb => dimensions.push(cb.value));
    if (dimensions.length === 0) { alert('请至少选择一个分析维度'); return; }

    const clusterCount = parseInt(els.clusterCount.value);
    const results = analyzer.analyze(dimensions, clusterCount);
    window.lastResults = results;
    renderResults(results);
  }

  function renderResults(results) {
    els.results.style.display = 'block';
    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderInsights(results.insights);
    renderOverviewCards(results.overview);
    chartRenderer.renderAll(results);
    renderPersonaCards(results.clusters);
    renderResultTable(results);
  }

  // 智能洞察
  function renderInsights(insights) {
    if (!insights || insights.length === 0) return;
    const typeColors = { danger: '#e17055', warning: '#fdcb6e', success: '#00b894', info: '#74b9ff' };
    els.insights.innerHTML = insights.map(i => `
      <div class="insight-card" style="border-left: 4px solid ${typeColors[i.type] || '#74b9ff'}">
        <span class="insight-icon">${i.icon}</span>
        <div>
          <strong>${i.title}</strong>
          <p>${i.text}</p>
        </div>
      </div>
    `).join('');
  }

  // 概览卡片
  function renderOverviewCards(overview) {
    const cards = [
      { icon: '👥', value: overview.totalCustomers, label: '总客户数' },
      { icon: '📊', value: overview.avgAge, label: '平均年龄' },
      { icon: '💰', value: `¥${Number(overview.avgConsumption).toLocaleString()}`, label: '平均消费' },
      { icon: '💎', value: `¥${Number(overview.avgCLV).toLocaleString()}`, label: '平均 CLV' },
      { icon: '⚠️', value: `${overview.avgChurnRisk}%`, label: '平均流失风险' },
      { icon: '🔄', value: `${overview.avgRepurchaseRate}%`, label: '平均复购率' },
      { icon: '🛒', value: `¥${Number(overview.avgAOV).toLocaleString()}`, label: '平均客单价' },
      { icon: '📦', value: `${overview.avgReturnRate}%`, label: '平均退货率' },
      { icon: '👑', value: overview.highValueCount, label: '高价值客户' },
      { icon: '🚨', value: overview.atRiskCount, label: '高流失风险' },
      { icon: '🌱', value: overview.newCustomerCount, label: '新客户 (<90天)' },
      { icon: '🤝', value: overview.loyalCount, label: '高忠诚度客户' }
    ];

    els.overviewCards.innerHTML = cards.map(card => `
      <div class="overview-card">
        <div class="icon">${card.icon}</div>
        <div class="value">${card.value}</div>
        <div class="label">${card.label}</div>
      </div>
    `).join('');
  }

  // 画像卡
  function renderPersonaCards(clusters) {
    els.personaCards.innerHTML = clusters.map(cluster => `
      <div class="persona-card">
        <div class="persona-header">
          <div class="persona-avatar">${cluster.emoji}</div>
          <div>
            <div class="persona-name">${cluster.label}</div>
            <div class="persona-desc">${cluster.description}</div>
          </div>
        </div>

        <div class="persona-stats">
          <div class="stat-item"><div class="stat-label">占比</div><div class="stat-value">${cluster.percentage}%</div></div>
          <div class="stat-item"><div class="stat-label">人数</div><div class="stat-value">${cluster.members.length}</div></div>
          <div class="stat-item"><div class="stat-label">平均年龄</div><div class="stat-value">${cluster.avgAge}岁</div></div>
          <div class="stat-item"><div class="stat-label">平均消费</div><div class="stat-value">¥${Number(cluster.avgConsumption).toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">客单价</div><div class="stat-value">¥${Number(cluster.avgAOV).toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">订单数</div><div class="stat-value">${cluster.avgOrderCount}</div></div>
          <div class="stat-item"><div class="stat-label">CLV</div><div class="stat-value">¥${Number(cluster.avgCLV).toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">流失风险</div><div class="stat-value ${parseFloat(cluster.avgChurnRisk) > 50 ? 'danger' : ''}">${cluster.avgChurnRisk}%</div></div>
          <div class="stat-item"><div class="stat-label">复购率</div><div class="stat-value">${cluster.avgRepurchaseRate}%</div></div>
          <div class="stat-item"><div class="stat-label">退货率</div><div class="stat-value">${cluster.avgReturnRate}%</div></div>
          <div class="stat-item"><div class="stat-label">最近活跃</div><div class="stat-value">${cluster.avgDaysSinceActive}天前</div></div>
          <div class="stat-item"><div class="stat-label">性别比</div><div class="stat-value">${cluster.genderRatio.male}:${cluster.genderRatio.female}</div></div>
        </div>

        <div class="persona-tags">
          ${cluster.topRegions.map(r => `<span class="tag">📍 ${r.name}</span>`).join('')}
          ${cluster.topPreferences.map(p => `<span class="tag">🏷️ ${p.name}</span>`).join('')}
          ${cluster.topChannels.map(ch => `<span class="tag">📱 ${ch.name}</span>`).join('')}
        </div>

        <div class="persona-strategy">
          <div class="strategy-title">💡 运营策略</div>
          <ul>${cluster.strategy.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    `).join('');
  }

  // 数据表
  function renderResultTable(results) {
    const data = analyzer.processedData;
    if (data.length === 0) return;

    const fields = ['id', 'name', 'age', 'gender', 'region', 'consumption', 'orderCount', 'avgOrderValue', 'clv', 'churnRisk', 'rfmSegment', 'loyaltyLevel', 'consumptionTrend', 'preference'];
    const fieldNames = {
      id: 'ID', name: '姓名', age: '年龄', gender: '性别', region: '地区',
      consumption: '消费金额', orderCount: '订单数', avgOrderValue: '客单价',
      clv: 'CLV', churnRisk: '流失风险', rfmSegment: 'RFM分群',
      loyaltyLevel: '忠诚度', consumptionTrend: '消费趋势', preference: '偏好'
    };

    els.resultTable.querySelector('thead').innerHTML = `<tr>${fields.map(f => `<th>${fieldNames[f]}</th>`).join('')}</tr>`;

    const rows = data.slice(0, 50);
    els.resultTable.querySelector('tbody').innerHTML = rows.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.age}</td>
        <td>${row.gender}</td>
        <td>${row.region}</td>
        <td>¥${row.consumption.toLocaleString()}</td>
        <td>${row.orderCount}</td>
        <td>¥${row.avgOrderValue.toLocaleString()}</td>
        <td>¥${row.clv.toLocaleString()}</td>
        <td><span class="${row.churnRisk > 60 ? 'badge danger' : row.churnRisk > 30 ? 'badge warning' : 'badge success'}">${row.churnRisk}%</span></td>
        <td>${row.rfmSegment}</td>
        <td>${row.loyaltyLevel}</td>
        <td>${row.consumptionTrend}</td>
        <td>${row.preference}</td>
      </tr>
    `).join('');

    if (data.length > 50) {
      els.resultTable.querySelector('tbody').innerHTML +=
        `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 50} 条记录</td></tr>`;
    }
  }

  function clearData() {
    analyzer.rawData = []; analyzer.processedData = []; analyzer.clusters = []; analyzer.fieldMapping = {};
    els.dataPreview.style.display = 'none'; els.analysisPanel.style.display = 'none'; els.results.style.display = 'none';
    els.fileInput.value = '';
    chartRenderer.destroyAll();
  }

  console.log('🚀 客户画像深度分析平台 v2 已就绪');
})();

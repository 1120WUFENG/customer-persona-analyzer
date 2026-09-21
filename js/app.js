/**
 * 信用卡客户画像分析 - 应用主逻辑
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

  els.btnImport.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', handleFileSelect);
  els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); els.dropZone.classList.add('drag-over'); });
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag-over'));
  els.dropZone.addEventListener('drop', (e) => { e.preventDefault(); els.dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]); });
  els.dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'LABEL') els.fileInput.click(); });
  els.btnSample.addEventListener('click', loadSampleData);
  els.btnAnalyze.addEventListener('click', runAnalysis);
  els.btnExport.addEventListener('click', () => { if (window.lastResults) analyzer.exportReport(window.lastResults); });
  els.btnClear.addEventListener('click', clearData);
  els.clusterCount.addEventListener('input', (e) => { els.clusterLabel.textContent = `${e.target.value} 类`; });

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
    els.previewTable.querySelector('tbody').innerHTML = data.slice(0, 10).map(row =>
      `<tr>${fields.map(f => `<td>${row[f] ?? ''}</td>`).join('')}</tr>`
    ).join('') + (data.length > 10 ? `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 10} 条记录</td></tr>` : '');
  }

  function showAnalysisPanel() { els.analysisPanel.style.display = 'block'; els.analysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  function loadSampleData() { showDataPreview(analyzer.loadSampleData()); showAnalysisPanel(); setTimeout(runAnalysis, 300); }

  function runAnalysis() {
    const dimensions = [];
    document.querySelectorAll('#dimensions input:checked').forEach(cb => dimensions.push(cb.value));
    if (dimensions.length === 0) { alert('请至少选择一个分析维度'); return; }
    window.lastResults = analyzer.analyze(dimensions, parseInt(els.clusterCount.value));
    renderResults(window.lastResults);
  }

  function renderResults(results) {
    els.results.style.display = 'block';
    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderInsights(results.insights);
    renderOverviewCards(results.overview);
    chartRenderer.renderAll(results);
    renderPersonaCards(results.clusters);
    renderResultTable();
  }

  function renderInsights(insights) {
    if (!insights || insights.length === 0) return;
    const typeColors = { danger: '#e17055', warning: '#fdcb6e', success: '#00b894', info: '#74b9ff' };
    els.insights.innerHTML = insights.map(i => `
      <div class="insight-card" style="border-left: 4px solid ${typeColors[i.type] || '#74b9ff'}">
        <span class="insight-icon">${i.icon}</span>
        <div><strong>${i.title}</strong><p>${i.text}</p></div>
      </div>
    `).join('');
  }

  function renderOverviewCards(o) {
    const cards = [
      { icon: '👥', value: o.total, label: '总客户数' },
      { icon: '📊', value: o.avgAge + '岁', label: '平均年龄' },
      { icon: '💳', value: '¥' + Number(o.avgCreditLimit).toLocaleString(), label: '平均额度' },
      { icon: '⚠️', value: o.overdueCount + '人', label: `逾期客户 (${o.overdueRate}%)` },
      { icon: '⏰', value: o.avgOverdueDays + '天', label: '平均逾期天数' },
      { icon: '💰', value: '¥' + Number(o.avgOverdueAmount).toLocaleString(), label: '平均逾期金额' },
      { icon: '🔴', value: o.highRiskCount + '人', label: '高风险客户' },
      { icon: '🔍', value: o.cashOutCount + '人', label: `套现嫌疑 (${o.cashOutRate}%)` },
      { icon: '📢', value: o.complaintCount + '人', label: `投诉客户 (${o.complaintRate}%)` },
      { icon: '🏠', value: o.mortgageCount + '人', label: '有房贷客户' },
      { icon: '💪', value: o.avgRepayAbility, label: '平均还款能力' },
      { icon: '🤝', value: o.avgRepayWilling, label: '平均还款意愿' }
    ];
    els.overviewCards.innerHTML = cards.map(c => `
      <div class="overview-card"><div class="icon">${c.icon}</div><div class="value">${c.value}</div><div class="label">${c.label}</div></div>
    `).join('');
  }

  function renderPersonaCards(clusters) {
    els.personaCards.innerHTML = clusters.map(c => `
      <div class="persona-card">
        <div class="persona-header">
          <div class="persona-avatar">${c.emoji}</div>
          <div>
            <div class="persona-name">${c.label} <span class="pct-badge">${c.percentage}%</span></div>
            <div class="persona-desc">${c.description}</div>
          </div>
        </div>

        ${c.urgentActions.length > 0 ? `
        <div class="urgent-actions">
          ${c.urgentActions.map(a => `<div class="urgent-item">${a}</div>`).join('')}
        </div>` : ''}

        <div class="persona-stats">
          <div class="stat-item"><div class="stat-label">人数</div><div class="stat-value">${c.members.length}</div></div>
          <div class="stat-item"><div class="stat-label">平均年龄</div><div class="stat-value">${c.avgAge}岁</div></div>
          <div class="stat-item"><div class="stat-label">平均额度</div><div class="stat-value">¥${Number(c.avgCreditLimit).toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">风险评分</div><div class="stat-value ${parseFloat(c.avgRiskScore) >= 50 ? 'danger' : ''}">${c.avgRiskScore}</div></div>
          <div class="stat-item"><div class="stat-label">还款能力</div><div class="stat-value">${c.avgRepayAbility}</div></div>
          <div class="stat-item"><div class="stat-label">还款意愿</div><div class="stat-value">${c.avgRepayWilling}</div></div>
          <div class="stat-item"><div class="stat-label">逾期率</div><div class="stat-value ${parseFloat(c.overdueRate) > 50 ? 'danger' : ''}">${c.overdueRate}%</div></div>
          <div class="stat-item"><div class="stat-label">套现率</div><div class="stat-value ${parseFloat(c.cashOutRate) > 20 ? 'danger' : ''}">${c.cashOutRate}%</div></div>
          <div class="stat-item"><div class="stat-label">投诉率</div><div class="stat-value">${c.complaintRate}%</div></div>
          <div class="stat-item"><div class="stat-label">房贷占比</div><div class="stat-value">${c.mortgageRate}%</div></div>
          <div class="stat-item"><div class="stat-label">平均逾期天数</div><div class="stat-value">${c.avgOverdueDays}天</div></div>
          <div class="stat-item"><div class="stat-label">平均还款金额</div><div class="stat-value">¥${Number(c.avgRepaymentAmount).toLocaleString()}</div></div>
        </div>

        <div class="persona-tags">
          ${c.topOrgs.map(r => `<span class="tag">🏦 ${r.name}</span>`).join('')}
          ${c.topRegions.map(r => `<span class="tag">📍 ${r.name}</span>`).join('')}
          ${c.topRepayment.map(r => `<span class="tag">📋 ${r.name}</span>`).join('')}
        </div>

        <div class="persona-strategy">
          <div class="strategy-title">💡 运营策略</div>
          <ul>${c.strategy.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    `).join('');
  }

  function renderResultTable() {
    const data = analyzer.processedData;
    if (data.length === 0) return;

    const fields = ['id', 'gender', 'age', 'cardOrg', 'creditLimit', 'overdueDays', 'overdueAmount', 'repaymentRecord', 'lastRepaymentAmount', 'hasCashOut', 'hasComplaint', 'riskScore', 'riskLevel', 'repayAbilityScore', 'repayWillingScore'];
    const fieldNames = {
      id: '客户编号', gender: '性别', age: '年龄', cardOrg: '办卡单位', creditLimit: '信用额度',
      overdueDays: '逾期天数', overdueAmount: '逾期金额', repaymentRecord: '还款记录',
      lastRepaymentAmount: '还款金额', hasCashOut: '套现', hasComplaint: '投诉',
      riskScore: '风险分', riskLevel: '风险等级', repayAbilityScore: '还款能力', repayWillingScore: '还款意愿'
    };

    els.resultTable.querySelector('thead').innerHTML = `<tr>${fields.map(f => `<th>${fieldNames[f]}</th>`).join('')}</tr>`;
    els.resultTable.querySelector('tbody').innerHTML = data.slice(0, 50).map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.gender}</td>
        <td>${row.age}</td>
        <td>${row.cardOrg}</td>
        <td>¥${row.creditLimit.toLocaleString()}</td>
        <td><span class="${row.overdueDays > 60 ? 'badge danger' : row.overdueDays > 0 ? 'badge warning' : 'badge success'}">${row.overdueDays}天</span></td>
        <td>¥${row.overdueAmount.toLocaleString()}</td>
        <td><span class="${row.repaymentRecord === '严重逾期' ? 'badge danger' : row.repaymentRecord === '正常' ? 'badge success' : 'badge warning'}">${row.repaymentRecord}</span></td>
        <td>¥${row.lastRepaymentAmount.toLocaleString()}</td>
        <td><span class="${row.hasCashOut === '是' ? 'badge danger' : 'badge success'}">${row.hasCashOut}</span></td>
        <td><span class="${row.hasComplaint === '是' ? 'badge warning' : 'badge success'}">${row.hasComplaint}</span></td>
        <td><span class="${row.riskScore >= 70 ? 'badge danger' : row.riskScore >= 40 ? 'badge warning' : 'badge success'}">${row.riskScore}</span></td>
        <td>${row.riskLevel}</td>
        <td>${row.repayAbilityScore}</td>
        <td>${row.repayWillingScore}</td>
      </tr>
    `).join('') + (data.length > 50 ? `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 50} 条</td></tr>` : '');
  }

  function clearData() {
    analyzer.rawData = []; analyzer.processedData = []; analyzer.clusters = []; analyzer.fieldMapping = {};
    els.dataPreview.style.display = 'none'; els.analysisPanel.style.display = 'none'; els.results.style.display = 'none';
    els.fileInput.value = ''; chartRenderer.destroyAll();
  }

  console.log('💳 信用卡客户画像分析平台已就绪');
})();

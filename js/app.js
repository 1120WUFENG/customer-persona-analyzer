/**
 * 催收回款分析 - 应用主逻辑
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
    toolCards: document.getElementById('toolCards'),
    courtScreening: document.getElementById('courtScreening'),
    priorityTable: document.getElementById('priorityTable'),
    personaCards: document.getElementById('personaCards'),
    clusterCount: document.getElementById('clusterCount'),
    clusterLabel: document.getElementById('clusterLabel'),
    insights: document.getElementById('insights')
  };

  els.btnImport.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });
  els.dropZone.addEventListener('dragover', e => { e.preventDefault(); els.dropZone.classList.add('drag-over'); });
  els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('drag-over'));
  els.dropZone.addEventListener('drop', e => { e.preventDefault(); els.dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]); });
  els.dropZone.addEventListener('click', e => { if (e.target.tagName !== 'LABEL') els.fileInput.click(); });
  els.btnSample.addEventListener('click', loadSampleData);
  els.btnAnalyze.addEventListener('click', runAnalysis);
  els.btnExport.addEventListener('click', () => { if (window.lastResults) analyzer.exportReport(window.lastResults); });
  els.btnClear.addEventListener('click', clearData);
  els.clusterCount.addEventListener('input', e => { els.clusterLabel.textContent = `${e.target.value} 类`; });

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
    ).join('') + (data.length > 10 ? `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 10} 条</td></tr>` : '');
  }

  function showAnalysisPanel() { els.analysisPanel.style.display = 'block'; els.analysisPanel.scrollIntoView({ behavior: 'smooth' }); }
  function loadSampleData() { showDataPreview(analyzer.loadSampleData()); showAnalysisPanel(); setTimeout(runAnalysis, 300); }

  function runAnalysis() {
    const clusterCount = parseInt(els.clusterCount.value);
    window.lastResults = analyzer.analyze(clusterCount);
    renderResults(window.lastResults);
  }

  function renderResults(results) {
    els.results.style.display = 'block';
    els.results.scrollIntoView({ behavior: 'smooth' });
    renderInsights(results.insights);
    renderOverview(results.overview);
    renderToolCards(results.collectionPlan);
    renderCourtScreening(results.courtScreening);
    renderPriorityTable(results.priorityQueue);
    chartRenderer.renderAll(results);
    renderPersonaCards(results.clusters);
  }

  function renderInsights(insights) {
    if (!insights || !insights.length) return;
    const colors = { danger: '#e17055', warning: '#fdcb6e', success: '#00b894', info: '#74b9ff' };
    els.insights.innerHTML = insights.map(i => `
      <div class="insight-card" style="border-left:4px solid ${colors[i.type]||'#74b9ff'}">
        <span class="insight-icon">${i.icon}</span>
        <div><strong>${i.title}</strong><p>${i.text}</p></div>
      </div>
    `).join('');
  }

  function renderOverview(o) {
    const cards = [
      { icon: '👥', value: o.total, label: '总客户数' },
      { icon: '💰', value: '¥' + o.totalOverdueAmount.toLocaleString(), label: '总逾期金额' },
      { icon: '📊', value: o.avgOverdueMonths + '月', label: '平均逾期月数' },
      { icon: '🎯', value: o.avgRecoveryRate + '%', label: '平均预估回款率' },
      { icon: '💵', value: '¥' + o.totalExpectedRecovery.toLocaleString(), label: '预估可回款' },
      { icon: '⚖️', value: o.courtEligible + '人', label: `符合法诉条件 (¥${o.courtEligibleAmount.toLocaleString()})` },
      { icon: '📵', value: o.unreachable + '人', label: '无法联系' },
      { icon: '😡', value: o.refused + '人', label: '拒绝沟通' },
      { icon: '🤝', value: o.promised + '人', label: '已承诺还款' },
      { icon: '🏠', value: o.hasMortgage + '人', label: '有房贷资产' },
      { icon: '📈', value: o.avgCollectionDifficulty, label: '平均催收难度' },
      { icon: '📊', value: '¥' + o.avgPrincipal.toLocaleString(), label: '平均本金' }
    ];
    els.overviewCards.innerHTML = cards.map(c => `
      <div class="overview-card"><div class="icon">${c.icon}</div><div class="value">${c.value}</div><div class="label">${c.label}</div></div>
    `).join('');
  }

  function renderToolCards(plan) {
    const tools = Object.entries(plan.byTool).map(([key, t]) => `
      <div class="tool-card">
        <div class="tool-icon">${t.icon}</div>
        <div class="tool-info">
          <div class="tool-name">${t.name}</div>
          <div class="tool-meta">
            <span>📊 ${t.count}人</span>
            <span>💰 ¥${t.totalAmount.toLocaleString()}</span>
            <span>🎯 回款率 ${t.avgRecoveryRate}%</span>
            <span>💵 预计回款 ¥${t.expectedRecovery.toLocaleString()}</span>
          </div>
          <div class="tool-desc">${t.description}</div>
          <div class="tool-tags">
            <span class="tag">适用：${t.suitableFor}</span>
            <span class="tag">周期：${t.cycle}</span>
            <span class="tag">成本：${t.cost}</span>
          </div>
        </div>
      </div>
    `).join('');

    els.toolCards.innerHTML = `
      <div class="plan-summary">
        <span>📋 总计 ${plan.total} 人</span>
        <span>💰 总逾期 ¥${plan.totalOverdueAmount.toLocaleString()}</span>
        <span>🎯 整体预估回款率 ${plan.overallRecoveryRate}%</span>
        <span>💵 预计回款 ¥${plan.totalExpectedRecovery.toLocaleString()}</span>
      </div>
      ${tools}
    `;
  }

  function renderCourtScreening(screening) {
    const s = screening.summary;
    els.courtScreening.innerHTML = `
      <div class="court-stats">
        <div class="court-stat eligible">
          <div class="court-stat-value">${s.eligibleCount}</div>
          <div class="court-stat-label">可立案人数</div>
          <div class="court-stat-amount">¥${s.eligibleAmount.toLocaleString()}</div>
        </div>
        <div class="court-stat filed">
          <div class="court-stat-value">${s.alreadyFiledCount}</div>
          <div class="court-stat-label">已立案/调解中</div>
        </div>
        <div class="court-stat near">
          <div class="court-stat-value">${s.nearEligibleCount}</div>
          <div class="court-stat-label">即将符合（60-90天）</div>
          <div class="court-stat-amount">¥${s.nearEligibleAmount.toLocaleString()}</div>
        </div>
      </div>
      ${s.eligibleCount > 0 ? `
      <div class="court-list">
        <h4>⚖️ 建议立案名单（按优先级排序）</h4>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>排名</th><th>客户编号</th><th>本金</th><th>逾期</th><th>欠款</th><th>回款率</th><th>推荐策略</th></tr></thead>
            <tbody>
              ${screening.eligible.slice(0, 20).map((d, i) => `
                <tr>
                  <td>${i+1}</td>
                  <td>${d.id}</td>
                  <td>¥${d.principal.toLocaleString()}</td>
                  <td>${d.overdueDays}天</td>
                  <td>¥${d.overdueAmount.toLocaleString()}</td>
                  <td><span class="badge ${d.recoveryRate>=50?'success':d.recoveryRate>=30?'warning':'danger'}">${d.recoveryRate}%</span></td>
                  <td>${d.bestStrategy.primary?.name||'常规催收'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>` : '<p style="color:#8b8fa3">暂无法诉客户</p>'}
    `;
  }

  function renderPriorityTable(queue) {
    els.priorityTable.querySelector('thead').innerHTML = '<tr><th>排名</th><th>客户编号</th><th>本金</th><th>逾期天数</th><th>逾期金额</th><th>回款率</th><th>催收难度</th><th>联系状态</th><th>推荐行动</th></tr>';
    els.priorityTable.querySelector('tbody').innerHTML = queue.map(d => `
      <tr>
        <td><strong>${d.rank}</strong></td>
        <td>${d.id}</td>
        <td>¥${d.principal.toLocaleString()}</td>
        <td>${d.overdueDays}天</td>
        <td>¥${d.overdueAmount.toLocaleString()}</td>
        <td><span class="badge ${d.recoveryRate>=50?'success':d.recoveryRate>=30?'warning':'danger'}">${d.recoveryRate}%</span></td>
        <td><span class="badge ${d.collectionDifficulty>=60?'danger':d.collectionDifficulty>=30?'warning':'success'}">${d.collectionDifficulty}</span></td>
        <td>${d.phoneStatus}</td>
        <td>${d.actionSummary}</td>
      </tr>
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

        ${c.urgentActions.length ? `<div class="urgent-actions">${c.urgentActions.map(a => `<div class="urgent-item">${a}</div>`).join('')}</div>` : ''}

        <div class="persona-stats">
          <div class="stat-item"><div class="stat-label">人数</div><div class="stat-value">${c.members.length}</div></div>
          <div class="stat-item"><div class="stat-label">平均本金</div><div class="stat-value">¥${Number(c.avgPrincipal).toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">逾期</div><div class="stat-value">${c.avgOverdueMonths}月</div></div>
          <div class="stat-item"><div class="stat-label">欠款总额</div><div class="stat-value">¥${c.totalOverdueAmount.toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">预估回款率</div><div class="stat-value ${parseFloat(c.avgRecoveryRate)>=50?'':'danger'}">${c.avgRecoveryRate}%</div></div>
          <div class="stat-item"><div class="stat-label">预计回款</div><div class="stat-value">¥${c.totalExpectedRecovery.toLocaleString()}</div></div>
          <div class="stat-item"><div class="stat-label">催收难度</div><div class="stat-value">${c.avgDifficulty}</div></div>
          <div class="stat-item"><div class="stat-label">法诉适配</div><div class="stat-value">${c.avgCourtSuitability}</div></div>
          <div class="stat-item"><div class="stat-label">可立案</div><div class="stat-value">${c.courtEligible}人</div></div>
          <div class="stat-item"><div class="stat-label">有房贷</div><div class="stat-value">${c.mortgageRate}%</div></div>
          <div class="stat-item"><div class="stat-label">失联率</div><div class="stat-value ${parseFloat(c.unreachableRate)>30?'danger':''}">${c.unreachableRate}%</div></div>
          <div class="stat-item"><div class="stat-label">主要工具</div><div class="stat-value" style="font-size:11px">${c.primaryTool}</div></div>
        </div>

        <div class="persona-tags">
          ${c.topRegions.map(r => `<span class="tag">📍 ${r.name} (${r.pct}%)</span>`).join('')}
        </div>

        <div class="persona-strategy">
          <div class="strategy-title">💡 催收策略</div>
          <ul>${c.strategy.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    `).join('');
  }

  function clearData() {
    analyzer.rawData = []; analyzer.processedData = []; analyzer.clusters = [];
    els.dataPreview.style.display = 'none'; els.analysisPanel.style.display = 'none'; els.results.style.display = 'none';
    els.fileInput.value = ''; chartRenderer.destroyAll();
  }

  console.log('💳 信用卡催收回款分析平台已就绪');
})();

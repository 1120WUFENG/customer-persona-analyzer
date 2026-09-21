/**
 * 应用主逻辑
 * 绑定事件、协调分析器和图表渲染
 */

(function() {
  'use strict';

  // ========== 初始化 ==========
  const analyzer = new CustomerAnalyzer();
  const chartRenderer = new ChartRenderer();

  // DOM 元素
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
    clusterLabel: document.getElementById('clusterLabel')
  };

  // ========== 事件绑定 ==========

  // 导入按钮
  els.btnImport.addEventListener('click', () => els.fileInput.click());

  // 文件选择
  els.fileInput.addEventListener('change', handleFileSelect);

  // 拖拽上传
  els.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.dropZone.classList.add('drag-over');
  });

  els.dropZone.addEventListener('dragleave', () => {
    els.dropZone.classList.remove('drag-over');
  });

  els.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  });

  // 点击上传区域
  els.dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL') els.fileInput.click();
  });

  // 示例数据
  els.btnSample.addEventListener('click', loadSampleData);

  // 分析按钮
  els.btnAnalyze.addEventListener('click', runAnalysis);

  // 导出按钮
  els.btnExport.addEventListener('click', () => {
    if (window.lastResults) {
      analyzer.exportReport(window.lastResults);
    }
  });

  // 清除按钮
  els.btnClear.addEventListener('click', clearData);

  // 聚类数量滑块
  els.clusterCount.addEventListener('input', (e) => {
    els.clusterLabel.textContent = `${e.target.value} 类`;
  });

  // ========== 文件处理 ==========

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
  }

  async function processFile(file) {
    try {
      let data;
      
      if (file.name.endsWith('.csv')) {
        data = await analyzer.parseCSV(file);
      } else if (file.name.endsWith('.json')) {
        data = await analyzer.parseJSON(file);
      } else {
        alert('请上传 CSV 或 JSON 文件');
        return;
      }

      showDataPreview(data);
      showAnalysisPanel();
    } catch (err) {
      alert('文件解析失败: ' + err.message);
    }
  }

  // ========== 数据预览 ==========

  function showDataPreview(data) {
    els.dataPreview.style.display = 'block';
    els.dataStats.textContent = `📊 ${data.length} 条记录 | ${Object.keys(data[0]).length} 个字段`;

    // 构建表格
    const fields = Object.keys(data[0]);
    const thead = els.previewTable.querySelector('thead');
    const tbody = els.previewTable.querySelector('tbody');

    thead.innerHTML = `<tr>${fields.map(f => `<th>${f}</th>`).join('')}</tr>`;
    
    const previewRows = data.slice(0, 10);
    tbody.innerHTML = previewRows.map(row => 
      `<tr>${fields.map(f => `<td>${row[f] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    if (data.length > 10) {
      tbody.innerHTML += `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 10} 条记录</td></tr>`;
    }
  }

  // ========== 分析控制台 ==========

  function showAnalysisPanel() {
    els.analysisPanel.style.display = 'block';
    els.analysisPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========== 示例数据 ==========

  function loadSampleData() {
    const data = analyzer.loadSampleData();
    showDataPreview(data);
    showAnalysisPanel();
    
    // 自动运行分析
    setTimeout(runAnalysis, 300);
  }

  // ========== 执行分析 ==========

  function runAnalysis() {
    // 获取选中的维度
    const dimensions = [];
    document.querySelectorAll('#dimensions input:checked').forEach(cb => {
      dimensions.push(cb.value);
    });

    if (dimensions.length === 0) {
      alert('请至少选择一个分析维度');
      return;
    }

    const clusterCount = parseInt(els.clusterCount.value);

    // 执行分析
    const results = analyzer.analyze(dimensions, clusterCount);
    window.lastResults = results;

    // 渲染结果
    renderResults(results);
  }

  // ========== 渲染结果 ==========

  function renderResults(results) {
    els.results.style.display = 'block';
    els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 概览卡片
    renderOverviewCards(results.overview);

    // 图表
    chartRenderer.renderAll(results);

    // 画像卡
    renderPersonaCards(results.clusters);

    // 数据表
    renderResultTable(results);
  }

  /**
   * 渲染概览卡片
   */
  function renderOverviewCards(overview) {
    const cards = [
      { icon: '👥', value: overview.totalCustomers, label: '总客户数' },
      { icon: '📊', value: overview.avgAge, label: '平均年龄' },
      { icon: '💰', value: `¥${Number(overview.avgConsumption).toLocaleString()}`, label: '平均消费' },
      { icon: '📈', value: overview.avgFrequency, label: '平均活跃天数' },
      { icon: '🏆', value: `¥${Number(overview.maxConsumption).toLocaleString()}`, label: '最高消费' },
      { icon: '👫', value: `${overview.genderRatio.male}:${overview.genderRatio.female}`, label: '男女比例' }
    ];

    els.overviewCards.innerHTML = cards.map(card => `
      <div class="overview-card">
        <div class="icon">${card.icon}</div>
        <div class="value">${card.value}</div>
        <div class="label">${card.label}</div>
      </div>
    `).join('');
  }

  /**
   * 渲染客户画像卡
   */
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
          <div class="stat-item">
            <div class="stat-label">占比</div>
            <div class="stat-value">${cluster.percentage}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">人数</div>
            <div class="stat-value">${cluster.members.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">平均年龄</div>
            <div class="stat-value">${cluster.avgAge}岁</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">平均消费</div>
            <div class="stat-value">¥${Number(cluster.avgConsumption).toLocaleString()}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">活跃天数</div>
            <div class="stat-value">${cluster.avgFrequency}天/月</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">性别比</div>
            <div class="stat-value">${cluster.genderRatio.male}:${cluster.genderRatio.female}</div>
          </div>
        </div>

        <div class="persona-tags">
          ${cluster.topRegions.map(r => `<span class="tag">📍 ${r.name}</span>`).join('')}
          ${cluster.topPreferences.map(p => `<span class="tag">🏷️ ${p.name}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  /**
   * 渲染结果数据表
   */
  function renderResultTable(results) {
    const data = analyzer.processedData;
    if (data.length === 0) return;

    const fields = ['id', 'name', 'age', 'gender', 'region', 'consumption', 'frequency', 'orderCount', 'preference'];
    const fieldNames = {
      id: 'ID', name: '姓名', age: '年龄', gender: '性别', region: '地区',
      consumption: '消费金额', frequency: '活跃天数', orderCount: '订单数', preference: '偏好'
    };

    const thead = els.resultTable.querySelector('thead');
    const tbody = els.resultTable.querySelector('tbody');

    thead.innerHTML = `<tr>${fields.map(f => `<th>${fieldNames[f]}</th>`).join('')}</tr>`;
    
    const rows = data.slice(0, 50);
    tbody.innerHTML = rows.map(row => `
      <tr>
        <td>${row.id}</td>
        <td>${row.name}</td>
        <td>${row.age}</td>
        <td>${row.gender}</td>
        <td>${row.region}</td>
        <td>¥${row.consumption.toLocaleString()}</td>
        <td>${row.frequency}</td>
        <td>${row.orderCount}</td>
        <td>${row.preference}</td>
      </tr>
    `).join('');

    if (data.length > 50) {
      tbody.innerHTML += `<tr><td colspan="${fields.length}" style="text-align:center;color:#8b8fa3">... 还有 ${data.length - 50} 条记录</td></tr>`;
    }
  }

  // ========== 清除数据 ==========

  function clearData() {
    analyzer.rawData = [];
    analyzer.processedData = [];
    analyzer.clusters = [];
    analyzer.fieldMapping = {};
    
    els.dataPreview.style.display = 'none';
    els.analysisPanel.style.display = 'none';
    els.results.style.display = 'none';
    els.fileInput.value = '';
    
    chartRenderer.destroyAll();
  }

  // ========== 初始化提示 ==========
  console.log('🚀 客户画像分析平台已就绪');

})();

/**
 * 客户画像分析引擎
 * 支持 CSV/JSON 数据导入，自动识别字段，聚类分析
 */

class CustomerAnalyzer {
  constructor() {
    this.rawData = [];
    this.processedData = [];
    this.clusters = [];
    this.fieldMapping = {};
  }

  // ========== 数据解析 ==========
  
  /**
   * 解析 CSV 文件
   */
  parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.rawData = results.data;
          this.autoMapFields();
          resolve(this.rawData);
        },
        error: (err) => reject(err)
      });
    });
  }

  /**
   * 解析 JSON 文件
   */
  parseJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.rawData = Array.isArray(data) ? data : [data];
          this.autoMapFields();
          resolve(this.rawData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * 自动识别字段映射
   */
  autoMapFields() {
    if (this.rawData.length === 0) return;
    
    const fields = Object.keys(this.rawData[0]);
    const mapping = {};
    
    // 字段名匹配规则
    const rules = {
      id: /^id|编号|用户id|customer.?id|user.?id/i,
      name: /^name|姓名|名字|昵称|username/i,
      age: /^age|年龄/i,
      gender: /^gender|性别|sex/i,
      region: /^region|地区|地域|城市|city|location|province|省份/i,
      phone: /^phone|手机|电话|tel/i,
      email: /^email|邮箱/i,
      consumption: /^consumption|消费|金额|amount|spend|total.?spent|purchase/i,
      frequency: /^frequency|频率|频次|活跃|active|visit|登录/i,
      registerDate: /^register|注册|signup|join/i,
      lastActive: /^last.?active|最后活跃|最近登录/i,
      preference: /^preference|偏好|标签|tag|category|品类|interest/i,
      level: /^level|等级|vip|会员/i,
      orderCount: /^order|订单数|purchase.?count/i
    };

    for (const field of fields) {
      for (const [key, pattern] of Object.entries(rules)) {
        if (pattern.test(field) && !mapping[key]) {
          mapping[key] = field;
          break;
        }
      }
    }

    this.fieldMapping = mapping;
    return mapping;
  }

  /**
   * 加载示例数据
   */
  loadSampleData() {
    const regions = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安'];
    const genders = ['男', '女'];
    const preferences = ['数码', '服饰', '美妆', '食品', '运动', '家居', '图书', '母婴', '旅游', '汽车'];
    const levels = ['普通', '银卡', '金卡', '钻石'];
    
    this.rawData = Array.from({ length: 200 }, (_, i) => {
      const age = Math.floor(Math.random() * 50) + 18;
      const gender = genders[Math.floor(Math.random() * 2)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const consumption = Math.floor(Math.random() * 50000) + 100;
      const frequency = Math.floor(Math.random() * 30) + 1;
      const orderCount = Math.floor(Math.random() * 100) + 1;
      const pref = preferences[Math.floor(Math.random() * 3)];
      const level = consumption > 30000 ? '钻石' : consumption > 15000 ? '金卡' : consumption > 5000 ? '银卡' : '普通';
      
      return {
        id: `U${String(i + 1).padStart(4, '0')}`,
        姓名: `用户${i + 1}`,
        年龄: age,
        性别: gender,
        地区: region,
        消费金额: consumption,
        活跃天数: frequency,
        订单数: orderCount,
        偏好: pref,
        会员等级: level
      };
    });

    this.autoMapFields();
    return this.rawData;
  }

  // ========== 分析引擎 ==========

  /**
   * 执行完整分析
   */
  analyze(dimensions, clusterCount) {
    this.processedData = this.preprocessData();
    
    // 各维度分析
    const results = {
      total: this.processedData.length,
      overview: this.calcOverview(),
      clusters: this.kMeansClustering(clusterCount),
      distributions: {}
    };

    // 计算各维度分布
    if (dimensions.includes('age')) {
      results.distributions.age = this.calcDistribution('age', this.getAgeBuckets());
    }
    if (dimensions.includes('gender')) {
      results.distributions.gender = this.calcCategoryDistribution('gender');
    }
    if (dimensions.includes('region')) {
      results.distributions.region = this.calcCategoryDistribution('region');
    }
    if (dimensions.includes('consumption')) {
      results.distributions.consumption = this.calcDistribution('consumption', this.getConsumptionBuckets());
    }
    if (dimensions.includes('frequency')) {
      results.distributions.frequency = this.calcDistribution('frequency', this.getFrequencyBuckets());
    }
    if (dimensions.includes('preference')) {
      results.distributions.preference = this.calcTagDistribution('preference');
    }

    this.clusters = results.clusters;
    return results;
  }

  /**
   * 数据预处理
   */
  preprocessData() {
    return this.rawData.map(item => {
      const mapped = {};
      
      // 标准化字段
      mapped.id = this.getField(item, 'id') || Math.random().toString(36).substr(2, 9);
      mapped.name = this.getField(item, 'name') || '';
      mapped.age = this.parseNumber(this.getField(item, 'age'));
      mapped.gender = this.normalizeGender(this.getField(item, 'gender'));
      mapped.region = this.getField(item, 'region') || '未知';
      mapped.consumption = this.parseNumber(this.getField(item, 'consumption'));
      mapped.frequency = this.parseNumber(this.getField(item, 'frequency'));
      mapped.orderCount = this.parseNumber(this.getField(item, 'orderCount'));
      mapped.preference = this.getField(item, 'preference') || '';
      mapped.level = this.getField(item, 'level') || '';

      return mapped;
    }).filter(item => item.age > 0 || item.consumption > 0); // 过滤无效数据
  }

  /**
   * 获取字段值（通过映射）
   */
  getField(item, key) {
    const fieldName = this.fieldMapping[key];
    if (fieldName) return item[fieldName];
    
    // 尝试直接访问
    return item[key];
  }

  /**
   * 解析数字
   */
  parseNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  /**
   * 标准化性别
   */
  normalizeGender(val) {
    if (!val) return '未知';
    const str = String(val).toLowerCase();
    if (/^(m|male|男|man|1)$/i.test(str)) return '男';
    if (/^(f|female|女|woman|2|0)$/i.test(str)) return '女';
    return '未知';
  }

  /**
   * 计算概览统计
   */
  calcOverview() {
    const data = this.processedData;
    const ages = data.filter(d => d.age > 0).map(d => d.age);
    const consumptions = data.filter(d => d.consumption > 0).map(d => d.consumption);
    const frequencies = data.filter(d => d.frequency > 0).map(d => d.frequency);

    return {
      totalCustomers: data.length,
      avgAge: ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : 0,
      avgConsumption: consumptions.length ? (consumptions.reduce((a, b) => a + b, 0) / consumptions.length).toFixed(0) : 0,
      avgFrequency: frequencies.length ? (frequencies.reduce((a, b) => a + b, 0) / frequencies.length).toFixed(1) : 0,
      maxConsumption: consumptions.length ? Math.max(...consumptions) : 0,
      genderRatio: this.calcGenderRatio(data)
    };
  }

  /**
   * 计算性别比例
   */
  calcGenderRatio(data) {
    const male = data.filter(d => d.gender === '男').length;
    const female = data.filter(d => d.gender === '女').length;
    return { male, female, unknown: data.length - male - female };
  }

  /**
   * K-Means 聚类
   */
  kMeansClustering(k) {
    const data = this.processedData.filter(d => d.consumption > 0 && d.age > 0);
    if (data.length < k) return [];

    // 特征标准化
    const features = data.map(d => [d.age, d.consumption, d.frequency]);
    const normalized = this.normalizeFeatures(features);

    // 初始化质心
    let centroids = this.initCentroids(normalized, k);
    let assignments = new Array(data.length).fill(0);
    
    // 迭代
    for (let iter = 0; iter < 50; iter++) {
      let changed = false;
      
      // 分配到最近的质心
      for (let i = 0; i < normalized.length; i++) {
        let minDist = Infinity;
        let minIdx = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const dist = this.euclideanDistance(normalized[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            minIdx = j;
          }
        }
        
        if (assignments[i] !== minIdx) {
          assignments[i] = minIdx;
          changed = true;
        }
      }
      
      if (!changed) break;
      
      // 更新质心
      centroids = this.updateCentroids(normalized, assignments, k);
    }

    // 生成聚类结果
    return this.buildClusterResults(data, assignments, k);
  }

  /**
   * 特征标准化
   */
  normalizeFeatures(features) {
    const cols = features[0].length;
    const mins = Array(cols).fill(Infinity);
    const maxs = Array(cols).fill(-Infinity);
    
    for (const row of features) {
      for (let i = 0; i < cols; i++) {
        mins[i] = Math.min(mins[i], row[i]);
        maxs[i] = Math.max(maxs[i], row[i]);
      }
    }
    
    return features.map(row => 
      row.map((val, i) => maxs[i] === mins[i] ? 0 : (val - mins[i]) / (maxs[i] - mins[i]))
    );
  }

  /**
   * 初始化质心
   */
  initCentroids(data, k) {
    const indices = new Set();
    while (indices.size < k) {
      indices.add(Math.floor(Math.random() * data.length));
    }
    return [...indices].map(i => [...data[i]]);
  }

  /**
   * 更新质心
   */
  updateCentroids(data, assignments, k) {
    const centroids = Array.from({ length: k }, () => Array(data[0].length).fill(0));
    const counts = Array(k).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      for (let j = 0; j < data[i].length; j++) {
        centroids[cluster][j] += data[i][j];
      }
    }
    
    return centroids.map((centroid, i) => 
      counts[i] > 0 ? centroid.map(v => v / counts[i]) : centroid
    );
  }

  /**
   * 欧氏距离
   */
  euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  }

  /**
   * 构建聚类结果
   */
  buildClusterResults(data, assignments, k) {
    const clusters = Array.from({ length: k }, () => ({
      members: [],
      avgAge: 0,
      avgConsumption: 0,
      avgFrequency: 0,
      genderRatio: { male: 0, female: 0 },
      topRegions: [],
      topPreferences: [],
      label: '',
      description: ''
    }));

    // 分配成员
    for (let i = 0; i < data.length; i++) {
      clusters[assignments[i]].members.push(data[i]);
    }

    // 计算每个聚类的统计
    const personaNames = ['活力青年', '品质精英', '稳健家庭', '经济实惠', '潮流先锋', '银发长者', '职场白领', '学生群体'];
    const personaEmojis = ['🚀', '💎', '🏠', '💰', '✨', '👴', '💼', '🎓'];
    const personaColors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#74b9ff', '#fd79a8', '#a29bfe', '#55efc4'];

    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      if (c.members.length === 0) continue;

      c.avgAge = (c.members.reduce((s, m) => s + m.age, 0) / c.members.length).toFixed(1);
      c.avgConsumption = (c.members.reduce((s, m) => s + m.consumption, 0) / c.members.length).toFixed(0);
      c.avgFrequency = (c.members.reduce((s, m) => s + m.frequency, 0) / c.members.length).toFixed(1);
      c.genderRatio = this.calcGenderRatio(c.members);
      c.topRegions = this.getTopItems(c.members, 'region', 3);
      c.topPreferences = this.getTopItems(c.members, 'preference', 3);
      c.label = personaNames[i] || `群体 ${i + 1}`;
      c.emoji = personaEmojis[i] || '👤';
      c.color = personaColors[i] || '#6c5ce7';
      c.percentage = ((c.members.length / data.length) * 100).toFixed(1);
      c.description = this.generatePersonaDescription(c);
    }

    return clusters.filter(c => c.members.length > 0);
  }

  /**
   * 生成画像描述
   */
  generatePersonaDescription(cluster) {
    const age = parseFloat(cluster.avgAge);
    const consumption = parseFloat(cluster.avgConsumption);
    
    let desc = '';
    if (age < 25) desc += '年轻群体，';
    else if (age < 35) desc += '青年群体，';
    else if (age < 45) desc += '中年群体，';
    else desc += '成熟群体，';

    if (consumption > 30000) desc += '高消费能力';
    else if (consumption > 15000) desc += '中高消费能力';
    else if (consumption > 5000) desc += '中等消费能力';
    else desc += '基础消费能力';

    return desc;
  }

  /**
   * 获取 Top N 项目
   */
  getTopItems(data, field, n) {
    const counts = {};
    data.forEach(d => {
      const val = d[field];
      if (val && val !== '未知') {
        counts[val] = (counts[val] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count, pct: ((count / data.length) * 100).toFixed(1) }));
  }

  // ========== 分布计算 ==========

  calcDistribution(field, buckets) {
    const counts = {};
    buckets.forEach(b => counts[b.label] = 0);
    
    this.processedData.forEach(d => {
      const val = d[field];
      for (const bucket of buckets) {
        if (val >= bucket.min && val < bucket.max) {
          counts[bucket.label]++;
          break;
        }
      }
    });
    
    return {
      labels: Object.keys(counts),
      values: Object.values(counts)
    };
  }

  calcCategoryDistribution(field) {
    const counts = {};
    this.processedData.forEach(d => {
      const val = d[field] || '未知';
      counts[val] = (counts[val] || 0) + 1;
    });
    
    return {
      labels: Object.keys(counts),
      values: Object.values(counts)
    };
  }

  calcTagDistribution(field) {
    const counts = {};
    this.processedData.forEach(d => {
      const val = d[field];
      if (val) {
        // 支持逗号/分号分隔的多标签
        const tags = val.split(/[,;，；、]/).map(t => t.trim()).filter(Boolean);
        tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return {
      labels: sorted.map(s => s[0]),
      values: sorted.map(s => s[1])
    };
  }

  // ========== 分桶规则 ==========

  getAgeBuckets() {
    return [
      { label: '18-24', min: 18, max: 25 },
      { label: '25-34', min: 25, max: 35 },
      { label: '35-44', min: 35, max: 45 },
      { label: '45-54', min: 45, max: 55 },
      { label: '55+', min: 55, max: 150 }
    ];
  }

  getConsumptionBuckets() {
    return [
      { label: '0-1k', min: 0, max: 1000 },
      { label: '1k-5k', min: 1000, max: 5000 },
      { label: '5k-1w', min: 5000, max: 10000 },
      { label: '1w-3w', min: 10000, max: 30000 },
      { label: '3w+', min: 30000, max: Infinity }
    ];
  }

  getFrequencyBuckets() {
    return [
      { label: '低频(1-5天)', min: 1, max: 6 },
      { label: '中频(6-15天)', min: 6, max: 16 },
      { label: '高频(16-30天)', min: 16, max: 31 }
    ];
  }

  // ========== 导出 ==========

  /**
   * 导出分析报告
   */
  exportReport(results) {
    const report = {
      title: '客户画像分析报告',
      generatedAt: new Date().toISOString(),
      summary: results.overview,
      clusters: results.clusters.map(c => ({
        name: c.label,
        description: c.description,
        percentage: c.percentage + '%',
        avgAge: c.avgAge,
        avgConsumption: c.avgConsumption,
        topRegions: c.topRegions.map(r => r.name),
        topPreferences: c.topPreferences.map(p => p.name)
      })),
      distributions: results.distributions
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户画像报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// 导出
window.CustomerAnalyzer = CustomerAnalyzer;

/**
 * 客户画像分析引擎 v2
 * 支持 RFM 模型、CLV、流失预警、消费趋势、复购率等多维度分析
 */

class CustomerAnalyzer {
  constructor() {
    this.rawData = [];
    this.processedData = [];
    this.clusters = [];
    this.fieldMapping = {};
  }

  // ========== 数据解析 ==========

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

  parseJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.rawData = Array.isArray(data) ? data : [data];
          this.autoMapFields();
          resolve(this.rawData);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  autoMapFields() {
    if (this.rawData.length === 0) return;
    const fields = Object.keys(this.rawData[0]);
    const mapping = {};

    const rules = {
      id: /^id|编号|用户id|customer.?id|user.?id/i,
      name: /^name|姓名|名字|昵称|username/i,
      age: /^age|年龄/i,
      gender: /^gender|性别|sex/i,
      region: /^region|地区|地域|城市|city|location|province|省份/i,
      phone: /^phone|手机|电话|tel/i,
      email: /^email|邮箱/i,
      consumption: /^consumption|消费|金额|amount|spend|total.?spent|monetary|m/i,
      frequency: /^frequency|频率|频次|活跃|active|visit|登录|次数/i,
      registerDate: /^register|注册|signup|join|create.?time/i,
      lastActive: /^last.?active|最后活跃|最近登录|recency|r/i,
      preference: /^preference|偏好|标签|tag|category|品类|interest/i,
      level: /^level|等级|vip|会员/i,
      orderCount: /^order|订单数|purchase.?count|订单/i,
      avgOrderValue: /^avg.?order|客单价|平均订单|aov/i,
      returnRate: /^return|退货|退款/i,
      channel: /^channel|渠道|来源|source|platform/i,
      score: /^score|评分|满意度|rating|satisfaction/i,
      loginCount: /^login|登录次数|session/i,
      browseDuration: /^browse|浏览|duration|停留/i,
      cartCount: /^cart|加购|购物车/i,
      couponUsed: /^coupon|优惠券|折扣/i,
      lastPurchaseDate: /^last.?purchase|最近购买|最后下单/i,
      firstPurchaseDate: /^first.?purchase|首次购买|首单/i,
      totalOrders: /^total.?orders?|累计订单|历史订单/i
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

  loadSampleData() {
    const regions = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安'];
    const genders = ['男', '女'];
    const preferences = ['数码', '服饰', '美妆', '食品', '运动', '家居', '图书', '母婴', '旅游', '汽车'];
    const channels = ['APP', '小程序', 'PC网站', '线下门店', '第三方平台'];
    const levels = ['普通', '银卡', '金卡', '钻石'];

    const now = Date.now();
    const day = 86400000;

    this.rawData = Array.from({ length: 300 }, (_, i) => {
      const age = Math.floor(Math.random() * 50) + 18;
      const gender = genders[Math.floor(Math.random() * 2)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const regDaysAgo = Math.floor(Math.random() * 1095) + 30; // 注册 30~1125 天前
      const lastActiveDaysAgo = Math.floor(Math.random() * 120); // 最近活跃 0~120 天前
      const totalOrders = Math.floor(Math.random() * 200) + 1;
      const avgOrderValue = Math.floor(Math.random() * 2000) + 50;
      const consumption = totalOrders * avgOrderValue;
      const frequency = Math.floor(Math.random() * 30) + 1;
      const returnRate = Math.random() * 0.3;
      const score = Math.floor(Math.random() * 5) + 1;
      const loginCount = Math.floor(Math.random() * 500) + 10;
      const browseDuration = Math.floor(Math.random() * 300) + 5;
      const cartCount = Math.floor(Math.random() * 50);
      const couponUsed = Math.floor(Math.random() * 20);
      const pref = preferences.slice(0, Math.floor(Math.random() * 3) + 1).join(',');
      const level = consumption > 100000 ? '钻石' : consumption > 30000 ? '金卡' : consumption > 8000 ? '银卡' : '普通';

      const registerDate = new Date(now - regDaysAgo * day);
      const lastActiveDate = new Date(now - lastActiveDaysAgo * day);
      const firstPurchaseDate = new Date(registerDate.getTime() + Math.floor(Math.random() * 30) * day);
      const lastPurchaseDate = new Date(Math.max(firstPurchaseDate.getTime(), lastActiveDate.getTime() - Math.floor(Math.random() * 30) * day));

      return {
        id: `U${String(i + 1).padStart(4, '0')}`,
        姓名: `用户${i + 1}`,
        年龄: age,
        性别: gender,
        地区: region,
        渠道: channel,
        注册日期: registerDate.toISOString().slice(0, 10),
        最近活跃: lastActiveDate.toISOString().slice(0, 10),
        最近购买: lastPurchaseDate.toISOString().slice(0, 10),
        首次购买: firstPurchaseDate.toISOString().slice(0, 10),
        消费金额: consumption,
        订单数: totalOrders,
        客单价: avgOrderValue,
        活跃天数: frequency,
        退货率: returnRate.toFixed(2),
        评分: score,
        登录次数: loginCount,
        浏览时长: browseDuration,
        加购数: cartCount,
        优惠券使用: couponUsed,
        偏好: pref,
        会员等级: level
      };
    });

    this.autoMapFields();
    return this.rawData;
  }

  // ========== 分析引擎 ==========

  analyze(dimensions, clusterCount) {
    this.processedData = this.preprocessData();

    const results = {
      total: this.processedData.length,
      overview: this.calcOverview(),
      rfm: this.calcRFM(),
      clusters: this.kMeansClustering(clusterCount),
      distributions: {},
      insights: this.generateInsights()
    };

    if (dimensions.includes('age')) results.distributions.age = this.calcDistribution('age', this.getAgeBuckets());
    if (dimensions.includes('gender')) results.distributions.gender = this.calcCategoryDistribution('gender');
    if (dimensions.includes('region')) results.distributions.region = this.calcCategoryDistribution('region');
    if (dimensions.includes('consumption')) results.distributions.consumption = this.calcDistribution('consumption', this.getConsumptionBuckets());
    if (dimensions.includes('frequency')) results.distributions.frequency = this.calcDistribution('frequency', this.getFrequencyBuckets());
    if (dimensions.includes('preference')) results.distributions.preference = this.calcTagDistribution('preference');
    if (dimensions.includes('channel')) results.distributions.channel = this.calcCategoryDistribution('channel');
    if (dimensions.includes('rfm')) results.distributions.rfm = this.calcRFMDistribution();
    if (dimensions.includes('clv')) results.distributions.clv = this.calcDistribution('clv', this.getCLVBuckets());
    if (dimensions.includes('churn')) results.distributions.churn = this.calcDistribution('churnRisk', this.getChurnBuckets());
    if (dimensions.includes('aov')) results.distributions.aov = this.calcDistribution('avgOrderValue', this.getAOVBuckets());
    if (dimensions.includes('returnRate')) results.distributions.returnRate = this.calcDistribution('returnRate', this.getReturnRateBuckets());
    if (dimensions.includes('score')) results.distributions.score = this.calcDistribution('score', this.getScoreBuckets());
    if (dimensions.includes('loyalty')) results.distributions.loyalty = this.calcCategoryDistribution('loyaltyLevel');
    if (dimensions.includes('trend')) results.distributions.trend = this.calcCategoryDistribution('consumptionTrend');

    this.clusters = results.clusters;
    return results;
  }

  preprocessData() {
    return this.rawData.map(item => {
      const mapped = {};
      mapped.id = this.getField(item, 'id') || Math.random().toString(36).substr(2, 9);
      mapped.name = this.getField(item, 'name') || '';
      mapped.age = this.parseNumber(this.getField(item, 'age'));
      mapped.gender = this.normalizeGender(this.getField(item, 'gender'));
      mapped.region = this.getField(item, 'region') || '未知';
      mapped.channel = this.getField(item, 'channel') || '未知';
      mapped.consumption = this.parseNumber(this.getField(item, 'consumption'));
      mapped.frequency = this.parseNumber(this.getField(item, 'frequency'));
      mapped.orderCount = this.parseNumber(this.getField(item, 'orderCount'));
      mapped.avgOrderValue = this.parseNumber(this.getField(item, 'avgOrderValue'));
      mapped.preference = this.getField(item, 'preference') || '';
      mapped.level = this.getField(item, 'level') || '';
      mapped.score = this.parseNumber(this.getField(item, 'score'));
      mapped.loginCount = this.parseNumber(this.getField(item, 'loginCount'));
      mapped.browseDuration = this.parseNumber(this.getField(item, 'browseDuration'));
      mapped.cartCount = this.parseNumber(this.getField(item, 'cartCount'));
      mapped.couponUsed = this.parseNumber(this.getField(item, 'couponUsed'));
      mapped.returnRate = this.parseNumber(this.getField(item, 'returnRate'));
      mapped.registerDate = this.parseDate(this.getField(item, 'registerDate'));
      mapped.lastActive = this.parseDate(this.getField(item, 'lastActive'));
      mapped.lastPurchaseDate = this.parseDate(this.getField(item, 'lastPurchaseDate'));
      mapped.firstPurchaseDate = this.parseDate(this.getField(item, 'firstPurchaseDate'));

      // 派生指标
      mapped.daysSinceRegister = this.daysBetween(mapped.registerDate, new Date());
      mapped.daysSinceLastActive = this.daysBetween(mapped.lastActive, new Date());
      mapped.daysSinceLastPurchase = this.daysBetween(mapped.lastPurchaseDate, new Date());
      mapped.customerAgeMonths = Math.max(1, Math.round(mapped.daysSinceRegister / 30));
      mapped.monthlyOrderRate = mapped.orderCount / mapped.customerAgeMonths;
      mapped.monthlyConsumption = mapped.consumption / mapped.customerAgeMonths;
      mapped.repurchaseRate = mapped.orderCount > 1 ? ((mapped.orderCount - 1) / mapped.orderCount * 100).toFixed(1) : 0;
      mapped.browseToOrderRatio = mapped.loginCount > 0 ? (mapped.orderCount / mapped.loginCount * 100).toFixed(1) : 0;
      mapped.cartConversionRate = mapped.cartCount > 0 ? (mapped.orderCount / mapped.cartCount * 100).toFixed(1) : 0;

      // RFM 评分
      mapped.rfmRecency = this.scoreRecency(mapped.daysSinceLastPurchase);
      mapped.rfmFrequency = this.scoreFrequency(mapped.orderCount);
      mapped.rfmMonetary = this.scoreMonetary(mapped.consumption);
      mapped.rfmScore = mapped.rfmRecency + mapped.rfmFrequency + mapped.rfmMonetary;
      mapped.rfmSegment = this.getRFMSegment(mapped.rfmRecency, mapped.rfmFrequency, mapped.rfmMonetary);

      // 客户生命周期价值 (CLV)
      mapped.clv = this.calcCLV(mapped);

      // 流失风险
      mapped.churnRisk = this.calcChurnRisk(mapped);

      // 消费趋势
      mapped.consumptionTrend = this.calcConsumptionTrend(mapped);

      // 忠诚度等级
      mapped.loyaltyLevel = this.calcLoyaltyLevel(mapped);

      return mapped;
    }).filter(item => item.age > 0 || item.consumption > 0);
  }

  getField(item, key) {
    const fieldName = this.fieldMapping[key];
    if (fieldName) return item[fieldName];
    return item[key];
  }

  parseNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  }

  parseDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  daysBetween(d1, d2) {
    if (!d1 || !d2) return 999;
    return Math.floor((d2 - d1) / 86400000);
  }

  normalizeGender(val) {
    if (!val) return '未知';
    const str = String(val).toLowerCase();
    if (/^(m|male|男|man|1)$/i.test(str)) return '男';
    if (/^(f|female|女|woman|2|0)$/i.test(str)) return '女';
    return '未知';
  }

  // ========== RFM 评分 ==========

  scoreRecency(days) {
    if (days <= 7) return 5;
    if (days <= 14) return 4;
    if (days <= 30) return 3;
    if (days <= 60) return 2;
    return 1;
  }

  scoreFrequency(orders) {
    if (orders >= 50) return 5;
    if (orders >= 20) return 4;
    if (orders >= 10) return 3;
    if (orders >= 3) return 2;
    return 1;
  }

  scoreMonetary(consumption) {
    if (consumption >= 100000) return 5;
    if (consumption >= 30000) return 4;
    if (consumption >= 10000) return 3;
    if (consumption >= 3000) return 2;
    return 1;
  }

  getRFMSegment(r, f, m) {
    const total = r + f + m;
    if (r >= 4 && f >= 4 && m >= 4) return '🏆 重要价值客户';
    if (r >= 4 && f >= 4 && m < 4) return '🔄 重要保持客户';
    if (r >= 4 && f < 4 && m >= 4) return '💎 重要发展客户';
    if (r >= 4 && f < 4 && m < 4) return '🌱 新客户';
    if (r < 4 && f >= 4 && m >= 4) return '⚠️ 重要挽留客户';
    if (r < 4 && f >= 4 && m < 4) return '😴 一般维持客户';
    if (r < 4 && f < 4 && m >= 4) return '🔔 重要唤回客户';
    return '❄️ 流失客户';
  }

  // ========== CLV 计算 ==========

  calcCLV(customer) {
    if (customer.orderCount <= 0) return 0;
    const avgMonthlySpend = customer.consumption / Math.max(1, customer.customerAgeMonths);
    const retentionRate = Math.min(0.95, 1 - (customer.daysSinceLastActive / 365));
    const lifespanMonths = Math.max(12, customer.customerAgeMonths * 2); // 预估剩余寿命
    const discountRate = 0.1 / 12; // 月折现率

    let clv = 0;
    for (let m = 1; m <= lifespanMonths; m++) {
      clv += (avgMonthlySpend * Math.pow(retentionRate, m)) / Math.pow(1 + discountRate, m);
    }
    return Math.round(clv);
  }

  // ========== 流失风险 ==========

  calcChurnRisk(customer) {
    let risk = 0;

    // 最近活跃时间权重 40%
    if (customer.daysSinceLastActive > 90) risk += 40;
    else if (customer.daysSinceLastActive > 60) risk += 30;
    else if (customer.daysSinceLastActive > 30) risk += 20;
    else if (customer.daysSinceLastActive > 14) risk += 10;

    // 购买频率下降权重 25%
    if (customer.monthlyOrderRate < 0.5) risk += 25;
    else if (customer.monthlyOrderRate < 1) risk += 15;
    else if (customer.monthlyOrderRate < 2) risk += 5;

    // 退货率权重 15%
    if (customer.returnRate > 0.2) risk += 15;
    else if (customer.returnRate > 0.1) risk += 10;
    else if (customer.returnRate > 0.05) risk += 5;

    // 评分低权重 10%
    if (customer.score <= 2) risk += 10;
    else if (customer.score <= 3) risk += 5;

    // 加购未购买权重 10%
    if (customer.cartCount > 5 && customer.cartConversionRate < 20) risk += 10;
    else if (customer.cartCount > 3 && customer.cartConversionRate < 30) risk += 5;

    return Math.min(100, risk);
  }

  // ========== 消费趋势 ==========

  calcConsumptionTrend(customer) {
    if (customer.customerAgeMonths < 3) return '🆕 新客户';
    const recentMonths = Math.min(3, customer.customerAgeMonths);
    const olderMonths = customer.customerAgeMonths - recentMonths;

    if (olderMonths <= 0) return '🆕 新客户';

    const recentRate = customer.monthlyConsumption;
    const estimatedOldRate = (customer.consumption - recentRate * recentMonths) / olderMonths;

    if (recentRate > estimatedOldRate * 1.3) return '📈 上升';
    if (recentRate < estimatedOldRate * 0.7) return '📉 下降';
    return '➡️ 稳定';
  }

  // ========== 忠诚度 ==========

  calcLoyaltyLevel(customer) {
    const score = (customer.orderCount > 10 ? 25 : customer.orderCount > 5 ? 15 : 5) +
                  (customer.customerAgeMonths > 24 ? 25 : customer.customerAgeMonths > 12 ? 15 : 5) +
                  (customer.daysSinceLastActive < 14 ? 25 : customer.daysSinceLastActive < 30 ? 15 : 5) +
                  (customer.score >= 4 ? 25 : customer.score >= 3 ? 15 : 5);

    if (score >= 85) return '🥇 高忠诚度';
    if (score >= 65) return '🥈 中高忠诚度';
    if (score >= 45) return '🥉 中忠诚度';
    return '⚪ 低忠诚度';
  }

  // ========== 概览统计 ==========

  calcOverview() {
    const d = this.processedData;
    const ages = d.filter(x => x.age > 0).map(x => x.age);
    const consumptions = d.filter(x => x.consumption > 0).map(x => x.consumption);
    const frequencies = d.filter(x => x.frequency > 0).map(x => x.frequency);
    const clvs = d.map(x => x.clv);
    const churns = d.map(x => x.churnRisk);
    const aovs = d.filter(x => x.avgOrderValue > 0).map(x => x.avgOrderValue);
    const returnRates = d.filter(x => x.returnRate > 0).map(x => x.returnRate);

    const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    return {
      totalCustomers: d.length,
      avgAge: avg(ages).toFixed(1),
      avgConsumption: avg(consumptions).toFixed(0),
      avgFrequency: avg(frequencies).toFixed(1),
      maxConsumption: consumptions.length ? Math.max(...consumptions) : 0,
      avgCLV: avg(clvs).toFixed(0),
      avgChurnRisk: avg(churns).toFixed(1),
      avgAOV: avg(aovs).toFixed(0),
      avgReturnRate: (avg(returnRates) * 100).toFixed(1),
      avgRepurchaseRate: avg(d.map(x => parseFloat(x.repurchaseRate))).toFixed(1),
      genderRatio: this.calcGenderRatio(d),
      highValueCount: d.filter(x => x.clv > 50000).length,
      atRiskCount: d.filter(x => x.churnRisk > 60).length,
      newCustomerCount: d.filter(x => x.daysSinceRegister < 90).length,
      loyalCount: d.filter(x => x.loyaltyLevel.includes('高忠诚')).length
    };
  }

  calcGenderRatio(data) {
    const male = data.filter(d => d.gender === '男').length;
    const female = data.filter(d => d.gender === '女').length;
    return { male, female, unknown: data.length - male - female };
  }

  // ========== K-Means 聚类 ==========

  kMeansClustering(k) {
    const data = this.processedData.filter(d => d.consumption > 0);
    if (data.length < k) return [];

    // 使用更多特征进行聚类
    const features = data.map(d => [
      d.age, d.consumption, d.frequency, d.orderCount,
      d.avgOrderValue, d.clv, d.churnRisk, d.daysSinceLastActive
    ]);
    const normalized = this.normalizeFeatures(features);

    let centroids = this.initCentroids(normalized, k);
    let assignments = new Array(data.length).fill(0);

    for (let iter = 0; iter < 80; iter++) {
      let changed = false;
      for (let i = 0; i < normalized.length; i++) {
        let minDist = Infinity, minIdx = 0;
        for (let j = 0; j < centroids.length; j++) {
          const dist = this.euclideanDistance(normalized[i], centroids[j]);
          if (dist < minDist) { minDist = dist; minIdx = j; }
        }
        if (assignments[i] !== minIdx) { assignments[i] = minIdx; changed = true; }
      }
      if (!changed) break;
      centroids = this.updateCentroids(normalized, assignments, k);
    }

    return this.buildClusterResults(data, assignments, k);
  }

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

  initCentroids(data, k) {
    const indices = new Set();
    while (indices.size < k) indices.add(Math.floor(Math.random() * data.length));
    return [...indices].map(i => [...data[i]]);
  }

  updateCentroids(data, assignments, k) {
    const centroids = Array.from({ length: k }, () => Array(data[0].length).fill(0));
    const counts = Array(k).fill(0);
    for (let i = 0; i < data.length; i++) {
      counts[assignments[i]]++;
      for (let j = 0; j < data[i].length; j++) centroids[assignments[i]][j] += data[i][j];
    }
    return centroids.map((c, i) => counts[i] > 0 ? c.map(v => v / counts[i]) : c);
  }

  euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
  }

  buildClusterResults(data, assignments, k) {
    const clusters = Array.from({ length: k }, () => ({ members: [] }));
    for (let i = 0; i < data.length; i++) clusters[assignments[i]].members.push(data[i]);

    const personaNames = ['高价值忠诚客', '潜力成长客', '价格敏感客', '新锐尝鲜客', '沉睡流失客', '高消费低频客', '活跃低价客', 'VIP大客户'];
    const personaEmojis = ['👑', '🚀', '💰', '✨', '😴', '💎', '🔥', '🏆'];
    const personaColors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#636e72', '#74b9ff', '#fd79a8', '#a29bfe'];

    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      if (c.members.length === 0) continue;

      const avg = (arr, fn) => arr.length ? (arr.reduce((s, m) => s + fn(m), 0) / arr.length) : 0;

      c.avgAge = avg(c.members, m => m.age).toFixed(1);
      c.avgConsumption = avg(c.members, m => m.consumption).toFixed(0);
      c.avgFrequency = avg(c.members, m => m.frequency).toFixed(1);
      c.avgOrderCount = avg(c.members, m => m.orderCount).toFixed(0);
      c.avgAOV = avg(c.members, m => m.avgOrderValue).toFixed(0);
      c.avgCLV = avg(c.members, m => m.clv).toFixed(0);
      c.avgChurnRisk = avg(c.members, m => m.churnRisk).toFixed(1);
      c.avgDaysSinceActive = avg(c.members, m => m.daysSinceLastActive).toFixed(0);
      c.avgReturnRate = (avg(c.members, m => m.returnRate) * 100).toFixed(1);
      c.avgRepurchaseRate = avg(c.members, m => parseFloat(m.repurchaseRate)).toFixed(1);
      c.genderRatio = this.calcGenderRatio(c.members);
      c.topRegions = this.getTopItems(c.members, 'region', 3);
      c.topPreferences = this.getTopItems(c.members, 'preference', 3);
      c.topChannels = this.getTopItems(c.members, 'channel', 3);
      c.topRFMSegments = this.getTopItems(c.members, 'rfmSegment', 3);
      c.topLoyalty = this.getTopItems(c.members, 'loyaltyLevel', 2);
      c.topTrends = this.getTopItems(c.members, 'consumptionTrend', 3);
      c.label = personaNames[i] || `群体 ${i + 1}`;
      c.emoji = personaEmojis[i] || '👤';
      c.color = personaColors[i] || '#6c5ce7';
      c.percentage = ((c.members.length / data.length) * 100).toFixed(1);
      c.description = this.generatePersonaDescription(c);
      c.strategy = this.generateStrategy(c);
    }

    return clusters.filter(c => c.members.length > 0);
  }

  generatePersonaDescription(c) {
    const age = parseFloat(c.avgAge);
    const consumption = parseFloat(c.avgConsumption);
    const clv = parseFloat(c.avgCLV);
    const churn = parseFloat(c.avgChurnRisk);
    const orders = parseFloat(c.avgOrderCount);

    let desc = '';
    if (age < 25) desc += 'Z世代年轻群体，';
    else if (age < 35) desc += '青年消费主力，';
    else if (age < 45) desc += '中年成熟客群，';
    else desc += '银发经济群体，';

    if (clv > 50000) desc += '高生命周期价值';
    else if (clv > 20000) desc += '中高价值';
    else if (clv > 5000) desc += '中等价值';
    else desc += '基础价值';

    if (churn > 60) desc += '，流失高风险';
    else if (churn > 30) desc += '，流失中风险';
    else desc += '，低流失风险';

    return desc;
  }

  generateStrategy(c) {
    const churn = parseFloat(c.avgChurnRisk);
    const clv = parseFloat(c.avgCLV);
    const orders = parseFloat(c.avgOrderCount);
    const strategies = [];

    if (churn > 60) strategies.push('紧急召回：发放专属优惠券');
    if (churn > 40) strategies.push('定期关怀：生日/节日触达');
    if (clv > 50000) strategies.push('VIP服务：专属客服+优先权益');
    if (clv > 20000) strategies.push('升级引导：推送高价值商品');
    if (orders < 3) strategies.push('新人激励：首单优惠+引导复购');
    if (parseFloat(c.avgReturnRate) > 15) strategies.push('品质优化：改善退货体验');
    if (strategies.length === 0) strategies.push('持续维护：保持互动频率');

    return strategies;
  }

  getTopItems(data, field, n) {
    const counts = {};
    data.forEach(d => {
      const val = d[field];
      if (val && val !== '未知') counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count, pct: ((count / data.length) * 100).toFixed(1) }));
  }

  // ========== 洞察生成 ==========

  generateInsights() {
    const d = this.processedData;
    const insights = [];

    // 高流失风险预警
    const highChurn = d.filter(x => x.churnRisk > 60).length;
    if (highChurn > 0) {
      insights.push({
        type: 'danger',
        icon: '🚨',
        title: '流失预警',
        text: `${highChurn} 位客户（${(highChurn / d.length * 100).toFixed(1)}%）处于高流失风险，建议立即启动召回计划`
      });
    }

    // 高价值客户
    const highValue = d.filter(x => x.clv > 50000).length;
    if (highValue > 0) {
      insights.push({
        type: 'success',
        icon: '👑',
        title: '高价值客户',
        text: `${highValue} 位客户生命周期价值超过 ¥50,000，建议提供 VIP 专属服务`
      });
    }

    // 复购率分析
    const avgRepurchase = d.reduce((s, x) => s + parseFloat(x.repurchaseRate), 0) / d.length;
    insights.push({
      type: avgRepurchase > 70 ? 'success' : 'warning',
      icon: '🔄',
      title: '复购率',
      text: `平均复购率 ${avgRepurchase.toFixed(1)}%，${avgRepurchase > 70 ? '表现优秀' : '仍有提升空间'}`
    });

    // 渠道分析
    const channelCounts = {};
    d.forEach(x => channelCounts[x.channel] = (channelCounts[x.channel] || 0) + 1);
    const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
    if (topChannel) {
      insights.push({
        type: 'info',
        icon: '📱',
        title: '渠道洞察',
        text: `${topChannel[0]} 是主要获客渠道（${(topChannel[1] / d.length * 100).toFixed(1)}%），建议加大投入`
      });
    }

    return insights;
  }

  // ========== 分布计算 ==========

  calcDistribution(field, buckets) {
    const counts = {};
    buckets.forEach(b => counts[b.label] = 0);
    this.processedData.forEach(d => {
      const val = d[field];
      for (const bucket of buckets) {
        if (val >= bucket.min && val < bucket.max) { counts[bucket.label]++; break; }
      }
    });
    return { labels: Object.keys(counts), values: Object.values(counts) };
  }

  calcCategoryDistribution(field) {
    const counts = {};
    this.processedData.forEach(d => {
      const val = d[field] || '未知';
      counts[val] = (counts[val] || 0) + 1;
    });
    return { labels: Object.keys(counts), values: Object.values(counts) };
  }

  calcTagDistribution(field) {
    const counts = {};
    this.processedData.forEach(d => {
      const val = d[field];
      if (val) {
        val.split(/[,;，；、]/).map(t => t.trim()).filter(Boolean).forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { labels: sorted.map(s => s[0]), values: sorted.map(s => s[1]) };
  }

  calcRFMDistribution() {
    const counts = {};
    this.processedData.forEach(d => {
      counts[d.rfmSegment] = (counts[d.rfmSegment] || 0) + 1;
    });
    return { labels: Object.keys(counts), values: Object.values(counts) };
  }

  // ========== 分桶规则 ==========

  getAgeBuckets() {
    return [
      { label: '18-24', min: 18, max: 25 }, { label: '25-34', min: 25, max: 35 },
      { label: '35-44', min: 35, max: 45 }, { label: '45-54', min: 45, max: 55 },
      { label: '55+', min: 55, max: 150 }
    ];
  }

  getConsumptionBuckets() {
    return [
      { label: '0-1k', min: 0, max: 1000 }, { label: '1k-5k', min: 1000, max: 5000 },
      { label: '5k-1w', min: 5000, max: 10000 }, { label: '1w-3w', min: 10000, max: 30000 },
      { label: '3w-10w', min: 30000, max: 100000 }, { label: '10w+', min: 100000, max: Infinity }
    ];
  }

  getFrequencyBuckets() {
    return [
      { label: '低频(1-5天)', min: 1, max: 6 }, { label: '中频(6-15天)', min: 6, max: 16 },
      { label: '高频(16-30天)', min: 16, max: 31 }
    ];
  }

  getCLVBuckets() {
    return [
      { label: '0-5k', min: 0, max: 5000 }, { label: '5k-2w', min: 5000, max: 20000 },
      { label: '2w-5w', min: 20000, max: 50000 }, { label: '5w-10w', min: 50000, max: 100000 },
      { label: '10w+', min: 100000, max: Infinity }
    ];
  }

  getChurnBuckets() {
    return [
      { label: '低风险(0-20)', min: 0, max: 20 }, { label: '中低(20-40)', min: 20, max: 40 },
      { label: '中等(40-60)', min: 40, max: 60 }, { label: '中高(60-80)', min: 60, max: 80 },
      { label: '高风险(80+)', min: 80, max: 101 }
    ];
  }

  getAOVBuckets() {
    return [
      { label: '0-200', min: 0, max: 200 }, { label: '200-500', min: 200, max: 500 },
      { label: '500-1000', min: 500, max: 1000 }, { label: '1000-2000', min: 1000, max: 2000 },
      { label: '2000+', min: 2000, max: Infinity }
    ];
  }

  getReturnRateBuckets() {
    return [
      { label: '0-5%', min: 0, max: 0.05 }, { label: '5-10%', min: 0.05, max: 0.10 },
      { label: '10-20%', min: 0.10, max: 0.20 }, { label: '20%+', min: 0.20, max: 1 }
    ];
  }

  getScoreBuckets() {
    return [
      { label: '1分', min: 1, max: 2 }, { label: '2分', min: 2, max: 3 },
      { label: '3分', min: 3, max: 4 }, { label: '4分', min: 4, max: 5 },
      { label: '5分', min: 5, max: 6 }
    ];
  }

  // ========== 导出 ==========

  exportReport(results) {
    const report = {
      title: '客户画像深度分析报告',
      generatedAt: new Date().toISOString(),
      summary: results.overview,
      insights: results.insights,
      rfmAnalysis: {
        distribution: results.rfm,
        segments: results.clusters.map(c => ({
          name: c.label, percentage: c.percentage + '%',
          topRFM: c.topRFMSegments.map(r => r.name)
        }))
      },
      clusters: results.clusters.map(c => ({
        name: c.label, description: c.description, strategy: c.strategy,
        percentage: c.percentage + '%', avgAge: c.avgAge,
        avgConsumption: c.avgConsumption, avgCLV: c.avgCLV,
        avgChurnRisk: c.avgChurnRisk, avgRepurchaseRate: c.avgRepurchaseRate + '%',
        topRegions: c.topRegions.map(r => r.name),
        topPreferences: c.topPreferences.map(p => p.name),
        topChannels: c.topChannels.map(ch => ch.name)
      })),
      distributions: results.distributions
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `客户画像深度报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.CustomerAnalyzer = CustomerAnalyzer;

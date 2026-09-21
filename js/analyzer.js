/**
 * 信用卡客户画像分析引擎
 * 基于实际业务字段：办卡、征信、还款、消费、逾期、套现、投诉等
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
      id: /^id|编号|客户id|card.?id|用户id/i,
      cardOpenDate: /^办卡时间|开卡日期|card.?open|发卡日期/i,
      cardOrg: /^办卡单位|发卡行|card.?org|银行|机构/i,
      creditBureau: /^征信|credit.?bureau|征信单位|查询机构/i,
      householdAddr: /^户籍|户口|household|籍贯/i,
      residenceAddr: /^居住|住址|residence|现住|地址/i,
      creditLimit: /^信用额度|额度|credit.?limit|授信/i,
      repaymentRecord: /^还款记录|还款情况|repayment.?record/i,
      consumptionRecord: /^消费记录|消费情况|consumption/i,
      complaint: /^投诉|进线|complaint|是否投诉/i,
      overdueDays: /^逾期时间|逾期天数|overdue.?days|逾期/i,
      lastRepaymentDate: /^最后还款|最近还款|last.?repayment/i,
      lastRepaymentAmount: /^还款金额|最后还款金额|repayment.?amount/i,
      hasMortgage: /^房贷|mortgage|是否有房贷|房屋贷款/i,
      phoneRecord: /^电话|沟通记录|phone.?record|通话/i,
      overdueAmount: /^逾期金额|信用卡逾期|overdue.?amount/i,
      hasCashOut: /^套现|cash.?out|是否有套现|疑似套现/i,
      cashOutMerchant: /^套现商家|套现商户|cash.?merchant/i,
      gender: /^性别|gender|sex/i,
      age: /^年龄|age/i
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

  // ========== 示例数据（信用卡场景）==========

  loadSampleData() {
    const now = Date.now();
    const day = 86400000;
    const month = day * 30;

    const orgs = ['工商银行', '建设银行', '招商银行', '平安银行', '中信银行', '浦发银行', '交通银行', '民生银行'];
    const genders = ['男', '女'];
    const regions = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安', '天津', '苏州'];
    const merchants = ['某商贸公司', '某科技公司', '某贸易商行', '某电子商行', '某批发部', '无'];
    const repaymentStatuses = ['正常', '偶尔逾期', '经常逾期', '严重逾期'];
    const consumptionLevels = ['高消费', '中消费', '低消费', '极少消费'];
    const phoneStatuses = ['多次沟通未接', '已联系并承诺还款', '态度恶劣拒绝沟通', '已达成还款方案', '无法联系', '正常沟通'];

    this.rawData = Array.from({ length: 500 }, (_, i) => {
      const age = Math.floor(Math.random() * 40) + 22;
      const gender = genders[Math.floor(Math.random() * 2)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const org = orgs[Math.floor(Math.random() * orgs.length)];
      const cardAgeMonths = Math.floor(Math.random() * 120) + 6;

      // 信用额度：根据年龄和办卡时长
      const baseLimit = 5000 + Math.floor(Math.random() * 95000);
      const creditLimit = age > 35 && cardAgeMonths > 36 ? baseLimit * 1.5 : baseLimit;

      // 风险因子（决定其他字段）
      const riskSeed = Math.random();
      const isHighRisk = riskSeed < 0.15;
      const isMediumRisk = riskSeed < 0.35;

      // 逾期
      const overdueDays = isHighRisk ? Math.floor(Math.random() * 180) + 30 :
                          isMediumRisk ? Math.floor(Math.random() * 60) : 0;
      const overdueAmount = overdueDays > 0 ? Math.floor(creditLimit * (0.1 + Math.random() * 0.8)) : 0;

      // 还款
      const lastRepaymentDaysAgo = isHighRisk ? Math.floor(Math.random() * 90) + 10 :
                                   isMediumRisk ? Math.floor(Math.random() * 30) + 1 :
                                   Math.floor(Math.random() * 15);
      const lastRepaymentAmount = isHighRisk ? Math.floor(creditLimit * Math.random() * 0.1) :
                                  isMediumRisk ? Math.floor(creditLimit * (0.1 + Math.random() * 0.3)) :
                                  Math.floor(creditLimit * (0.3 + Math.random() * 0.7));

      // 套现
      const hasCashOut = isHighRisk ? (Math.random() < 0.6) : (Math.random() < 0.05);
      const cashOutMerchant = hasCashOut ? merchants[Math.floor(Math.random() * 4)] : '无';

      // 投诉
      const hasComplaint = isHighRisk ? (Math.random() < 0.4) : (Math.random() < 0.08);

      // 还款记录
      const repaymentRecord = isHighRisk ? '严重逾期' :
                              isMediumRisk ? (Math.random() < 0.5 ? '偶尔逾期' : '经常逾期') : '正常';

      // 消费记录
      const consumptionRecord = isHighRisk ? (Math.random() < 0.7 ? '极少消费' : '低消费') :
                                isMediumRisk ? '中消费' : (Math.random() < 0.3 ? '高消费' : '中消费');

      // 电话沟通
      const phoneRecord = isHighRisk ? phoneStatuses[Math.floor(Math.random() * 3)] :
                          isMediumRisk ? phoneStatuses[1] : phoneStatuses[5];

      // 房贷
      const hasMortgage = age > 30 && Math.random() < 0.4;

      // 征信单位
      const creditBureau = isHighRisk ? '多次查询' : (Math.random() < 0.3 ? '偶尔查询' : '正常');

      // 最后还款日期
      const lastRepaymentDate = new Date(now - lastRepaymentDaysAgo * day);

      // 办卡时间
      const cardOpenDate = new Date(now - cardAgeMonths * month);

      return {
        客户编号: `C${String(i + 1).padStart(5, '0')}`,
        性别: gender,
        年龄: age,
        办卡时间: cardOpenDate.toISOString().slice(0, 10),
        办卡单位: org,
        征信单位: creditBureau,
        户籍地址: region + '市',
        居住地址: region + '市' + ['朝阳区', '浦东新区', '天河区', '南山区', '西湖区', '武侯区', '鼓楼区', '渝中区'][Math.floor(Math.random() * 8)],
        信用额度: Math.round(creditLimit),
        还款记录: repaymentRecord,
        消费记录: consumptionRecord,
        是否进线投诉: hasComplaint ? '是' : '否',
        逾期天数: overdueDays,
        最后还款时间: lastRepaymentDate.toISOString().slice(0, 10),
        还款金额: lastRepaymentAmount,
        是否有房贷: hasMortgage ? '是' : '否',
        电话沟通记录: phoneRecord,
        逾期金额: overdueAmount,
        是否有套现: hasCashOut ? '是' : '否',
        套现商家名称: cashOutMerchant
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
      clusters: this.kMeansClustering(clusterCount),
      distributions: {},
      insights: this.generateInsights()
    };

    if (dimensions.includes('age')) results.distributions.age = this.calcDistribution('age', this.getAgeBuckets());
    if (dimensions.includes('gender')) results.distributions.gender = this.calcCategoryDistribution('gender');
    if (dimensions.includes('region')) results.distributions.region = this.calcCategoryDistribution('region');
    if (dimensions.includes('creditLimit')) results.distributions.creditLimit = this.calcDistribution('creditLimit', this.getCreditLimitBuckets());
    if (dimensions.includes('overdue')) results.distributions.overdue = this.calcDistribution('overdueDays', this.getOverdueBuckets());
    if (dimensions.includes('overdueAmount')) results.distributions.overdueAmount = this.calcDistribution('overdueAmount', this.getOverdueAmountBuckets());
    if (dimensions.includes('repayment')) results.distributions.repayment = this.calcCategoryDistribution('repaymentRecord');
    if (dimensions.includes('consumption')) results.distributions.consumption = this.calcCategoryDistribution('consumptionRecord');
    if (dimensions.includes('complaint')) results.distributions.complaint = this.calcCategoryDistribution('hasComplaint');
    if (dimensions.includes('cashOut')) results.distributions.cashOut = this.calcCategoryDistribution('hasCashOut');
    if (dimensions.includes('mortgage')) results.distributions.mortgage = this.calcCategoryDistribution('hasMortgage');
    if (dimensions.includes('cardOrg')) results.distributions.cardOrg = this.calcCategoryDistribution('cardOrg');
    if (dimensions.includes('riskLevel')) results.distributions.riskLevel = this.calcCategoryDistribution('riskLevel');
    if (dimensions.includes('repayAbility')) results.distributions.repayAbility = this.calcDistribution('repayAbilityScore', this.getScoreBuckets());
    if (dimensions.includes('repayWilling')) results.distributions.repayWilling = this.calcDistribution('repayWillingScore', this.getScoreBuckets());
    if (dimensions.includes('cardAge')) results.distributions.cardAge = this.calcDistribution('cardAgeMonths', this.getCardAgeBuckets());
    if (dimensions.includes('phoneStatus')) results.distributions.phoneStatus = this.calcCategoryDistribution('phoneStatus');

    this.clusters = results.clusters;
    return results;
  }

  preprocessData() {
    return this.rawData.map(item => {
      const mapped = {};
      mapped.id = this.getField(item, 'id') || '';
      mapped.gender = this.normalizeGender(this.getField(item, 'gender'));
      mapped.age = this.parseNumber(this.getField(item, 'age'));
      mapped.cardOpenDate = this.parseDate(this.getField(item, 'cardOpenDate'));
      mapped.cardOrg = this.getField(item, 'cardOrg') || '未知';
      mapped.creditBureau = this.getField(item, 'creditBureau') || '正常';
      mapped.householdAddr = this.getField(item, 'householdAddr') || '';
      mapped.residenceAddr = this.getField(item, 'residenceAddr') || '';
      mapped.creditLimit = this.parseNumber(this.getField(item, 'creditLimit'));
      mapped.repaymentRecord = this.getField(item, 'repaymentRecord') || '正常';
      mapped.consumptionRecord = this.getField(item, 'consumptionRecord') || '中消费';
      mapped.hasComplaint = this.normalizeYesNo(this.getField(item, 'complaint'));
      mapped.overdueDays = this.parseNumber(this.getField(item, 'overdueDays'));
      mapped.lastRepaymentDate = this.parseDate(this.getField(item, 'lastRepaymentDate'));
      mapped.lastRepaymentAmount = this.parseNumber(this.getField(item, 'lastRepaymentAmount'));
      mapped.hasMortgage = this.normalizeYesNo(this.getField(item, 'hasMortgage'));
      mapped.phoneRecord = this.getField(item, 'phoneRecord') || '正常沟通';
      mapped.overdueAmount = this.parseNumber(this.getField(item, 'overdueAmount'));
      mapped.hasCashOut = this.normalizeYesNo(this.getField(item, 'hasCashOut'));
      mapped.cashOutMerchant = this.getField(item, 'cashOutMerchant') || '无';

      // 派生字段
      mapped.cardAgeMonths = this.monthsBetween(mapped.cardOpenDate, new Date());
      mapped.daysSinceLastRepayment = this.daysBetween(mapped.lastRepaymentDate, new Date());
      mapped.region = this.extractRegion(mapped.residenceAddr || mapped.householdAddr);
      mapped.overdueRatio = mapped.creditLimit > 0 ? (mapped.overdueAmount / mapped.creditLimit * 100) : 0;
      mapped.repayAmountRatio = mapped.creditLimit > 0 ? (mapped.lastRepaymentAmount / mapped.creditLimit * 100) : 0;

      // 风险评分
      mapped.riskScore = this.calcRiskScore(mapped);
      mapped.riskLevel = this.getRiskLevel(mapped.riskScore);

      // 还款能力评分
      mapped.repayAbilityScore = this.calcRepayAbility(mapped);

      // 还款意愿评分
      mapped.repayWillingScore = this.calcRepayWilling(mapped);

      // 综合评分
      mapped综合评分 = Math.round((100 - mapped.riskScore) * 0.4 + mapped.repayAbilityScore * 0.3 + mapped.repayWillingScore * 0.3);

      // 电话状态分类
      mapped.phoneStatus = this.classifyPhoneStatus(mapped.phoneRecord);

      return mapped;
    }).filter(item => item.age > 0 || item.creditLimit > 0);
  }

  // ========== 工具方法 ==========

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

  monthsBetween(d1, d2) {
    if (!d1 || !d2) return 0;
    return Math.max(1, Math.floor((d2 - d1) / (86400000 * 30)));
  }

  normalizeGender(val) {
    if (!val) return '未知';
    const str = String(val).toLowerCase();
    if (/^(m|male|男|man|1)$/i.test(str)) return '男';
    if (/^(f|female|女|woman|2|0)$/i.test(str)) return '女';
    return '未知';
  }

  normalizeYesNo(val) {
    if (!val) return '否';
    const str = String(val).trim();
    if (/^(是|yes|1|true|有)$/i.test(str)) return '是';
    return '否';
  }

  extractRegion(addr) {
    if (!addr) return '未知';
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '重庆', '西安', '天津', '苏州'];
    for (const city of cities) {
      if (addr.includes(city)) return city;
    }
    return addr.slice(0, 2) + '市';
  }

  classifyPhoneStatus(record) {
    if (!record) return '正常沟通';
    if (record.includes('未接') || record.includes('无法联系')) return '❌ 无法联系';
    if (record.includes('拒绝') || record.includes('态度恶劣')) return '😡 拒绝沟通';
    if (record.includes('承诺')) return '🤝 已承诺还款';
    if (record.includes('方案')) return '📋 已达成方案';
    return '✅ 正常沟通';
  }

  // ========== 风险评分 ==========

  calcRiskScore(d) {
    let score = 0;

    // 逾期天数 (30分)
    if (d.overdueDays > 90) score += 30;
    else if (d.overdueDays > 60) score += 25;
    else if (d.overdueDays > 30) score += 18;
    else if (d.overdueDays > 0) score += 10;

    // 逾期金额占比 (20分)
    if (d.overdueRatio > 80) score += 20;
    else if (d.overdueRatio > 50) score += 15;
    else if (d.overdueRatio > 20) score += 10;
    else if (d.overdueRatio > 0) score += 5;

    // 套现记录 (20分)
    if (d.hasCashOut === '是') score += 20;

    // 投诉记录 (10分)
    if (d.hasComplaint === '是') score += 10;

    // 还款记录 (10分)
    if (d.repaymentRecord === '严重逾期') score += 10;
    else if (d.repaymentRecord === '经常逾期') score += 7;
    else if (d.repaymentRecord === '偶尔逾期') score += 3;

    // 电话沟通 (10分)
    if (d.phoneStatus.includes('无法联系')) score += 10;
    else if (d.phoneStatus.includes('拒绝沟通')) score += 8;
    else if (d.phoneStatus.includes('已承诺')) score += 3;

    return Math.min(100, score);
  }

  getRiskLevel(score) {
    if (score >= 70) return '🔴 高风险';
    if (score >= 40) return '🟡 中风险';
    if (score >= 20) return '🟠 低风险';
    return '🟢 正常';
  }

  // ========== 还款能力 ==========

  calcRepayAbility(d) {
    let score = 0;

    // 信用额度 (高额度说明银行认可)
    if (d.creditLimit >= 80000) score += 25;
    else if (d.creditLimit >= 50000) score += 20;
    else if (d.creditLimit >= 20000) score += 15;
    else score += 8;

    // 有房贷说明有资产
    if (d.hasMortgage === '是') score += 15;

    // 还款金额占比
    if (d.repayAmountRatio >= 50) score += 25;
    else if (d.repayAmountRatio >= 20) score += 18;
    else if (d.repayAmountRatio >= 10) score += 10;
    else score += 3;

    // 消费能力
    if (d.consumptionRecord === '高消费') score += 20;
    else if (d.consumptionRecord === '中消费') score += 15;
    else if (d.consumptionRecord === '低消费') score += 8;
    else score += 3;

    // 年龄（中年更有还款能力）
    if (d.age >= 30 && d.age <= 50) score += 15;
    else if (d.age >= 25) score += 10;
    else score += 5;

    return Math.min(100, score);
  }

  // ========== 还款意愿 ==========

  calcRepayWilling(d) {
    let score = 0;

    // 还款记录 (30分)
    if (d.repaymentRecord === '正常') score += 30;
    else if (d.repaymentRecord === '偶尔逾期') score += 18;
    else if (d.repaymentRecord === '经常逾期') score += 8;
    else score += 0;

    // 最近还款时间 (20分)
    if (d.daysSinceLastRepayment <= 7) score += 20;
    else if (d.daysSinceLastRepayment <= 15) score += 15;
    else if (d.daysSinceLastRepayment <= 30) score += 10;
    else score += 3;

    // 电话沟通态度 (20分)
    if (d.phoneStatus.includes('正常沟通')) score += 20;
    else if (d.phoneStatus.includes('已达成方案')) score += 18;
    else if (d.phoneStatus.includes('已承诺')) score += 12;
    else if (d.phoneStatus.includes('拒绝沟通')) score += 3;
    else score += 0;

    // 是否有投诉 (15分)
    if (d.hasComplaint === '否') score += 15;
    else score += 3;

    // 套现行为 (15分)
    if (d.hasCashOut === '否') score += 15;
    else score += 0;

    return Math.min(100, score);
  }

  // ========== 概览 ==========

  calcOverview() {
    const d = this.processedData;
    const avg = (arr, fn) => arr.length ? (arr.reduce((s, x) => s + fn(x), 0) / arr.length) : 0;

    return {
      total: d.length,
      avgAge: avg(d, x => x.age).toFixed(1),
      avgCreditLimit: avg(d, x => x.creditLimit).toFixed(0),
      avgOverdueDays: avg(d, x => x.overdueDays).toFixed(1),
      avgOverdueAmount: avg(d, x => x.overdueAmount).toFixed(0),
      avgRiskScore: avg(d, x => x.riskScore).toFixed(1),
      avgRepayAbility: avg(d, x => x.repayAbilityScore).toFixed(1),
      avgRepayWilling: avg(d, x => x.repayWillingScore).toFixed(1),
      overdueCount: d.filter(x => x.overdueDays > 0).length,
      overdueRate: (d.filter(x => x.overdueDays > 0).length / d.length * 100).toFixed(1),
      cashOutCount: d.filter(x => x.hasCashOut === '是').length,
      cashOutRate: (d.filter(x => x.hasCashOut === '是').length / d.length * 100).toFixed(1),
      complaintCount: d.filter(x => x.hasComplaint === '是').length,
      complaintRate: (d.filter(x => x.hasComplaint === '是').length / d.length * 100).toFixed(1),
      highRiskCount: d.filter(x => x.riskScore >= 70).length,
      mortgageCount: d.filter(x => x.hasMortgage === '是').length,
      genderRatio: { male: d.filter(x => x.gender === '男').length, female: d.filter(x => x.gender === '女').length },
      severeOverdue: d.filter(x => x.overdueDays > 90).length
    };
  }

  // ========== 聚类 ==========

  kMeansClustering(k) {
    const data = this.processedData;
    if (data.length < k) return [];

    const features = data.map(d => [
      d.age, d.creditLimit, d.overdueDays, d.overdueAmount,
      d.riskScore, d.repayAbilityScore, d.repayWillingScore,
      d.lastRepaymentAmount, d.cardAgeMonths
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
    return features.map(row => row.map((val, i) => maxs[i] === mins[i] ? 0 : (val - mins[i]) / (maxs[i] - mins[i])));
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

    const personaConfig = [
      { name: '优质客户', emoji: '👑', color: '#00b894' },
      { name: '成长型客户', emoji: '🚀', color: '#6c5ce7' },
      { name: '风险预警客户', emoji: '⚠️', color: '#fdcb6e' },
      { name: '高危客户', emoji: '🚨', color: '#e17055' },
      { name: '套现嫌疑客户', emoji: '🔍', color: '#fd79a8' },
      { name: '沉睡客户', emoji: '😴', color: '#636e72' },
      { name: '新客户', emoji: '🌱', color: '#74b9ff' },
      { name: '特殊关注客户', emoji: '👁️', color: '#a29bfe' }
    ];

    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      if (c.members.length === 0) continue;

      const cfg = personaConfig[i] || { name: `群体${i + 1}`, emoji: '👤', color: '#74b9ff' };
      const avg = (fn) => c.members.length ? (c.members.reduce((s, m) => s + fn(m), 0) / c.members.length) : 0;

      c.label = cfg.name;
      c.emoji = cfg.emoji;
      c.color = cfg.color;
      c.percentage = ((c.members.length / data.length) * 100).toFixed(1);

      c.avgAge = avg(m => m.age).toFixed(1);
      c.avgCreditLimit = avg(m => m.creditLimit).toFixed(0);
      c.avgOverdueDays = avg(m => m.overdueDays).toFixed(1);
      c.avgOverdueAmount = avg(m => m.overdueAmount).toFixed(0);
      c.avgRiskScore = avg(m => m.riskScore).toFixed(1);
      c.avgRepayAbility = avg(m => m.repayAbilityScore).toFixed(1);
      c.avgRepayWilling = avg(m => m.repayWillingScore).toFixed(1);
      c.avgRepaymentAmount = avg(m => m.lastRepaymentAmount).toFixed(0);
      c.avgCardAge = avg(m => m.cardAgeMonths).toFixed(0);
      c.genderRatio = { male: c.members.filter(m => m.gender === '男').length, female: c.members.filter(m => m.gender === '女').length };
      c.overdueRate = (c.members.filter(m => m.overdueDays > 0).length / c.members.length * 100).toFixed(1);
      c.cashOutRate = (c.members.filter(m => m.hasCashOut === '是').length / c.members.length * 100).toFixed(1);
      c.complaintRate = (c.members.filter(m => m.hasComplaint === '是').length / c.members.length * 100).toFixed(1);
      c.mortgageRate = (c.members.filter(m => m.hasMortgage === '是').length / c.members.length * 100).toFixed(1);
      c.topOrgs = this.getTopItems(c.members, 'cardOrg', 3);
      c.topRegions = this.getTopItems(c.members, 'region', 3);
      c.topRepayment = this.getTopItems(c.members, 'repaymentRecord', 3);
      c.topConsumption = this.getTopItems(c.members, 'consumptionRecord', 3);
      c.topPhoneStatus = this.getTopItems(c.members, 'phoneStatus', 3);

      c.description = this.generateDescription(c);
      c.strategy = this.generateStrategy(c);
      c.urgentActions = this.generateUrgentActions(c);
    }

    return clusters.filter(c => c.members.length > 0);
  }

  generateDescription(c) {
    const risk = parseFloat(c.avgRiskScore);
    const ability = parseFloat(c.avgRepayAbility);
    const willing = parseFloat(c.avgRepayWilling);
    let desc = '';

    if (risk >= 70) desc += '高风险客群，';
    else if (risk >= 40) desc += '中等风险客群，';
    else desc += '低风险客群，';

    if (ability >= 70) desc += '还款能力强';
    else if (ability >= 40) desc += '还款能力中等';
    else desc += '还款能力较弱';

    if (willing >= 70) desc += '，还款意愿积极';
    else if (willing >= 40) desc += '，还款意愿一般';
    else desc += '，还款意愿消极';

    return desc;
  }

  generateStrategy(c) {
    const risk = parseFloat(c.avgRiskScore);
    const willing = parseFloat(c.avgRepayWilling);
    const strategies = [];

    if (risk >= 70) {
      strategies.push('加强催收力度，缩短跟进周期');
      strategies.push('限制额度使用，防止进一步损失');
      if (parseFloat(c.cashOutRate) > 30) strategies.push('排查套现行为，必要时冻结账户');
    } else if (risk >= 40) {
      strategies.push('定期电话跟进，了解还款计划');
      strategies.push('提供分期还款方案，降低还款压力');
    } else {
      strategies.push('维护良好关系，提升客户满意度');
      strategies.push('推荐额度提升或增值产品');
    }

    if (willing < 40) strategies.push('重点关注还款意愿，必要时法律介入');
    if (parseFloat(c.complaintRate) > 20) strategies.push('优先处理投诉，改善服务体验');

    return strategies;
  }

  generateUrgentActions(c) {
    const actions = [];
    const severeOverdue = c.members.filter(m => m.overdueDays > 90).length;
    const cashOut = c.members.filter(m => m.hasCashOut === '是').length;
    const unreachable = c.members.filter(m => m.phoneStatus.includes('无法联系')).length;

    if (severeOverdue > 0) actions.push(`🔴 ${severeOverdue}人逾期超90天，需立即催收`);
    if (cashOut > 0) actions.push(`🟡 ${cashOut}人疑似套现，需风控排查`);
    if (unreachable > 0) actions.push(`🟠 ${unreachable}人无法联系，需多渠道触达`);

    return actions;
  }

  getTopItems(data, field, n) {
    const counts = {};
    data.forEach(d => {
      const val = d[field];
      if (val && val !== '未知' && val !== '无') counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([name, count]) => ({ name, count, pct: ((count / data.length) * 100).toFixed(1) }));
  }

  // ========== 智能洞察 ==========

  generateInsights() {
    const d = this.processedData;
    const insights = [];

    const severeOverdue = d.filter(x => x.overdueDays > 90);
    if (severeOverdue.length > 0) {
      const totalAmount = severeOverdue.reduce((s, x) => s + x.overdueAmount, 0);
      insights.push({
        type: 'danger', icon: '🚨',
        title: '严重逾期预警',
        text: `${severeOverdue.length} 人逾期超90天，逾期总额 ¥${totalAmount.toLocaleString()}，建议立即启动催收`
      });
    }

    const cashOut = d.filter(x => x.hasCashOut === '是');
    if (cashOut.length > 0) {
      const merchants = {};
      cashOut.forEach(x => { if (x.cashOutMerchant !== '无') merchants[x.cashOutMerchant] = (merchants[x.cashOutMerchant] || 0) + 1; });
      const topMerchant = Object.entries(merchants).sort((a, b) => b[1] - a[1])[0];
      insights.push({
        type: 'warning', icon: '🔍',
        title: '套现风险',
        text: `${cashOut.length} 人疑似套现（${(cashOut.length / d.length * 100).toFixed(1)}%）${topMerchant ? '，高频商户：' + topMerchant[0] : ''}`
      });
    }

    const complaints = d.filter(x => x.hasComplaint === '是');
    if (complaints.length > 0) {
      insights.push({
        type: 'warning', icon: '📢',
        title: '投诉客户',
        text: `${complaints.length} 人有投诉记录（${(complaints.length / d.length * 100).toFixed(1)}%），需关注服务质量`
      });
    }

    const unreachable = d.filter(x => x.phoneStatus.includes('无法联系'));
    if (unreachable.length > 0) {
      insights.push({
        type: 'danger', icon: '📵',
        title: '失联客户',
        text: `${unreachable.length} 人无法联系，建议通过户籍/居住地址多渠道触达`
      });
    }

    const highRisk = d.filter(x => x.riskScore >= 70);
    if (highRisk.length > 0) {
      const totalExposure = highRisk.reduce((s, x) => s + x.overdueAmount, 0);
      insights.push({
        type: 'danger', icon: '⚠️',
        title: '高风险客户',
        text: `${highRisk.length} 人风险评分≥70，总风险敞口 ¥${totalExposure.toLocaleString()}`
      });
    }

    const goodCustomers = d.filter(x => x.riskScore < 20 && x.repayWillingScore >= 70);
    if (goodCustomers.length > 0) {
      insights.push({
        type: 'success', icon: '👑',
        title: '优质客户',
        text: `${goodCustomers.length} 人低风险高还款意愿，可推荐额度提升或交叉销售`
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

  // ========== 分桶 ==========

  getAgeBuckets() {
    return [
      { label: '22-30', min: 22, max: 31 }, { label: '31-40', min: 31, max: 41 },
      { label: '41-50', min: 41, max: 51 }, { label: '51-60', min: 51, max: 61 }
    ];
  }

  getCreditLimitBuckets() {
    return [
      { label: '0-1万', min: 0, max: 10000 }, { label: '1万-3万', min: 10000, max: 30000 },
      { label: '3万-5万', min: 30000, max: 50000 }, { label: '5万-10万', min: 50000, max: 100000 },
      { label: '10万+', min: 100000, max: Infinity }
    ];
  }

  getOverdueBuckets() {
    return [
      { label: '无逾期', min: 0, max: 1 }, { label: '1-30天', min: 1, max: 31 },
      { label: '31-60天', min: 31, max: 61 }, { label: '61-90天', min: 61, max: 91 },
      { label: '90天以上', min: 91, max: Infinity }
    ];
  }

  getOverdueAmountBuckets() {
    return [
      { label: '0', min: 0, max: 1 }, { label: '1-5千', min: 1, max: 5000 },
      { label: '5千-2万', min: 5000, max: 20000 }, { label: '2万-5万', min: 20000, max: 50000 },
      { label: '5万+', min: 50000, max: Infinity }
    ];
  }

  getScoreBuckets() {
    return [
      { label: '0-20', min: 0, max: 21 }, { label: '21-40', min: 21, max: 41 },
      { label: '41-60', min: 41, max: 61 }, { label: '61-80', min: 61, max: 81 },
      { label: '81-100', min: 81, max: 101 }
    ];
  }

  getCardAgeBuckets() {
    return [
      { label: '0-6月', min: 0, max: 7 }, { label: '6-12月', min: 7, max: 13 },
      { label: '1-3年', min: 13, max: 37 }, { label: '3-5年', min: 37, max: 61 },
      { label: '5年+', min: 61, max: Infinity }
    ];
  }

  // ========== 导出 ==========

  exportReport(results) {
    const report = {
      title: '信用卡客户画像分析报告',
      generatedAt: new Date().toISOString(),
      summary: results.overview,
      insights: results.insights,
      clusters: results.clusters.map(c => ({
        name: c.label, description: c.description, strategy: c.strategy,
        urgentActions: c.urgentActions, percentage: c.percentage + '%',
        avgRiskScore: c.avgRiskScore, avgRepayAbility: c.avgRepayAbility,
        avgRepayWilling: c.avgRepayWilling, overdueRate: c.overdueRate + '%',
        cashOutRate: c.cashOutRate + '%'
      })),
      distributions: results.distributions
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `信用卡客户画像报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.CustomerAnalyzer = CustomerAnalyzer;

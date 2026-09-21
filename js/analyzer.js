/**
 * 信用卡催收回款分析引擎
 * 核心目标：回款率预测 + 催收策略匹配 + 法诉资源最优分配
 * 合作资源：南海区人民法院、调解平台、法院和解中心、法院线路、律所律师函
 */

class CustomerAnalyzer {
  constructor() {
    this.rawData = [];
    this.processedData = [];
    this.clusters = [];
    this.fieldMapping = {};

    // 催收工具定义
    this.collectionTools = {
      mediationPlatform: {
        name: '人民法院调解平台立案',
        icon: '⚖️',
        cost: '低',
        cycle: '15-30天',
        suitableFor: '有调解意愿、逾期3月+本金>5K',
        description: '通过人民法院调解平台进行诉调立案，施加法律压力'
      },
      courtMediation: {
        name: '法院和解中心调解',
        icon: '🏛️',
        cost: '中',
        cycle: '7-15天',
        suitableFor: '本地客户、有还款能力但态度消极',
        description: '前往法院和解中心进行面对面调解'
      },
      courtCall: {
        name: '法院线路电话调解',
        icon: '📞',
        cost: '低',
        cycle: '1-3天',
        suitableFor: '能联系上、有一定还款意愿',
        description: '借助法院专线致电客户，确认是否接受调解'
      },
      lawyerLetter: {
        name: '律所律师函',
        icon: '📜',
        cost: '中',
        cycle: '7-10天',
        suitableFor: '有资产（房贷等）、重视征信',
        description: '委托律所寄送律师函，正式法律告知'
      }
    };
  }

  // ========== 数据解析 ==========

  parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (results) => { this.rawData = results.data; this.autoMapFields(); resolve(this.rawData); },
        error: (err) => reject(err)
      });
    });
  }

  parseJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => { try { const data = JSON.parse(e.target.result); this.rawData = Array.isArray(data) ? data : [data]; this.autoMapFields(); resolve(this.rawData); } catch (err) { reject(err); } };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  autoMapFields() {
    if (this.rawData.length === 0) return;
    const fields = Object.keys(this.rawData[0]);
    const mapping = {};
    const rules = {
      id: /^id|编号|客户id|card.?id|案件号|case.?no/i,
      name: /^name|姓名|客户姓名/i,
      cardOpenDate: /^办卡时间|开卡日期|card.?open|发卡日期/i,
      cardOrg: /^办卡单位|发卡行|card.?org|银行|机构/i,
      creditBureau: /^征信|credit.?bureau|征信单位|查询机构/i,
      householdAddr: /^户籍|户口|household|籍贯/i,
      residenceAddr: /^居住|住址|residence|现住|地址/i,
      creditLimit: /^信用额度|额度|credit.?limit|授信|本金/i,
      repaymentRecord: /^还款记录|还款情况|repayment.?record/i,
      consumptionRecord: /^消费记录|消费情况|consumption/i,
      complaint: /^投诉|进线|complaint|是否投诉/i,
      overdueDays: /^逾期时间|逾期天数|overdue.?days|逾期月数|逾期/i,
      lastRepaymentDate: /^最后还款|最近还款|last.?repayment/i,
      lastRepaymentAmount: /^还款金额|最后还款金额|repayment.?amount/i,
      hasMortgage: /^房贷|mortgage|是否有房贷|房屋贷款/i,
      phoneRecord: /^电话|沟通记录|phone.?record|通话|催收记录/i,
      overdueAmount: /^逾期金额|信用卡逾期|overdue.?amount|欠款/i,
      hasCashOut: /^套现|cash.?out|是否有套现|疑似套现/i,
      cashOutMerchant: /^套现商家|套现商户|cash.?merchant/i,
      gender: /^性别|gender|sex/i,
      age: /^年龄|age/i,
      phone: /^手机|电话号码|phone|tel|联系/i,
      principal: /^本金|principal|欠款本金/i
    };
    for (const field of fields) {
      for (const [key, pattern] of Object.entries(rules)) {
        if (pattern.test(field) && !mapping[key]) { mapping[key] = field; break; }
      }
    }
    this.fieldMapping = mapping;
  }

  // ========== 示例数据（催收场景）==========

  loadSampleData() {
    const now = Date.now();
    const day = 86400000;
    const orgs = ['工商银行', '建设银行', '招商银行', '平安银行', '中信银行'];
    const genders = ['男', '女'];
    const regions = ['佛山南海', '佛山禅城', '广州天河', '深圳南山', '东莞', '中山', '珠海', '惠州'];
    const merchants = ['某商贸公司', '某科技公司', '某贸易商行', '无'];
    const repaymentStatuses = ['正常', '偶尔逾期', '经常逾期', '严重逾期'];
    const consumptionLevels = ['高消费', '中消费', '低消费', '极少消费'];
    const phoneStatuses = ['多次未接', '已联系承诺还款', '拒绝沟通', '已达成方案', '无法联系', '空号/停机', '正常沟通'];
    const mediationStatuses = ['未立案', '已立案待调解', '调解中', '调解成功', '调解失败'];

    this.rawData = Array.from({ length: 300 }, (_, i) => {
      const age = Math.floor(Math.random() * 35) + 25;
      const gender = genders[Math.floor(Math.random() * 2)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const org = orgs[Math.floor(Math.random() * orgs.length)];

      // 风险分层
      const tier = Math.random();
      const isSevere = tier < 0.15;    // 严重逾期
      const isHigh = tier < 0.30;      // 高风险
      const isMedium = tier < 0.55;    // 中风险

      // 逾期 2-6 个月为主（催收目标客群）
      const overdueMonths = isSevere ? (Math.floor(Math.random() * 4) + 4) :
                            isHigh ? (Math.floor(Math.random() * 3) + 3) :
                            isMedium ? (Math.floor(Math.random() * 3) + 2) :
                            (Math.floor(Math.random() * 2) + 1);
      const overdueDays = overdueMonths * 30 + Math.floor(Math.random() * 25);

      // 本金 > 5000 的占多数
      const principal = isSevere ? (Math.floor(Math.random() * 80000) + 10000) :
                        isHigh ? (Math.floor(Math.random() * 50000) + 8000) :
                        (Math.floor(Math.random() * 30000) + 3000);

      const creditLimit = principal + Math.floor(Math.random() * 20000);
      const overdueAmount = Math.floor(principal * (0.5 + Math.random() * 0.5));

      // 催收历史
      const collectionAttempts = isSevere ? Math.floor(Math.random() * 10) + 5 :
                                 isHigh ? Math.floor(Math.random() * 8) + 3 :
                                 Math.floor(Math.random() * 5) + 1;

      const phoneStatus = isSevere ? (Math.random() < 0.4 ? '无法联系' : Math.random() < 0.3 ? '空号/停机' : phoneStatuses[Math.floor(Math.random() * 4)]) :
                          isHigh ? phoneStatuses[Math.floor(Math.random() * 5)] :
                          phoneStatuses[Math.floor(Math.random() * 3) + 4];

      const lastRepaymentDaysAgo = isSevere ? (Math.floor(Math.random() * 90) + 30) :
                                   isHigh ? (Math.floor(Math.random() * 60) + 10) :
                                   (Math.floor(Math.random() * 30) + 1);

      const lastRepaymentAmount = isSevere ? Math.floor(principal * Math.random() * 0.05) :
                                  isHigh ? Math.floor(principal * (0.05 + Math.random() * 0.15)) :
                                  Math.floor(principal * (0.1 + Math.random() * 0.3));

      const hasCashOut = isSevere ? (Math.random() < 0.4) : (Math.random() < 0.08);
      const hasComplaint = isSevere ? (Math.random() < 0.3) : (Math.random() < 0.05);
      const hasMortgage = age > 32 && Math.random() < 0.45;
      const consumptionRecord = isSevere ? '极少消费' : isHigh ? '低消费' : (Math.random() < 0.3 ? '高消费' : '中消费');
      const repaymentRecord = isSevere ? '严重逾期' : isHigh ? '经常逾期' : isMedium ? '偶尔逾期' : '正常';

      // 法诉相关
      const mediationStatus = overdueDays >= 90 && principal >= 5000 ?
        (Math.random() < 0.3 ? '已立案待调解' : Math.random() < 0.1 ? '调解中' : '未立案') : '未立案';

      const lawyerLetterSent = overdueDays >= 60 && Math.random() < 0.3;

      const lastContactDaysAgo = phoneStatus === '无法联系' ? (Math.floor(Math.random() * 30) + 10) :
                                  phoneStatus === '空号/停机' ? (Math.floor(Math.random() * 60) + 20) :
                                  (Math.floor(Math.random() * 10));

      return {
        客户编号: `C${String(i + 1).padStart(5, '0')}`,
        姓名: `客户${i + 1}`,
        性别: gender,
        年龄: age,
        手机号码: `1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        办卡时间: new Date(now - (Math.floor(Math.random() * 120) + 6) * 30 * day).toISOString().slice(0, 10),
        办卡单位: org,
        征信单位: isSevere ? '多次查询' : '正常',
        户籍地址: region,
        居住地址: region + (Math.random() < 0.5 ? '区桂城街道' : '区大沥镇'),
        信用额度: creditLimit,
        本金: principal,
        还款记录: repaymentRecord,
        消费记录: consumptionRecord,
        是否进线投诉: hasComplaint ? '是' : '否',
        逾期天数: overdueDays,
        最后还款时间: new Date(now - lastRepaymentDaysAgo * day).toISOString().slice(0, 10),
        还款金额: lastRepaymentAmount,
        是否有房贷: hasMortgage ? '是' : '否',
        电话沟通记录: phoneStatus,
        逾期金额: overdueAmount,
        是否有套现: hasCashOut ? '是' : '否',
        套现商家名称: hasCashOut ? merchants[Math.floor(Math.random() * 3)] : '无',
        催收次数: collectionAttempts,
        最后联系天数: lastContactDaysAgo,
        法诉状态: mediationStatus,
        是否已发律师函: lawyerLetterSent ? '是' : '否'
      };
    });

    this.autoMapFields();
    return this.rawData;
  }

  // ========== 核心分析 ==========

  analyze(clusterCount) {
    this.processedData = this.preprocessData();

    const results = {
      total: this.processedData.length,
      overview: this.calcOverview(),
      clusters: this.kMeansClustering(clusterCount),
      collectionPlan: this.generateCollectionPlan(),
      priorityQueue: this.generatePriorityQueue(),
      courtScreening: this.screenForCourt(),
      insights: this.generateInsights()
    };

    this.clusters = results.clusters;
    return results;
  }

  preprocessData() {
    return this.rawData.map(item => {
      const m = {};
      m.id = this.getField(item, 'id') || '';
      m.name = this.getField(item, 'name') || '';
      m.gender = this.normalizeGender(this.getField(item, 'gender'));
      m.age = this.parseNumber(this.getField(item, 'age'));
      m.phone = this.getField(item, 'phone') || '';
      m.cardOpenDate = this.parseDate(this.getField(item, 'cardOpenDate'));
      m.cardOrg = this.getField(item, 'cardOrg') || '未知';
      m.creditBureau = this.getField(item, 'creditBureau') || '正常';
      m.householdAddr = this.getField(item, 'householdAddr') || '';
      m.residenceAddr = this.getField(item, 'residenceAddr') || '';
      m.creditLimit = this.parseNumber(this.getField(item, 'creditLimit'));
      m.principal = this.parseNumber(this.getField(item, 'principal')) || m.creditLimit;
      m.repaymentRecord = this.getField(item, 'repaymentRecord') || '正常';
      m.consumptionRecord = this.getField(item, 'consumptionRecord') || '中消费';
      m.hasComplaint = this.normalizeYesNo(this.getField(item, 'complaint'));
      m.overdueDays = this.parseNumber(this.getField(item, 'overdueDays'));
      m.lastRepaymentDate = this.parseDate(this.getField(item, 'lastRepaymentDate'));
      m.lastRepaymentAmount = this.parseNumber(this.getField(item, 'lastRepaymentAmount'));
      m.hasMortgage = this.normalizeYesNo(this.getField(item, 'hasMortgage'));
      m.phoneRecord = this.getField(item, 'phoneRecord') || '正常沟通';
      m.overdueAmount = this.parseNumber(this.getField(item, 'overdueAmount'));
      m.hasCashOut = this.normalizeYesNo(this.getField(item, 'hasCashOut'));
      m.cashOutMerchant = this.getField(item, 'cashOutMerchant') || '无';
      m.collectionAttempts = this.parseNumber(this.getField(item, 'collectionAttempts'));
      m.lastContactDays = this.parseNumber(this.getField(item, 'lastContactDays'));
      m.mediationStatus = this.getField(item, 'mediationStatus') || '未立案';
      m.lawyerLetterSent = this.normalizeYesNo(this.getField(item, 'lawyerLetterSent'));

      // 派生字段
      m.overdueMonths = Math.floor(m.overdueDays / 30);
      m.overdueRatio = m.creditLimit > 0 ? (m.overdueAmount / m.creditLimit * 100) : 0;
      m.repayAmountRatio = m.creditLimit > 0 ? (m.lastRepaymentAmount / m.creditLimit * 100) : 0;
      m.region = this.extractRegion(m.residenceAddr || m.householdAddr);
      m.phoneStatus = this.classifyPhoneStatus(m.phoneRecord);

      // === 核心评分 ===
      // 回款率预测 (0-100)
      m.recoveryRate = this.predictRecoveryRate(m);

      // 催收难度 (0-100, 越高越难)
      m.collectionDifficulty = this.calcCollectionDifficulty(m);

      // 法诉适配度 (0-100)
      m.courtSuitability = this.calcCourtSuitability(m);

      // 催收优先级分 (越高越优先)
      m.priorityScore = this.calcPriorityScore(m);

      // 最优催收策略
      m.bestStrategy = this.determineBestStrategy(m);

      // 预计回款金额
      m.expectedRecovery = Math.round(m.overdueAmount * m.recoveryRate / 100);

      return m;
    }).filter(item => item.principal > 0);
  }

  // ========== 回款率预测 ==========

  predictRecoveryRate(d) {
    let score = 50; // 基准

    // 正向因子（提高回款率）
    if (d.hasMortgage === '是') score += 15;
    if (d.phoneStatus === '✅ 正常沟通' || d.phoneStatus === '📋 已达成方案') score += 12;
    if (d.phoneStatus === '🤝 已承诺还款') score += 8;
    if (d.repaymentRecord === '正常' || d.repaymentRecord === '偶尔逾期') score += 10;
    if (d.lastRepaymentAmount > d.principal * 0.1) score += 8;
    if (d.lastRepaymentDays <= 15) score += 10;
    if (d.age >= 30 && d.age <= 50) score += 5;
    if (d.consumptionRecord === '高消费' || d.consumptionRecord === '中消费') score += 5;
    if (d.hasCashOut === '否') score += 5;
    if (d.hasComplaint === '否') score += 3;
    if (d.principal >= 10000 && d.principal <= 50000) score += 3;

    // 负向因子（降低回款率）
    if (d.phoneStatus === '❌ 无法联系' || d.phoneStatus === '📵 空号/停机') score -= 20;
    if (d.phoneStatus === '😡 拒绝沟通') score -= 15;
    if (d.overdueDays > 180) score -= 15;
    if (d.overdueDays > 120) score -= 8;
    if (d.repaymentRecord === '严重逾期') score -= 12;
    if (d.hasCashOut === '是') score -= 10;
    if (d.hasComplaint === '是') score -= 5;
    if (d.lastRepaymentDays > 60) score -= 10;
    if (d.collectionAttempts > 8) score -= 8;
    if (d.creditBureau === '多次查询') score -= 5;

    return Math.max(5, Math.min(95, score));
  }

  // ========== 催收难度 ==========

  calcCollectionDifficulty(d) {
    let score = 0;
    if (d.phoneStatus === '❌ 无法联系') score += 30;
    else if (d.phoneStatus === '📵 空号/停机') score += 35;
    else if (d.phoneStatus === '😡 拒绝沟通') score += 25;
    else if (d.phoneStatus === '🤝 已承诺还款') score += 5;
    else if (d.phoneStatus === '📋 已达成方案') score += 0;

    if (d.overdueDays > 180) score += 20;
    else if (d.overdueDays > 120) score += 12;
    else if (d.overdueDays > 90) score += 6;

    if (d.repaymentRecord === '严重逾期') score += 15;
    if (d.hasCashOut === '是') score += 10;
    if (d.hasComplaint === '是') score += 8;
    if (d.collectionAttempts > 6) score += 10;
    if (d.lastRepaymentAmount < d.principal * 0.02) score += 8;
    if (d.hasMortgage === '否') score -= 5;

    return Math.max(0, Math.min(100, score));
  }

  // ========== 法诉适配度 ==========

  calcCourtSuitability(d) {
    let score = 0;

    // 硬性条件
    if (d.overdueDays >= 90) score += 30;
    else if (d.overdueDays >= 60) score += 10;
    else score -= 20;

    if (d.principal >= 5000) score += 25;
    else if (d.principal >= 3000) score += 10;
    else score -= 20;

    // 软性条件
    if (d.hasMortgage === '是') score += 15;
    if (d.phoneStatus === '😡 拒绝沟通') score += 10;
    if (d.phoneStatus === '❌ 无法联系' || d.phoneStatus === '📵 空号/停机') score += 8;
    if (d.repaymentRecord === '严重逾期' || d.repaymentRecord === '经常逾期') score += 8;
    if (d.hasCashOut === '是') score += 5;
    if (d.collectionAttempts >= 5) score += 8;
    if (d.lastRepaymentDays > 60) score += 5;

    // 已在调解中减分
    if (d.mediationStatus === '已立案待调解' || d.mediationStatus === '调解中') score -= 30;
    if (d.lawyerLetterSent === '是') score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  // ========== 催收优先级 ==========

  calcPriorityScore(d) {
    // 优先级 = 逾期金额 × 回款可能性 × 时间紧迫度
    const amountWeight = Math.log10(Math.max(1, d.overdueAmount)) * 15;
    const recoveryWeight = d.recoveryRate * 0.5;
    const urgencyWeight = d.overdueDays >= 90 && d.overdueDays <= 120 ? 25 :
                          d.overdueDays > 120 && d.overdueDays <= 180 ? 20 :
                          d.overdueDays > 180 ? 10 : 15;
    const difficultyPenalty = d.collectionDifficulty * 0.2;

    return Math.round(amountWeight + recoveryWeight + urgencyWeight - difficultyPenalty);
  }

  // ========== 最优策略匹配 ==========

  determineBestStrategy(d) {
    const strategies = [];
    const reasons = [];

    // 法院调解平台立案（逾期≥3月 + 本金≥5K）
    if (d.overdueDays >= 90 && d.principal >= 5000 && d.mediationStatus === '未立案') {
      const score = d.courtSuitability;
      strategies.push({
        tool: 'mediationPlatform',
        ...this.collectionTools.mediationPlatform,
        score: score,
        priority: score >= 60 ? '🔴 高优' : score >= 40 ? '🟡 中优' : '🟢 常规',
        reason: `逾期${d.overdueMonths}月，本金¥${d.principal.toLocaleString()}，符合法诉条件`
      });
    }

    // 法院和解中心调解（本地客户 + 有还款能力但消极）
    if (d.overdueDays >= 60 && d.region.includes('佛山') &&
        (d.phoneStatus === '😡 拒绝沟通' || d.phoneStatus === '🤝 已承诺还款') &&
        d.mediationStatus !== '调解中' && d.mediationStatus !== '调解成功') {
      strategies.push({
        tool: 'courtMediation',
        ...this.collectionTools.courtMediation,
        score: d.courtSuitability + 10,
        priority: '🟡 中优',
        reason: `本地客户（${d.region}），${d.phoneStatus === '😡 拒绝沟通' ? '态度消极需当面施压' : '已有承诺需落实'}`
      });
    }

    // 法院线路电话（能联系上 + 有调解空间）
    if ((d.phoneStatus === '✅ 正常沟通' || d.phoneStatus === '🤝 已承诺还款') &&
        d.overdueDays >= 60 && d.mediationStatus === '未立案') {
      strategies.push({
        tool: 'courtCall',
        ...this.collectionTools.courtCall,
        score: d.recoveryRate,
        priority: d.recoveryRate >= 60 ? '🟡 中优' : '🟢 常规',
        reason: `${d.phoneStatus === '🤝 已承诺还款' ? '已有还款承诺' : '可正常联系'}，通过法院线路确认调解意愿`
      });
    }

    // 律师函（有资产 / 重视征信 / 高额度）
    if (d.overdueDays >= 60 && d.lawyerLetterSent === '否' &&
        (d.hasMortgage === '是' || d.creditLimit >= 30000 || d.age >= 35)) {
      strategies.push({
        tool: 'lawyerLetter',
        ...this.collectionTools.lawyerLetter,
        score: d.recoveryRate + (d.hasMortgage === '是' ? 15 : 0),
        priority: d.hasMortgage === '是' ? '🟡 中优' : '🟢 常规',
        reason: `${d.hasMortgage === '是' ? '有房贷资产' : '高额度客户'}，律师函施压促还款`
      });
    }

    // 按分数排序
    strategies.sort((a, b) => b.score - a.score);

    return {
      primary: strategies[0] || null,
      secondary: strategies[1] || null,
      all: strategies,
      stepPlan: this.generateStepPlan(d, strategies)
    };
  }

  // ========== 分步催收方案 ==========

  generateStepPlan(d, strategies) {
    const steps = [];
    let dayOffset = 0;

    // Step 1: 电话确认（如果有联系方式）
    if (d.phoneStatus !== '❌ 无法联系' && d.phoneStatus !== '📵 空号/停机') {
      steps.push({
        day: dayOffset,
        action: '📞 电话沟通',
        detail: '确认客户现状，告知法律后果，询问调解意愿',
        expectedOutcome: '确认客户态度，筛选可调解客户'
      });
      dayOffset += 3;
    }

    // Step 2: 律师函
    if (strategies.some(s => s.tool === 'lawyerLetter')) {
      steps.push({
        day: dayOffset,
        action: '📜 寄送律师函',
        detail: '委托律所寄送正式律师函，限定7日内回复',
        expectedOutcome: '施加法律压力，促使主动联系'
      });
      dayOffset += 10;
    }

    // Step 3: 法院线路电话
    if (strategies.some(s => s.tool === 'courtCall')) {
      steps.push({
        day: dayOffset,
        action: '📞 法院专线致电',
        detail: '通过法院线路致电，确认是否接受调解',
        expectedOutcome: '借助法院权威，提升调解意愿'
      });
      dayOffset += 3;
    }

    // Step 4: 调解平台立案
    if (strategies.some(s => s.tool === 'mediationPlatform')) {
      steps.push({
        day: dayOffset,
        action: '⚖️ 调解平台立案',
        detail: '通过人民法院调解平台进行诉调立案',
        expectedOutcome: '正式进入法律程序，15-30天出调解结果'
      });
      dayOffset += 20;
    }

    // Step 5: 法院和解中心
    if (strategies.some(s => s.tool === 'courtMediation')) {
      steps.push({
        day: dayOffset,
        action: '🏛️ 法院和解中心调解',
        detail: '安排客户前往法院和解中心进行面对面调解',
        expectedOutcome: '当面达成还款方案'
      });
    }

    return steps;
  }

  // ========== 法诉条件筛选 ==========

  screenForCourt() {
    const eligible = this.processedData.filter(d =>
      d.overdueDays >= 90 && d.principal >= 5000 && d.mediationStatus === '未立案'
    );

    const alreadyFiled = this.processedData.filter(d =>
      d.mediationStatus === '已立案待调解' || d.mediationStatus === '调解中'
    );

    const nearEligible = this.processedData.filter(d =>
      d.overdueDays >= 60 && d.overdueDays < 90 && d.principal >= 5000
    );

    return {
      eligible: eligible.sort((a, b) => b.priorityScore - a.priorityScore),
      alreadyFiled: alreadyFiled,
      nearEligible: nearEligible.sort((a, b) => b.priorityScore - a.priorityScore),
      summary: {
        eligibleCount: eligible.length,
        eligibleAmount: eligible.reduce((s, d) => s + d.overdueAmount, 0),
        alreadyFiledCount: alreadyFiled.length,
        nearEligibleCount: nearEligible.length,
        nearEligibleAmount: nearEligible.reduce((s, d) => s + d.overdueAmount, 0)
      }
    };
  }

  // ========== 催收计划生成 ==========

  generateCollectionPlan() {
    const d = this.processedData;
    const plan = {
      total: d.length,
      totalOverdueAmount: d.reduce((s, x) => s + x.overdueAmount, 0),
      totalExpectedRecovery: d.reduce((s, x) => s + x.expectedRecovery, 0),
      overallRecoveryRate: 0,
      byTool: {},
      byPriority: { high: 0, medium: 0, low: 0 }
    };

    plan.overallRecoveryRate = plan.totalOverdueAmount > 0 ?
      (plan.totalExpectedRecovery / plan.totalOverdueAmount * 100).toFixed(1) : 0;

    // 按催收工具统计
    for (const [toolKey, toolInfo] of Object.entries(this.collectionTools)) {
      const assigned = d.filter(x => x.bestStrategy.all.some(s => s.tool === toolKey));
      plan.byTool[toolKey] = {
        ...toolInfo,
        count: assigned.length,
        totalAmount: assigned.reduce((s, x) => s + x.overdueAmount, 0),
        expectedRecovery: assigned.reduce((s, x) => s + x.expectedRecovery, 0),
        avgRecoveryRate: assigned.length ? (assigned.reduce((s, x) => s + x.recoveryRate, 0) / assigned.length).toFixed(1) : 0
      };
    }

    // 按优先级统计
    d.forEach(x => {
      if (x.priorityScore >= 70) plan.byPriority.high++;
      else if (x.priorityScore >= 40) plan.byPriority.medium++;
      else plan.byPriority.low++;
    });

    return plan;
  }

  // ========== 优先队列 ==========

  generatePriorityQueue() {
    return this.processedData
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 50)
      .map((d, i) => ({
        rank: i + 1,
        ...d,
        actionSummary: d.bestStrategy.primary ?
          `${d.bestStrategy.primary.icon} ${d.bestStrategy.primary.name}` : '常规催收'
      }));
  }

  // ========== 概览 ==========

  calcOverview() {
    const d = this.processedData;
    const avg = (fn) => d.length ? (d.reduce((s, x) => s + fn(x), 0) / d.length) : 0;

    return {
      total: d.length,
      totalPrincipal: d.reduce((s, x) => s + x.principal, 0),
      totalOverdueAmount: d.reduce((s, x) => s + x.overdueAmount, 0),
      avgOverdueDays: avg(x => x.overdueDays).toFixed(0),
      avgOverdueMonths: avg(x => x.overdueMonths).toFixed(1),
      avgPrincipal: avg(x => x.principal).toFixed(0),
      avgRecoveryRate: avg(x => x.recoveryRate).toFixed(1),
      totalExpectedRecovery: d.reduce((s, x) => s + x.expectedRecovery, 0),
      courtEligible: d.filter(x => x.overdueDays >= 90 && x.principal >= 5000).length,
      courtEligibleAmount: d.filter(x => x.overdueDays >= 90 && x.principal >= 5000).reduce((s, x) => s + x.overdueAmount, 0),
      unreachable: d.filter(x => x.phoneStatus.includes('无法联系') || x.phoneStatus.includes('空号')).length,
      refused: d.filter(x => x.phoneStatus.includes('拒绝沟通')).length,
      promised: d.filter(x => x.phoneStatus.includes('已承诺')).length,
      hasMortgage: d.filter(x => x.hasMortgage === '是').length,
      avgCollectionDifficulty: avg(x => x.collectionDifficulty).toFixed(1)
    };
  }

  // ========== 聚类 ==========

  kMeansClustering(k) {
    const data = this.processedData;
    if (data.length < k) return [];

    const features = data.map(d => [
      d.principal, d.overdueDays, d.overdueAmount, d.recoveryRate,
      d.collectionDifficulty, d.courtSuitability, d.lastRepaymentAmount, d.age
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
      for (let i = 0; i < cols; i++) { mins[i] = Math.min(mins[i], row[i]); maxs[i] = Math.max(maxs[i], row[i]); }
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
    for (let i = 0; i < data.length; i++) { counts[assignments[i]]++; for (let j = 0; j < data[i].length; j++) centroids[assignments[i]][j] += data[i][j]; }
    return centroids.map((c, i) => counts[i] > 0 ? c.map(v => v / counts[i]) : c);
  }

  euclideanDistance(a, b) { return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0)); }

  buildClusterResults(data, assignments, k) {
    const clusters = Array.from({ length: k }, () => ({ members: [] }));
    for (let i = 0; i < data.length; i++) clusters[assignments[i]].members.push(data[i]);

    const configs = [
      { name: '高价值可回收', emoji: '💰', color: '#00b894' },
      { name: '法诉优先客户', emoji: '⚖️', color: '#6c5ce7' },
      { name: '调解潜力客户', emoji: '🤝', color: '#74b9ff' },
      { name: '高难催收客户', emoji: '🧊', color: '#636e72' },
      { name: '套现嫌疑客户', emoji: '🔍', color: '#e17055' },
      { name: '失联客户', emoji: '📵', color: '#fd79a8' },
      { name: '新逾期客户', emoji: '🌱', color: '#fdcb6e' },
      { name: '特殊关注客户', emoji: '👁️', color: '#a29bfe' }
    ];

    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      if (c.members.length === 0) continue;
      const cfg = configs[i] || { name: `群体${i + 1}`, emoji: '👤', color: '#74b9ff' };
      const avg = (fn) => c.members.reduce((s, m) => s + fn(m), 0) / c.members.length;

      Object.assign(c, {
        label: cfg.name, emoji: cfg.emoji, color: cfg.color,
        percentage: ((c.members.length / data.length) * 100).toFixed(1),
        avgAge: avg(m => m.age).toFixed(1),
        avgPrincipal: avg(m => m.principal).toFixed(0),
        avgOverdueDays: avg(m => m.overdueDays).toFixed(0),
        avgOverdueMonths: avg(m => m.overdueMonths).toFixed(1),
        avgOverdueAmount: avg(m => m.overdueAmount).toFixed(0),
        avgRecoveryRate: avg(m => m.recoveryRate).toFixed(1),
        avgDifficulty: avg(m => m.collectionDifficulty).toFixed(1),
        avgCourtSuitability: avg(m => m.courtSuitability).toFixed(1),
        totalOverdueAmount: c.members.reduce((s, m) => s + m.overdueAmount, 0),
        totalExpectedRecovery: c.members.reduce((s, m) => s + m.expectedRecovery, 0),
        genderRatio: { male: c.members.filter(m => m.gender === '男').length, female: c.members.filter(m => m.gender === '女').length },
        overdueRate: '100',
        cashOutRate: (c.members.filter(m => m.hasCashOut === '是').length / c.members.length * 100).toFixed(1),
        complaintRate: (c.members.filter(m => m.hasComplaint === '是').length / c.members.length * 100).toFixed(1),
        mortgageRate: (c.members.filter(m => m.hasMortgage === '是').length / c.members.length * 100).toFixed(1),
        unreachableRate: (c.members.filter(m => m.phoneStatus.includes('无法联系') || m.phoneStatus.includes('空号')).length / c.members.length * 100).toFixed(1),
        courtEligible: c.members.filter(m => m.overdueDays >= 90 && m.principal >= 5000).length,
        topRegions: this.getTopItems(c.members, 'region', 3),
        topPhoneStatus: this.getTopItems(c.members, 'phoneStatus', 3),
        primaryTool: this.getMostUsedTool(c.members)
      });

      c.description = this.generateDescription(c);
      c.strategy = this.generateStrategy(c);
      c.urgentActions = this.generateUrgentActions(c);
    }

    return clusters.filter(c => c.members.length > 0);
  }

  getMostUsedTool(members) {
    const counts = {};
    members.forEach(m => {
      if (m.bestStrategy.primary) {
        const tool = m.bestStrategy.primary.name;
        counts[tool] = (counts[tool] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? sorted[0][0] : '常规催收';
  }

  generateDescription(c) {
    const recovery = parseFloat(c.avgRecoveryRate);
    let desc = `逾期${c.avgOverdueMonths}个月，`;
    desc += recovery >= 60 ? '回款率较高' : recovery >= 35 ? '回款率中等' : '回款率较低';
    desc += `，${parseFloat(c.avgDifficulty) >= 60 ? '催收难度大' : '有一定催收空间'}`;
    return desc;
  }

  generateStrategy(c) {
    const strategies = [];
    const recovery = parseFloat(c.avgRecoveryRate);
    const difficulty = parseFloat(c.avgDifficulty);
    const courtCount = c.courtEligible;
    const mortgageRate = parseFloat(c.mortgageRate);
    const unreachableRate = parseFloat(c.unreachableRate);

    if (courtCount > 0) strategies.push(`⚖️ ${courtCount}人符合法诉条件，建议批量立案`);
    if (mortgageRate > 30) strategies.push(`🏠 ${mortgageRate}%有房贷，律师函施压效果好`);
    if (unreachableRate > 40) strategies.push(`📵 ${unreachableRate}%失联，需通过户籍地址多渠道触达`);
    if (recovery >= 50) strategies.push(`💰 回款率${recovery}%，优先集中资源催收`);
    if (difficulty < 40) strategies.push(`📞 催收难度低，电话+短信可有效触达`);
    if (parseFloat(c.cashOutRate) > 20) strategies.push(`🔍 套现率${c.cashOutRate}%，可作为谈判筹码`);

    return strategies;
  }

  generateUrgentActions(c) {
    const actions = [];
    const severe = c.members.filter(m => m.overdueDays > 120).length;
    const highAmount = c.members.filter(m => m.overdueAmount > 30000).length;
    const courtReady = c.members.filter(m => m.overdueDays >= 90 && m.principal >= 5000 && m.mediationStatus === '未立案').length;

    if (severe > 0) actions.push(`🔴 ${severe}人逾期超4个月，优先处理`);
    if (highAmount > 0) actions.push(`🟡 ${highAmount}人欠款超3万，重点跟进`);
    if (courtReady > 0) actions.push(`⚖️ ${courtReady}人可立即立案调解`);

    return actions;
  }

  // ========== 智能洞察 ==========

  generateInsights() {
    const d = this.processedData;
    const insights = [];

    const courtEligible = d.filter(x => x.overdueDays >= 90 && x.principal >= 5000);
    if (courtEligible.length > 0) {
      const totalAmount = courtEligible.reduce((s, x) => s + x.overdueAmount, 0);
      const avgRecovery = courtEligible.reduce((s, x) => s + x.recoveryRate, 0) / courtEligible.length;
      insights.push({
        type: 'info', icon: '⚖️',
        title: '法诉资源匹配',
        text: `${courtEligible.length}人符合法诉条件（逾期≥3月+本金≥5K），总欠款¥${totalAmount.toLocaleString()}，平均预估回款率${avgRecovery.toFixed(1)}%`
      });
    }

    const totalExpected = d.reduce((s, x) => s + x.expectedRecovery, 0);
    const totalOverdue = d.reduce((s, x) => s + x.overdueAmount, 0);
    insights.push({
      type: 'success', icon: '💰',
      title: '整体回款预估',
      text: `总逾期¥${totalOverdue.toLocaleString()}，预估可回款¥${totalExpected.toLocaleString()}（${(totalExpected / totalOverdue * 100).toFixed(1)}%）`
    });

    const unreachable = d.filter(x => x.phoneStatus.includes('无法联系') || x.phoneStatus.includes('空号'));
    if (unreachable.length > 0) {
      insights.push({
        type: 'danger', icon: '📵',
        title: '失联客户',
        text: `${unreachable.length}人无法联系，建议通过户籍地址发函或法院公告送达`
      });
    }

    const highValue = d.filter(x => x.overdueAmount > 30000 && x.recoveryRate >= 50);
    if (highValue.length > 0) {
      insights.push({
        type: 'warning', icon: '🎯',
        title: '高价值目标',
        text: `${highValue.length}人欠款超3万且预估回款率≥50%，建议优先分配催收资源`
      });
    }

    const mortgageHighRisk = d.filter(x => x.hasMortgage === '是' && x.overdueDays >= 90);
    if (mortgageHighRisk.length > 0) {
      insights.push({
        type: 'info', icon: '🏠',
        title: '有资产客户',
        text: `${mortgageHighRisk.length}人有房贷且逾期≥3月，律师函+法诉双管齐下效果最佳`
      });
    }

    return insights;
  }

  // ========== 工具方法 ==========

  getField(item, key) { const f = this.fieldMapping[key]; return f ? item[f] : item[key]; }
  parseNumber(val) { if (val === null || val === undefined || val === '') return 0; const n = parseFloat(val); return isNaN(n) ? 0 : n; }
  parseDate(val) { if (!val) return null; const d = new Date(val); return isNaN(d.getTime()) ? null : d; }
  normalizeGender(val) { if (!val) return '未知'; const s = String(val).toLowerCase(); return /^(m|male|男|man|1)$/i.test(s) ? '男' : /^(f|female|女|woman|2|0)$/i.test(s) ? '女' : '未知'; }
  normalizeYesNo(val) { if (!val) return '否'; return /^(是|yes|1|true|有)$/i.test(String(val).trim()) ? '是' : '否'; }
  extractRegion(addr) { if (!addr) return '未知'; const cities = ['佛山南海', '佛山禅城', '广州', '深圳', '东莞', '中山', '珠海', '惠州']; for (const c of cities) { if (addr.includes(c)) return c; } return addr.slice(0, 4); }

  classifyPhoneStatus(record) {
    if (!record) return '✅ 正常沟通';
    if (record.includes('未接') || record.includes('无法联系')) return '❌ 无法联系';
    if (record.includes('空号') || record.includes('停机')) return '📵 空号/停机';
    if (record.includes('拒绝') || record.includes('态度恶劣')) return '😡 拒绝沟通';
    if (record.includes('承诺')) return '🤝 已承诺还款';
    if (record.includes('方案')) return '📋 已达成方案';
    return '✅ 正常沟通';
  }

  getTopItems(data, field, n) {
    const counts = {};
    data.forEach(d => { const val = d[field]; if (val && val !== '未知' && val !== '无') counts[val] = (counts[val] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count, pct: ((count / data.length) * 100).toFixed(1) }));
  }

  // ========== 导出 ==========

  exportReport(results) {
    const report = {
      title: '信用卡催收回款分析报告',
      generatedAt: new Date().toISOString(),
      summary: results.overview,
      insights: results.insights,
      collectionPlan: results.collectionPlan,
      courtScreening: {
        eligible: results.courtScreening.summary,
        eligibleList: results.courtScreening.eligible.slice(0, 100).map(d => ({
          id: d.id, name: d.name, principal: d.principal, overdueDays: d.overdueDays,
          overdueAmount: d.overdueAmount, recoveryRate: d.recoveryRate,
          strategy: d.bestStrategy.primary?.name || '常规催收'
        }))
      },
      priorityQueue: results.priorityQueue.slice(0, 30).map(d => ({
        rank: d.rank, id: d.id, principal: d.principal, overdueDays: d.overdueDays,
        overdueAmount: d.overdueAmount, recoveryRate: d.recoveryRate,
        action: d.actionSummary
      })),
      clusters: results.clusters.map(c => ({
        name: c.label, percentage: c.percentage + '%',
        count: c.members.length, avgRecoveryRate: c.avgRecoveryRate + '%',
        totalOverdueAmount: c.totalOverdueAmount,
        totalExpectedRecovery: c.totalExpectedRecovery,
        primaryTool: c.primaryTool, strategy: c.strategy
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `催收回款报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.CustomerAnalyzer = CustomerAnalyzer;

/**
 * seed：初始化内容标签体系（7 个标签组 + 350+ 标签 + 知识点）
 *
 * 标签组：
 *   1. 医疗健康    (medical-health)
 *   2. 金融投资    (finance-investment)
 *   3. 教育培训    (education-training)
 *   4. 文化旅游    (culture-tourism)
 *   5. 互联网IT    (internet-it)
 *   6. 电商运营    (ecommerce-operations)
 *   7. 知识点      (knowledge-points)
 *
 * 幂等性：
 *   - tag-group 按 slug 检查
 *   - tag 按 name 检查（存在则跳过创建，但仍检查分组关联）
 *   - knowledge-point 按 name 检查
 *
 * 部署：git commit → 服务器 git pull + pm2 restart 即可自动执行
 */
module.exports = {
  async up({ strapi, db }) {
    // ============================================================
    //  数据定义
    // ============================================================
    const GROUPS_WITH_TAGS = [
      {
        name: '医疗健康',
        slug: 'medical-health',
        description: '医疗、健康、养生、疾病科普等标签',
        color: '#e53e3e',
        tags: [
          '疾病科普', '健康饮食', '运动健身', '心理健康', '中医养生',
          '西医常识', '母婴健康', '儿科知识', '老年护理', '慢性病管理',
          '急救常识', '药物知识', '营养补充', '减肥瘦身', '睡眠管理',
          '亚健康调理', '皮肤护理', '口腔健康', '眼科保健', '耳鼻喉科',
          '骨科健康', '心血管疾病', '糖尿病管理', '高血压防治', '癌症预防',
          '妇科健康', '男性健康', '生殖健康', '性教育', '心理咨询',
          '抑郁症', '焦虑症', '康复训练', '物理治疗', '中医针灸',
          '推拿按摩', '药膳食疗', '芳香疗法', '瑜伽养生', '太极养生',
          '体检解读', '基因检测', '疫苗接种', '过敏防治', '传染病预防',
          '职业病防护', '医疗保险', '健康管理', '远程医疗', '智慧医疗',
        ],
      },
      {
        name: '金融投资',
        slug: 'finance-investment',
        description: '股票、基金、债券、保险、理财等金融投资标签',
        color: '#3182ce',
        tags: [
          '股票投资', '基金理财', '债券投资', '期货交易', '外汇市场',
          '黄金投资', '银行理财', '保险规划', '退休金', '个人税务',
          '房产投资', '创业融资', '风险投资', '私募股权', '天使投资',
          '众筹', '区块链金融', '数字货币', '支付技术', '消费金融',
          '信用卡', '贷款利率', '存款理财', '财务自由', '资产配置',
          '投资组合', '价值投资', '技术分析', '基本面分析', '宏观经济',
          '货币政策', '财政政策', '金融市场', '股市行情', '基金定投',
          'ETF投资', '指数投资', '量化交易', '程序化交易', '风险管理',
          '止损策略', '杠杆交易', '期权交易', '期货套利', '保险产品',
          '重疾险', '医疗险', '意外险', '财产保险', '遗产规划',
          '家族信托', '资产传承',
        ],
      },
      {
        name: '教育培训',
        slug: 'education-training',
        description: '学前、K12、高等教育、职业培训、在线教育等标签',
        color: '#805ad5',
        tags: [
          '学前教育', 'K12教育', '高等教育', '职业教育', '在线教育',
          '语言学习', '英语培训', '日语学习', '留学申请', '考研辅导',
          '公务员考试', '资格证书', '技能培训', '企业培训', '管理培训',
          '领导力培训', '沟通技巧', '演讲培训', '写作课程', '阅读理解',
          '数学辅导', '物理辅导', '化学辅导', '生物辅导', '历史课程',
          '地理课程', '编程教育', '少儿编程', 'STEAM教育', '艺术教育',
          '音乐培训', '美术培训', '舞蹈培训', '体育培训', '棋类培训',
          '心理教育', '特殊教育', '家庭教育', '亲子教育', '学习方法',
          '记忆训练', '思维导图', '批判性思维', '创新思维', '项目式学习',
          '翻转课堂', '混合式教学', '教育技术', '学习管理系统', '教育心理学',
          '课程设计', '教学评估',
        ],
      },
      {
        name: '文化旅游',
        slug: 'culture-tourism',
        description: '旅游攻略、文化遗产、民俗、博物馆、旅行方式等标签',
        color: '#38a169',
        tags: [
          '国内旅游', '出境旅游', '自驾游', '背包旅行', '文化遗产',
          '历史古迹', '博物馆', '美术馆', '民俗文化', '非遗传承',
          '旅游攻略', '旅行装备', '酒店预订', '民宿体验', '美食旅游',
          '乡村旅游', '生态旅游', '康养旅游', '红色旅游', '工业旅游',
          '摄影旅行', '徒步登山', '潜水冲浪', '滑雪运动', '露营野炊',
          '房车旅行', '邮轮旅游', '定制旅行', '团队旅游', '亲子游',
          '蜜月旅行', '蜜月度假', '古镇游览', '主题乐园', '自然风光',
          '人文景观', '节庆活动', '旅游保险', '签证办理', '机票预订',
          '旅游摄影', '旅行Vlog', '旅游博主', '地方特产', '纪念品',
          '旅游安全', '文化交流', '传统文化', '现代艺术', '民族风情',
          '文旅融合', '智慧旅游',
        ],
      },
      {
        name: '互联网IT',
        slug: 'internet-it',
        description: '前端、后端、移动开发、AI、大数据、云计算、运维等标签',
        color: '#319795',
        tags: [
          '前端开发', '后端开发', '全栈开发', '移动开发', 'iOS开发',
          'Android开发', '小程序开发', 'React', 'Vue', 'Angular',
          'Node.js', 'Python', 'Java', 'Go语言', 'Rust',
          '数据库', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
          '微服务', '分布式系统', '容器化', 'Docker', 'Kubernetes',
          'CI/CD', 'DevOps', '云计算', 'AWS', '阿里云',
          '腾讯云', '人工智能', '机器学习', '深度学习', '自然语言处理',
          '计算机视觉', '大数据', '数据分析', '数据挖掘', '数据可视化',
          '区块链', '物联网', '网络安全', '信息安全', '渗透测试',
          '逆向工程', 'API设计', '系统架构', '性能优化', '自动化测试',
          '敏捷开发', '开源项目',
        ],
      },
      {
        name: '电商运营',
        slug: 'ecommerce-operations',
        description: '店铺运营、选品、推广、直播带货、跨境出海等标签',
        color: '#dd6b20',
        tags: [
          '店铺运营', '选品策略', '供应链管理', '库存管理', '定价策略',
          '商品上架', '详情页设计', '标题优化', '关键词优化', '搜索排名',
          '直通车', '钻展推广', '超级推荐', '直播带货', '短视频电商',
          '社交电商', '跨境电商', '独立站', '亚马逊运营', '速卖通',
          'Shopee', 'TikTok Shop', '用户运营', '会员体系', '私域流量',
          '社群运营', '客服管理', '售后服务', '评价管理', '物流配送',
          '仓储管理', '退换货', '营销活动', '促销策略', '优惠券',
          '满减活动', '拼团', '秒杀', '预售', '分销体系',
          '联盟营销', 'KOL合作', '品牌建设', '视觉设计', '数据分析',
          '转化率优化', '客单价', '复购率', '用户画像', '竞品分析',
          '电商合规', '新零售',
        ],
      },
      {
        name: '知识点',
        slug: 'knowledge-points',
        description: '通用知识点标签，用于课程与文章的知识体系标注',
        color: '#d69e2e',
        tags: [
          '基础概念', '核心原理', '底层逻辑', '系统架构', '设计模式',
          '数据结构', '算法基础', '时间复杂度', '空间复杂度', '排序算法',
          '搜索算法', '动态规划', '贪心算法', '回溯算法', '分治算法',
          '图论基础', '树结构', '哈希表', '链表', '栈与队列',
          '面向对象', '函数式编程', '响应式编程', '并发编程', '异步处理',
          '内存管理', '垃圾回收', '编译原理', '操作系统', '计算机网络',
          'HTTP协议', 'TCP/IP', 'DNS解析', '加密算法', '数字签名',
          '数据库索引', '事务管理', '锁机制', '缓存策略', '消息队列',
          '负载均衡', '微服务架构', '领域驱动设计', '敏捷方法论', '测试驱动开发',
          '持续集成', '代码规范', '版本控制', 'Git工作流', '重构技巧',
          '设计原则', '系统设计',
        ],
      },
    ];

    // 知识点 content-type 种子数据（level: basic / intermediate / advanced）
    const KNOWLEDGE_POINTS = [
      { name: '变量与数据类型', code: 'CS-001', level: 'basic', description: '编程语言中变量声明与基本数据类型' },
      { name: '控制流程', code: 'CS-002', level: 'basic', description: '条件判断、循环、跳转等流程控制' },
      { name: '函数与方法', code: 'CS-003', level: 'basic', description: '函数定义、参数传递、返回值' },
      { name: '数组与字符串', code: 'CS-004', level: 'basic', description: '数组操作、字符串处理基础' },
      { name: '面向对象基础', code: 'CS-005', level: 'basic', description: '类、对象、封装、继承、多态' },
      { name: '集合框架', code: 'CS-006', level: 'intermediate', description: 'List、Set、Map 等集合的使用' },
      { name: '泛型', code: 'CS-007', level: 'intermediate', description: '泛型类、泛型方法、通配符' },
      { name: '异常处理', code: 'CS-008', level: 'intermediate', description: 'try-catch-finally、自定义异常' },
      { name: 'IO流', code: 'CS-009', level: 'intermediate', description: '字节流、字符流、缓冲流' },
      { name: '多线程基础', code: 'CS-010', level: 'intermediate', description: '线程创建、生命周期、同步' },
      { name: '网络编程', code: 'CS-011', level: 'intermediate', description: 'Socket、HTTP 通信' },
      { name: '反射机制', code: 'CS-012', level: 'advanced', description: '运行时获取类信息、动态调用' },
      { name: '注解与元编程', code: 'CS-013', level: 'advanced', description: '自定义注解、注解处理器' },
      { name: '设计模式', code: 'CS-014', level: 'advanced', description: '创建型、结构型、行为型设计模式' },
      { name: 'JVM原理', code: 'CS-015', level: 'advanced', description: '类加载、内存模型、垃圾回收' },
      { name: '数据库设计', code: 'DB-001', level: 'intermediate', description: 'ER模型、范式、表结构设计' },
      { name: 'SQL查询', code: 'DB-002', level: 'basic', description: 'SELECT、JOIN、子查询' },
      { name: '索引优化', code: 'DB-003', level: 'advanced', description: 'B+树索引、执行计划分析' },
      { name: '事务与隔离级别', code: 'DB-004', level: 'intermediate', description: 'ACID、脏读/幻读、隔离级别' },
      { name: '分布式数据库', code: 'DB-005', level: 'advanced', description: '分库分表、CAP理论' },
      { name: 'HTML/CSS基础', code: 'FE-001', level: 'basic', description: '语义化标签、Flex/Grid 布局' },
      { name: 'JavaScript基础', code: 'FE-002', level: 'basic', description: 'ES6+ 语法、DOM操作' },
      { name: 'React组件', code: 'FE-003', level: 'intermediate', description: '函数组件、Hooks、状态管理' },
      { name: 'Vue响应式', code: 'FE-004', level: 'intermediate', description: '响应式原理、组件通信' },
      { name: '前端工程化', code: 'FE-005', level: 'advanced', description: 'Webpack/Vite、模块化、构建优化' },
      { name: 'RESTful API', code: 'API-001', level: 'basic', description: 'REST 设计风格、HTTP 方法语义' },
      { name: 'GraphQL', code: 'API-002', level: 'intermediate', description: 'Schema、Query/Mutation、Resolver' },
      { name: '认证与授权', code: 'SEC-001', level: 'intermediate', description: 'JWT、OAuth2、Session' },
      { name: 'HTTPS与TLS', code: 'SEC-002', level: 'advanced', description: 'TLS握手、证书链、加密套件' },
      { name: 'Docker容器化', code: 'OPS-001', level: 'intermediate', description: '镜像构建、容器编排' },
      { name: 'Kubernetes编排', code: 'OPS-002', level: 'advanced', description: 'Pod/Service/Deployment' },
      { name: 'CI/CD流水线', code: 'OPS-003', level: 'intermediate', description: '自动化构建、测试、部署' },
      { name: '监控与告警', code: 'OPS-004', level: 'intermediate', description: 'Prometheus、Grafana、日志聚合' },
      { name: '机器学习入门', code: 'AI-001', level: 'basic', description: '监督/非监督学习、训练流程' },
      { name: '神经网络', code: 'AI-002', level: 'intermediate', description: '前向传播、反向传播、激活函数' },
      { name: 'Transformer架构', code: 'AI-003', level: 'advanced', description: '注意力机制、位置编码' },
      { name: '模型微调', code: 'AI-004', level: 'advanced', description: 'LoRA、P-Tuning、RLHF' },
      { name: '数据预处理', code: 'AI-005', level: 'intermediate', description: '清洗、归一化、特征工程' },
      { name: '模型评估', code: 'AI-006', level: 'intermediate', description: '准确率、召回率、F1、AUC' },
      { name: 'Prompt工程', code: 'AI-007', level: 'basic', description: '提示词设计、Few-shot、Chain-of-Thought' },
    ];

    // ============================================================
    //  执行：创建标签组 + 标签
    // ============================================================
    const groupService = strapi.documents('plugin::zhao-tag.tag-group');
    const tagService = strapi.documents('plugin::zhao-tag.tag');
    const kpService = strapi.documents('plugin::zhao-tag.knowledge-point');

    // --- 1. 创建标签组（按 slug 幂等） ---
    const slugToDocId = {};
    for (const g of GROUPS_WITH_TAGS) {
      const existing = await groupService.findMany({
        filters: { slug: { $eq: g.slug } },
      });
      if (existing && existing.length > 0) {
        slugToDocId[g.slug] = existing[0].documentId;
        console.log(`[seed content-tags] [SKIP] tag-group 已存在: "${g.name}" (slug=${g.slug})`);
        continue;
      }
      const created = await groupService.create({
        data: {
          name: g.name,
          slug: g.slug,
          description: g.description,
          color: g.color,
          sort: 0,
          isPublic: true,
        },
      });
      slugToDocId[g.slug] = created.documentId;
      console.log(`[seed content-tags] [OK] 创建 tag-group: "${g.name}" (slug=${g.slug})`);
    }

    // --- 2. 创建标签并关联到分组（按 name 幂等） ---
    let tagCreated = 0;
    let tagSkipped = 0;
    let tagLinked = 0;

    for (const g of GROUPS_WITH_TAGS) {
      const groupDocId = slugToDocId[g.slug];
      if (!groupDocId) {
        console.log(`[seed content-tags] [WARN] 分组 ${g.slug} 无 documentId，跳过标签创建`);
        continue;
      }

      for (const tagName of g.tags) {
        // 按 name 检查是否已存在
        const existing = await tagService.findMany({
          filters: { name: { $eq: tagName } },
          limit: 1,
        });

        if (existing && existing.length > 0) {
          const existingTag = existing[0];
          tagSkipped++;

          // 检查是否已关联到当前分组
          const currentGroup = existingTag.tagGroup;
          const alreadyLinked = currentGroup && currentGroup.documentId === groupDocId;
          if (!alreadyLinked) {
            await tagService.update({
              documentId: existingTag.documentId,
              data: { tagGroup: groupDocId },
            });
            tagLinked++;
          }
          continue;
        }

        // 创建新标签并关联分组
        await tagService.create({
          data: {
            name: tagName,
            description: `${g.name} - ${tagName}`,
            tagGroup: groupDocId,
            isPreset: true,
            isPublic: true,
            sort: 0,
          },
        });
        tagCreated++;
      }

      console.log(`[seed content-tags] 分组 "${g.name}" 处理完成 (${g.tags.length} 个标签)`);
    }

    console.log(`[seed content-tags] 标签统计: 新建 ${tagCreated}, 跳过 ${tagSkipped}, 补充关联 ${tagLinked}`);

    // --- 3. 创建知识点（按 name 幂等） ---
    let kpCreated = 0;
    let kpSkipped = 0;

    for (const kp of KNOWLEDGE_POINTS) {
      const existing = await kpService.findMany({
        filters: { name: { $eq: kp.name } },
        limit: 1,
      });

      if (existing && existing.length > 0) {
        kpSkipped++;
        continue;
      }

      await kpService.create({
        data: {
          name: kp.name,
          code: kp.code,
          level: kp.level,
          description: kp.description,
          sort: 0,
        },
      });
      kpCreated++;
    }

    console.log(`[seed content-tags] 知识点统计: 新建 ${kpCreated}, 跳过 ${kpSkipped}`);
    console.log(`[seed content-tags] 全部完成 ✓`);
  },

  async down({ strapi, db }) {
    // 回滚：删除本种子创建的标签组（按 slug 精确匹配）
    const SLUGS = [
      'medical-health', 'finance-investment', 'education-training',
      'culture-tourism', 'internet-it', 'ecommerce-operations', 'knowledge-points',
    ];
    const groupService = strapi.documents('plugin::zhao-tag.tag-group');
    for (const slug of SLUGS) {
      const existing = await groupService.findMany({ filters: { slug: { $eq: slug } } });
      if (existing && existing.length > 0) {
        await groupService.delete({ documentId: existing[0].documentId });
        console.log(`[seed content-tags] [DOWN] 删除 tag-group: slug=${slug}`);
      }
    }

    // 删除知识点（按 code 前缀匹配）
    const kpService = strapi.documents('plugin::zhao-tag.knowledge-point');
    const CODE_PREFIXES = ['CS-', 'DB-', 'FE-', 'API-', 'SEC-', 'OPS-', 'AI-'];
    for (const prefix of CODE_PREFIXES) {
      const existing = await kpService.findMany({
        filters: { code: { $startsWith: prefix } },
        limit: 100,
      });
      for (const kp of existing) {
        await kpService.delete({ documentId: kp.documentId });
      }
    }
    console.log(`[seed content-tags] [DOWN] 知识点已清理`);
  },
};

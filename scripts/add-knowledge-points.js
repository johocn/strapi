const Strapi = require('@strapi/strapi');

const knowledgePointsData = [
  {
    name: 'JavaScript基础',
    description: 'JavaScript编程语言的基础知识，包括变量、数据类型、运算符、流程控制等',
    groupName: '前端开发',
    sort: 1
  },
  {
    name: 'ES6+特性',
    description: 'ECMAScript 6及以上版本的新特性，包括箭头函数、解构赋值、Promise等',
    groupName: '前端开发',
    sort: 2
  },
  {
    name: 'React框架',
    description: 'Facebook开发的前端框架，用于构建用户界面',
    groupName: '前端开发',
    sort: 3
  },
  {
    name: 'Vue框架',
    description: '渐进式JavaScript框架，用于构建交互式界面',
    groupName: '前端开发',
    sort: 4
  },
  {
    name: 'CSS样式',
    description: '层叠样式表，用于网页布局和美化',
    groupName: '前端开发',
    sort: 5
  },
  {
    name: 'HTML结构',
    description: '超文本标记语言，用于构建网页结构',
    groupName: '前端开发',
    sort: 6
  },
  {
    name: 'Node.js',
    description: '基于Chrome V8引擎的JavaScript运行时环境',
    groupName: '后端开发',
    sort: 1
  },
  {
    name: 'Express框架',
    description: 'Node.js的Web应用框架',
    groupName: '后端开发',
    sort: 2
  },
  {
    name: '数据库设计',
    description: '关系型和非关系型数据库的设计原则和实践',
    groupName: '后端开发',
    sort: 3
  },
  {
    name: 'RESTful API',
    description: 'REST风格的API设计规范',
    groupName: '后端开发',
    sort: 4
  },
  {
    name: 'TypeScript',
    description: 'JavaScript的超集，添加了静态类型检查',
    groupName: '编程语言',
    sort: 1
  },
  {
    name: 'Python',
    description: '高级编程语言，广泛用于数据科学和机器学习',
    groupName: '编程语言',
    sort: 2
  },
  {
    name: 'Git版本控制',
    description: '分布式版本控制系统',
    groupName: '工具与工程',
    sort: 1
  },
  {
    name: 'Docker容器',
    description: '容器化技术，用于应用部署',
    groupName: '工具与工程',
    sort: 2
  },
  {
    name: 'CI/CD',
    description: '持续集成和持续部署流程',
    groupName: '工具与工程',
    sort: 3
  },
  {
    name: '算法基础',
    description: '常用算法和数据结构',
    groupName: '计算机基础',
    sort: 1
  },
  {
    name: '数据结构',
    description: '数组、链表、栈、队列、树、图等数据结构',
    groupName: '计算机基础',
    sort: 2
  },
  {
    name: '网络协议',
    description: 'HTTP、TCP/IP等网络协议原理',
    groupName: '计算机基础',
    sort: 3
  },
  {
    name: '操作系统',
    description: '操作系统基本原理和概念',
    groupName: '计算机基础',
    sort: 4
  },
  {
    name: '设计模式',
    description: '常用软件设计模式，如单例模式、工厂模式等',
    groupName: '架构设计',
    sort: 1
  },
  {
    name: '微服务架构',
    description: '将应用拆分为多个独立服务的架构模式',
    groupName: '架构设计',
    sort: 2
  },
  {
    name: '性能优化',
    description: '前端和后端性能优化策略',
    groupName: '架构设计',
    sort: 3
  }
];

async function run() {
  await Strapi().load();
  
  const groupService = strapi.documents('plugin::zhao-tag.tag-group');
  const kpService = strapi.documents('plugin::zhao-tag.knowledge-point');
  
  const existingGroups = await groupService.findMany({});
  const groupMap = new Map(existingGroups.map(g => [g.name, g]));
  
  const groupsToCreate = new Set(['前端开发', '后端开发', '编程语言', '工具与工程', '计算机基础', '架构设计']);
  
  for (const groupName of groupsToCreate) {
    if (!groupMap.has(groupName)) {
      console.log(`Creating group: ${groupName}`);
      const newGroup = await groupService.create({
        data: { name: groupName, description: `${groupName}相关知识点` }
      });
      groupMap.set(groupName, newGroup);
    }
  }
  
  const existingKPs = await kpService.findMany({});
  const existingKPNames = new Set(existingKPs.map(kp => kp.name));
  
  for (const kpData of knowledgePointsData) {
    if (!existingKPNames.has(kpData.name)) {
      const group = groupMap.get(kpData.groupName);
      if (group) {
        console.log(`Creating knowledge point: ${kpData.name}`);
        await kpService.create({
          data: {
            name: kpData.name,
            description: kpData.description,
            group: { documentId: group.documentId },
            sort: kpData.sort
          }
        });
      }
    }
  }
  
  console.log('知识点数据初始化完成！');
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsImVtYWlsIjoiMTExN0AxNjMuY29tIiwidXNlcm5hbWUiOiIxMTE3Iiwiemhhb1JvbGVzIjpbImFkbWluIl0sImlhdCI6MTc4MTI1ODQ4MSwiZXhwIjoxNzgzODUwNDgxfQ.KfTlWrz1XGX61svSDd1Zc7TXcXhWMiAizco-Xmt9kdc';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 1337,
      path: `/api/zhao-tag/v1/admin${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve(result);
        } catch {
          resolve({ data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

const groups = [
  { name: '后端开发', description: '后端开发相关知识点' },
  { name: '编程语言', description: '编程语言相关知识点' },
  { name: '工具与工程', description: '工具与工程相关知识点' },
  { name: '计算机基础', description: '计算机基础相关知识点' },
  { name: '架构设计', description: '架构设计相关知识点' }
];

const knowledgePoints = [
  { name: 'JavaScript基础', description: 'JavaScript编程语言的基础知识', groupName: '前端开发', sort: 1 },
  { name: 'ES6+特性', description: 'ECMAScript 6及以上版本的新特性', groupName: '前端开发', sort: 2 },
  { name: 'React框架', description: 'Facebook开发的前端框架', groupName: '前端开发', sort: 3 },
  { name: 'Vue框架', description: '渐进式JavaScript框架', groupName: '前端开发', sort: 4 },
  { name: 'CSS样式', description: '层叠样式表，用于网页布局和美化', groupName: '前端开发', sort: 5 },
  { name: 'HTML结构', description: '超文本标记语言，用于构建网页结构', groupName: '前端开发', sort: 6 },
  { name: 'Node.js', description: '基于Chrome V8引擎的JavaScript运行时环境', groupName: '后端开发', sort: 1 },
  { name: 'Express框架', description: 'Node.js的Web应用框架', groupName: '后端开发', sort: 2 },
  { name: '数据库设计', description: '关系型和非关系型数据库的设计原则', groupName: '后端开发', sort: 3 },
  { name: 'RESTful API', description: 'REST风格的API设计规范', groupName: '后端开发', sort: 4 },
  { name: 'TypeScript', description: 'JavaScript的超集，添加了静态类型检查', groupName: '编程语言', sort: 1 },
  { name: 'Python', description: '高级编程语言，广泛用于数据科学', groupName: '编程语言', sort: 2 },
  { name: 'Git版本控制', description: '分布式版本控制系统', groupName: '工具与工程', sort: 1 },
  { name: 'Docker容器', description: '容器化技术，用于应用部署', groupName: '工具与工程', sort: 2 },
  { name: 'CI/CD', description: '持续集成和持续部署流程', groupName: '工具与工程', sort: 3 },
  { name: '算法基础', description: '常用算法和数据结构', groupName: '计算机基础', sort: 1 },
  { name: '数据结构', description: '数组、链表、栈、队列、树、图等数据结构', groupName: '计算机基础', sort: 2 },
  { name: '网络协议', description: 'HTTP、TCP/IP等网络协议原理', groupName: '计算机基础', sort: 3 },
  { name: '操作系统', description: '操作系统基本原理和概念', groupName: '计算机基础', sort: 4 },
  { name: '设计模式', description: '常用软件设计模式', groupName: '架构设计', sort: 1 },
  { name: '微服务架构', description: '将应用拆分为多个独立服务的架构模式', groupName: '架构设计', sort: 2 },
  { name: '性能优化', description: '前端和后端性能优化策略', groupName: '架构设计', sort: 3 }
];

async function main() {
  const groupMap = {};
  
  try {
    const existingGroups = await request('GET', '/tag-groups');
    if (existingGroups.data && Array.isArray(existingGroups.data)) {
      existingGroups.data.forEach(g => {
        groupMap[g.name] = g.documentId;
      });
    }
    console.log('Existing groups:', Object.keys(groupMap));
  } catch (err) {
    console.error('Failed to get existing groups:', err.message);
  }

  for (const group of groups) {
    if (!groupMap[group.name]) {
      try {
        const result = await request('POST', '/tag-groups', group);
        if (result.data && result.data.documentId) {
          groupMap[group.name] = result.data.documentId;
          console.log(`Created group: ${group.name}`);
        }
      } catch (err) {
        console.error(`Failed to create group ${group.name}:`, err.message);
      }
    }
  }

  for (const kp of knowledgePoints) {
    const groupId = groupMap[kp.groupName];
    if (groupId) {
      try {
        const data = {
          name: kp.name,
          description: kp.description,
          group: { documentId: groupId },
          sort: kp.sort
        };
        await request('POST', '/knowledge-points', data);
        console.log(`Created knowledge point: ${kp.name}`);
      } catch (err) {
        console.error(`Failed to create knowledge point ${kp.name}:`, err.message);
      }
    } else {
      console.log(`Group not found for ${kp.groupName}`);
    }
  }

  console.log('\n知识点数据初始化完成！');
}

main().catch(err => console.error('Error:', err));

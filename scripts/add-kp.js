const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsImVtYWlsIjoiMTExN0AxNjMuY29tIiwidXNlcm5hbWUiOiIxMTE3Iiwiemhhb1JvbGVzIjpbImFkbWluIl0sImlhdCI6MTc4MTI1ODQ4MSwiZXhwIjoxNzgzODUwNDgxfQ.KfTlWrz1XGX61svSDd1Zc7TXcXhWMiAizco-Xmt9kdc';
const knowledgePointsGroupId = 'ijnswc4nzbfc5pzkb5l2fdbp';

const knowledgePoints = [
  { name: 'JavaScript基础', description: 'JavaScript编程语言的基础知识，包括变量、数据类型、运算符、流程控制等' },
  { name: 'ES6+特性', description: 'ECMAScript 6及以上版本的新特性，包括箭头函数、解构赋值、Promise等' },
  { name: 'React框架', description: 'Facebook开发的前端框架，用于构建用户界面' },
  { name: 'Vue框架', description: '渐进式JavaScript框架，用于构建交互式界面' },
  { name: 'CSS样式', description: '层叠样式表，用于网页布局和美化' },
  { name: 'HTML结构', description: '超文本标记语言，用于构建网页结构' },
  { name: 'Node.js', description: '基于Chrome V8引擎的JavaScript运行时环境' },
  { name: 'Express框架', description: 'Node.js的Web应用框架' },
  { name: '数据库设计', description: '关系型和非关系型数据库的设计原则和实践' },
  { name: 'RESTful API', description: 'REST风格的API设计规范' },
  { name: 'TypeScript', description: 'JavaScript的超集，添加了静态类型检查' },
  { name: 'Python', description: '高级编程语言，广泛用于数据科学和机器学习' },
  { name: 'Git版本控制', description: '分布式版本控制系统' },
  { name: 'Docker容器', description: '容器化技术，用于应用部署' },
  { name: 'CI/CD', description: '持续集成和持续部署流程' },
  { name: '算法基础', description: '常用算法和数据结构' },
  { name: '数据结构', description: '数组、链表、栈、队列、树、图等数据结构' },
  { name: '网络协议', description: 'HTTP、TCP/IP等网络协议原理' },
  { name: '操作系统', description: '操作系统基本原理和概念' },
  { name: '设计模式', description: '常用软件设计模式，如单例模式、工厂模式等' },
  { name: '微服务架构', description: '将应用拆分为多个独立服务的架构模式' },
  { name: '性能优化', description: '前端和后端性能优化策略' }
];

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : null;
    const options = {
      hostname: 'localhost',
      port: 1337,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': body ? Buffer.byteLength(body) : 0
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);
          if (res.statusCode >= 400) {
            reject(new Error(result.error?.message || `HTTP ${res.statusCode}`));
          } else {
            resolve(result);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
          } else {
            resolve({ data: responseBody });
          }
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  let sort = 1;
  for (const kp of knowledgePoints) {
    try {
      await request('POST', '/api/zhao-tag/v1/admin/knowledge-points', {
        name: kp.name,
        description: kp.description,
        group: { documentId: knowledgePointsGroupId },
        sort: sort++
      });
      console.log(`✓ Created: ${kp.name}`);
    } catch (err) {
      console.log(`✗ Failed: ${kp.name} - ${err.message}`);
    }
  }
  console.log('\n知识点数据添加完成！');
}

main().catch(err => console.error('Error:', err));

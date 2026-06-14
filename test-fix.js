const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsImVtYWlsIjoiMTExN0AxNjMuY29tIiwidXNlcm5hbWUiOiIxMTE3Iiwiemhhb1JvbGVzIjpbImFkbWluIl0sImlhdCI6MTc4MTI1ODQ4MSwiZXhwIjoxNzgzODUwNDgxfQ.KfTlWrz1XGX61svSDd1Zc7TXcXhWMiAizco-Xmt9kdc';

async function testUpdateCourse() {
  const courseId = 'laudaldvq00tsrx3turx9f1d';
  console.log('测试课程ID:', courseId);

  // 使用不存在的tag ID更新课程（应该触发验证错误）
  const invalidTagId = 'kihe0rryvpipb0e7k35m02us';
  const updateData = {
    data: {
      title: '测试课程标题',
      tags: [{ documentId: invalidTagId }],
      channelScope: 'all'
    }
  };

  try {
    const result = await request('PUT', `/api/zhao-course/v1/admin/courses/${courseId}`, updateData);
    console.log('更新成功:', result);
  } catch (err) {
    console.log('捕获到错误:', err.message);
    console.log('验证生效！现在可以返回更友好的错误信息');
  }
}

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

testUpdateCourse().catch(console.error);

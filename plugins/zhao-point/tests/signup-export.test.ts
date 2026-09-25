import {
  CSV_BOM,
  csvCell,
  formatCell,
  formatDateTimeCst,
  attendanceStatus,
  buildSignupCsv,
} from '../server/src/services/signup-export';

describe('活动名单导出纯逻辑', () => {
  test('CSV_BOM 是 UTF-8 BOM', () => {
    expect(CSV_BOM).toBe('\uFEFF');
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });

  test('formatCell：数组用「、」连接，空值转空串', () => {
    expect(formatCell(null)).toBe('');
    expect(formatCell(undefined)).toBe('');
    expect(formatCell('')).toBe('');
    expect(formatCell(0)).toBe('0');
    expect(formatCell(['茶道', '香道'])).toBe('茶道、香道');
    expect(formatCell(['茶道', '', '香道'])).toBe('茶道、香道');
    expect(formatCell([])).toBe('');
  });

  test('csvCell：统一双引号包裹，内部引号翻倍', () => {
    expect(csvCell('张三')).toBe('"张三"');
    expect(csvCell('含,逗号')).toBe('"含,逗号"');
    expect(csvCell('含"引号"')).toBe('"含""引号"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(12)).toBe('"12"');
    expect(csvCell(['a', 'b'])).toBe('"a、b"');
  });

  test('formatDateTimeCst：按 UTC+8 输出 YYYY-MM-DD HH:mm', () => {
    // 2026-09-26T01:30:00Z → 北京时间 09:30
    expect(formatDateTimeCst('2026-09-26T01:30:00.000Z')).toBe('2026-09-26 09:30');
    // 跨日：UTC 20:00 → 次日 04:00
    expect(formatDateTimeCst('2026-09-25T20:00:00.000Z')).toBe('2026-09-26 04:00');
    expect(formatDateTimeCst(new Date('2026-09-26T01:30:00.000Z'))).toBe('2026-09-26 09:30');
    expect(formatDateTimeCst(null)).toBe('');
    expect(formatDateTimeCst('')).toBe('');
    expect(formatDateTimeCst('不是时间')).toBe('');
  });

  test('到场状态推导：已取消 > 已到场 > 未到场', () => {
    const att = { method: 'worker_scan', checkinAt: '2026-09-26T01:30:00.000Z' };
    expect(attendanceStatus({ id: 1, status: 'active' }, undefined)).toBe('未到场');
    expect(attendanceStatus({ id: 1, status: 'active' }, att)).toBe('已到场');
    expect(attendanceStatus({ id: 1, status: 'waiting' }, undefined)).toBe('未到场');
    expect(attendanceStatus({ id: 1, status: 'waiting' }, att)).toBe('已到场');
    // 取消优先：即使有到场记录也显示已取消
    expect(attendanceStatus({ id: 1, status: 'cancelled' }, att)).toBe('已取消');
    expect(attendanceStatus({ id: 1, status: 'cancelled' }, undefined)).toBe('已取消');
  });

  test('buildSignupCsv：表头 = 9 固定列 + 动态表单列，带 BOM 与 CRLF', () => {
    const csv = buildSignupCsv({
      formFields: [{ key: 'name', label: '姓名' }, { key: 'phone', label: '手机号' }],
      signups: [
        {
          id: 11,
          status: 'active',
          pointsCharged: 50,
          signupAt: '2026-09-26T01:30:00.000Z',
          formData: { name: '张三', phone: '13800000000' },
          user: { id: 7, nickname: '小张' },
        },
      ],
      attendanceBySignupId: { '11': { method: 'manual', checkinAt: '2026-09-26T02:00:00.000Z' } },
    });

    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const body = csv.slice(1);
    const lines = body.split('\r\n');
    expect(lines[0]).toBe(
      '"序号","用户ID","昵称","报名状态","到场状态","核销方式","报名时间","到场时间","扣除积分","姓名","手机号"',
    );
    expect(lines[1]).toBe(
      '"1","7","小张","已报名","已到场","手动核销","2026-09-26 09:30","2026-09-26 10:00","50","张三","13800000000"',
    );
    expect(lines[2]).toBe(''); // 末尾 CRLF
  });

  test('buildSignupCsv：无到场记录=未到场、核销方式与到场时间为空；缺字段留空', () => {
    const csv = buildSignupCsv({
      formFields: [{ key: 'name', label: '姓名' }],
      signups: [
        { id: 1, status: 'waiting', pointsCharged: null, signupAt: null, formData: null, user: { id: 3, username: 'wx_3' } },
      ],
      attendanceBySignupId: null,
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toBe('"1","3","wx_3","候补中","未到场","","","","0",""');
  });

  test('buildSignupCsv：昵称缺失回退用户#id；取消报名显示已取消', () => {
    const csv = buildSignupCsv({
      signups: [{ id: 5, status: 'cancelled', pointsCharged: 0, formData: {}, user: { id: 9 } }],
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toBe('"1","9","用户#9","已取消","已取消","","","","0"');
  });

  test('buildSignupCsv：多行/逗号/引号取值不破坏列结构', () => {
    const csv = buildSignupCsv({
      formFields: [{ key: 'note', label: '备注' }],
      signups: [
        {
          id: 1,
          status: 'active',
          signupAt: '2026-09-26T01:30:00.000Z',
          formData: { note: '第一行\n第二行,带逗号"带引号"' },
          user: { id: 2, nickname: '甲' },
        },
      ],
    });
    const body = csv.slice(1);
    // 表头 + 1 数据行的「逻辑」行；换行被引号包裹，故按 CRLF 切只有 2 段 + 末尾空段
    const lines = body.split('\r\n');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('"第一行\n第二行,带逗号""带引号"""');
  });

  test('buildSignupCsv：空名单只输出表头', () => {
    const csv = buildSignupCsv({ signups: [], formFields: [] });
    expect(csv).toBe(`${CSV_BOM}"序号","用户ID","昵称","报名状态","到场状态","核销方式","报名时间","到场时间","扣除积分"\r\n`);
  });

  test('buildSignupCsv：问卷答卷出列，列名取题目文本，对象/数组 JSON.stringify', () => {
    const csv = buildSignupCsv({
      formFields: [{ key: 'name', label: '姓名' }],
      questionnaireFields: [
        { key: 'interest', label: '最喜欢的内容' },
        { key: 'times', label: '参与场次' },
      ],
      signups: [
        {
          id: 1,
          status: 'active',
          formData: { name: '张三' },
          preQuestionnaireData: { interest: ['茶道', '香道'], times: 3 },
          user: { id: 7, nickname: '小张' },
        },
      ],
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(
      '"序号","用户ID","昵称","报名状态","到场状态","核销方式","报名时间","到场时间","扣除积分","姓名","最喜欢的内容","参与场次"',
    );
    expect(lines[1]).toBe(
      '"1","7","小张","已报名","未到场","","","","0","张三","[""茶道"",""香道""]","3"',
    );
  });

  test('buildSignupCsv：无答卷不出问卷列（即使传了问卷字段配置）', () => {
    const csv = buildSignupCsv({
      questionnaireFields: [{ key: 'interest', label: '最喜欢的内容' }],
      signups: [{ id: 1, status: 'active', formData: {}, user: { id: 2 } }],
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(
      '"序号","用户ID","昵称","报名状态","到场状态","核销方式","报名时间","到场时间","扣除积分"',
    );
  });

  test('buildSignupCsv：答卷值含逗号/引号/换行不破坏列结构', () => {
    const csv = buildSignupCsv({
      signups: [
        {
          id: 1,
          status: 'active',
          preQuestionnaireData: { note: '第一行\n第二行,带逗号"带引号"' },
          user: { id: 2 },
        },
      ],
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines.length).toBe(3); // 换行被引号包裹，逻辑行仍为表头+1
    expect(lines[0]).toContain('"note"');
    expect(lines[1]).toContain('"第一行\n第二行,带逗号""带引号"""');
  });

  test('buildSignupCsv：问卷列取全部答卷 key 并集，按首次出现顺序稳定排序；无配置标题回退 key', () => {
    const csv = buildSignupCsv({
      questionnaireFields: [{ key: 'a', label: '题目A' }],
      signups: [
        { id: 1, status: 'active', preQuestionnaireData: { b: '乙1', a: '甲1' }, user: { id: 2 } },
        { id: 2, status: 'active', preQuestionnaireData: { c: '丙2', a: '甲2' }, user: { id: 3 } },
      ],
    });
    const lines = csv.slice(1).split('\r\n');
    // 并集按首次出现顺序：signup1 的 b、a，再 signup2 的 c（非字母序）
    expect(lines[0]).toBe(
      '"序号","用户ID","昵称","报名状态","到场状态","核销方式","报名时间","到场时间","扣除积分","b","题目A","c"',
    );
    expect(lines[1]).toBe(
      '"1","2","用户#2","已报名","未到场","","","","0","乙1","甲1",""',
    );
    expect(lines[2]).toBe(
      '"2","3","用户#3","已报名","未到场","","","","0","","甲2","丙2"',
    );
  });

  test('buildSignupCsv：关系字段以 {id:N} 对象形态入参也能正确归位（防 NaN 透传）', () => {
    // 模拟 strapi 查询结果：signup.user 为对象、attendanceBySignupId 的键为字符串化 id
    const csv = buildSignupCsv({
      formFields: [],
      signups: [
        { id: 21, status: 'active', formData: {}, user: { id: 8, nickname: '乙' } },
        { id: 22, status: 'active', formData: {}, user: null },
      ],
      attendanceBySignupId: { '22': { method: 'self', checkinAt: '2026-09-26T02:00:00.000Z' } },
    });
    const lines = csv.slice(1).split('\r\n');
    expect(lines[1]).toBe('"1","8","乙","已报名","未到场","","","","0"');
    expect(lines[2]).toBe('"2","","","已报名","已到场","自助核销","","2026-09-26 10:00","0"');
  });
});
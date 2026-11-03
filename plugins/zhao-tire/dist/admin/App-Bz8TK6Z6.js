"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const antd = require("antd");
const zhCN = require("antd/locale/zh_CN");
const reactRouterDom = require("react-router-dom");
const react = require("react");
const icons = require("@ant-design/icons");
const admin = require("@strapi/strapi/admin");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const zhCN__default = /* @__PURE__ */ _interopDefault(zhCN);
const API_BASE = "/api/zhao-tire/v1/admin";
const ME_URL = `${API_BASE}/me`;
const FULL_ROLES = ["strapi-super-admin", "tire-admin"];
const canFullAccess = (roleCodes) => roleCodes.some((code) => FULL_ROLES.includes(code));
const canStorageAccess = (roleCodes) => canFullAccess(roleCodes) || roleCodes.includes("tire-warehouse");
const errorMessage = (error) => {
  if (admin.isFetchError(error)) {
    const payload = error.response?.data;
    const message = payload?.message || payload?.error?.message || payload?.data?.message || error.message;
    const code = payload?.code || payload?.error?.name;
    return code ? `${message}（${code}）` : String(message);
  }
  if (error instanceof Error) return error.message;
  return String(error);
};
const readCookie = (name) => {
  try {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&")}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};
const getAdminToken = () => {
  try {
    const raw = window.localStorage.getItem("jwtToken");
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return readCookie("jwtToken");
};
const backendUrl = (url) => {
  const base = window.strapi?.backendURL || "";
  return url.startsWith("http") ? url : `${base}${url}`;
};
const patchJson = async (url, body) => {
  const token = getAdminToken();
  const response = await fetch(backendUrl(url), {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...token ? { Authorization: `Bearer ${token}` } : {}
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error?.message || `请求失败（${response.status}）`;
    throw new Error(message);
  }
  return payload;
};
const absoluteMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : backendUrl(url);
};
function useTireApi() {
  const { get, post, put, del } = admin.useFetchClient();
  const getMe = react.useCallback(async () => {
    try {
      const { data } = await get(ME_URL);
      const payload = data?.data ?? data ?? {};
      return {
        id: Number(payload.id) || 0,
        roleCodes: Array.isArray(payload.roleCodes) ? payload.roleCodes : []
      };
    } catch (error) {
      const { data } = await get("/admin/users/me");
      const payload = data?.data ?? data ?? {};
      const roles = Array.isArray(payload.roles) ? payload.roles : [];
      return {
        id: Number(payload.id) || 0,
        roleCodes: roles.map((role) => String(role?.code || "")).filter(Boolean)
      };
    }
  }, [get]);
  const listOrders = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/orders`, { params });
      return data;
    },
    [get]
  );
  const getOrder = react.useCallback(
    async (id) => {
      const { data } = await get(`${API_BASE}/orders/${id}`);
      return data?.data ?? data;
    },
    [get]
  );
  const updateOrder = react.useCallback(
    async (id, body) => {
      const { data } = await patchJson(`${API_BASE}/orders/${id}`, body);
      return data;
    },
    []
  );
  const orderAction = react.useCallback(
    async (id, action, body = {}) => {
      const { data } = await post(`${API_BASE}/orders/${id}/${action}`, body);
      return data;
    },
    [post]
  );
  const submitOrderPhotos = react.useCallback(
    async (id, action, files, extra = {}) => {
      const formData = new FormData();
      Object.entries(extra).forEach(([key, value]) => {
        if (value !== void 0 && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });
      files.forEach((file) => formData.append("photos", file));
      const { data } = await post(`${API_BASE}/orders/${id}/${action}`, formData);
      return data;
    },
    [post]
  );
  const exportOrders = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/orders/export.xlsx`, {
        params,
        responseType: "blob"
      });
      return data;
    },
    [get]
  );
  const listInventory = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/inventory`, { params });
      return data;
    },
    [get]
  );
  const listExpiring = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/inventory/expiring`, { params });
      return data;
    },
    [get]
  );
  const remindInventory = react.useCallback(
    async (ids) => {
      const { data } = await post(`${API_BASE}/inventory/remind`, { ids });
      return data;
    },
    [post]
  );
  const listCustomers = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/customers`, { params });
      return data;
    },
    [get]
  );
  const listCollection = react.useCallback(
    async (name) => {
      const { data } = await get(`${API_BASE}/${name}`);
      return (data?.data ?? data) || [];
    },
    [get]
  );
  const createCollection = react.useCallback(
    async (name, body) => {
      const { data } = await post(`${API_BASE}/${name}`, body);
      return data;
    },
    [post]
  );
  const updateCollection = react.useCallback(
    async (name, id, body) => {
      const { data } = await put(`${API_BASE}/${name}/${id}`, body);
      return data;
    },
    [put]
  );
  const removeCollection = react.useCallback(
    async (name, id) => {
      const { data } = await del(`${API_BASE}/${name}/${id}`);
      return data;
    },
    [del]
  );
  const getConfig = react.useCallback(async () => {
    const { data } = await get(`${API_BASE}/config`);
    return data?.data ?? data ?? {};
  }, [get]);
  const updateConfig = react.useCallback(
    async (body) => {
      const { data } = await put(`${API_BASE}/config`, body);
      return data?.data ?? data;
    },
    [put]
  );
  const listSmsLogs = react.useCallback(
    async (params) => {
      const { data } = await get(`${API_BASE}/sms-logs`, { params });
      return data;
    },
    [get]
  );
  const updateSmsLog = react.useCallback(async (id, body) => {
    const payload = await patchJson(`${API_BASE}/sms-logs/${id}`, body);
    return payload;
  }, []);
  const uploadImage = react.useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append("files", file);
      const { data } = await post("/upload", formData);
      const files = Array.isArray(data) ? data : [data];
      const uploaded = files.find(Boolean) || {};
      return {
        id: Number(uploaded.id) || 0,
        url: absoluteMediaUrl(uploaded.url),
        name: String(uploaded.name || file.name)
      };
    },
    [post]
  );
  return {
    getMe,
    listOrders,
    getOrder,
    updateOrder,
    orderAction,
    submitOrderPhotos,
    exportOrders,
    listInventory,
    listExpiring,
    remindInventory,
    listCustomers,
    listCollection,
    createCollection,
    updateCollection,
    removeCollection,
    getConfig,
    updateConfig,
    listSmsLogs,
    updateSmsLog,
    uploadImage
  };
}
const { Sider, Content } = antd.Layout;
const defaultState = {
  loading: true,
  me: null,
  canFull: false,
  canStorage: false
};
const PermissionContext = react.createContext(defaultState);
const usePermissions = () => react.useContext(PermissionContext);
const PermissionProvider = ({
  children
}) => {
  const { getMe } = useTireApi();
  const [state, setState] = react.useState(defaultState);
  react.useEffect(() => {
    let alive = true;
    getMe().then((me) => {
      if (!alive) return;
      setState({
        loading: false,
        me,
        canFull: canFullAccess(me.roleCodes),
        canStorage: canStorageAccess(me.roleCodes)
      });
    }).catch((error) => {
      if (!alive) return;
      setState({
        loading: false,
        me: null,
        canFull: false,
        canStorage: false,
        error: errorMessage(error)
      });
    });
    return () => {
      alive = false;
    };
  }, [getMe]);
  return /* @__PURE__ */ jsxRuntime.jsx(PermissionContext.Provider, { value: state, children });
};
const MENU_ITEMS = [
  { key: "orders", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ShoppingCartOutlined, {}), label: "订单管理" },
  { key: "inventory", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.DatabaseOutlined, {}), label: "仓储库存" },
  {
    key: "catalog",
    icon: /* @__PURE__ */ jsxRuntime.jsx(icons.AppstoreOutlined, {}),
    label: "套餐配置",
    fullOnly: true
  },
  {
    key: "customers",
    icon: /* @__PURE__ */ jsxRuntime.jsx(icons.TeamOutlined, {}),
    label: "客户管理",
    fullOnly: true
  },
  {
    key: "messages",
    icon: /* @__PURE__ */ jsxRuntime.jsx(icons.MessageOutlined, {}),
    label: "消息通知",
    fullOnly: true
  },
  {
    key: "content",
    icon: /* @__PURE__ */ jsxRuntime.jsx(icons.FileTextOutlined, {}),
    label: "站点内容",
    fullOnly: true
  }
];
const PluginLayout = ({ children }) => {
  const navigate = reactRouterDom.useNavigate();
  const location = reactRouterDom.useLocation();
  const permissions = usePermissions();
  const relative = location.pathname.split("/plugins/zhao-tire")[1] || "";
  const selectedKey = relative.replace(/^\//, "").split("/")[0] || "orders";
  const items = MENU_ITEMS.filter(
    (item) => !item.fullOnly || permissions.canFull
  ).map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label
  }));
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Layout, { style: { minHeight: "calc(100vh - 70px)" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(Sider, { width: 208, theme: "light", children: /* @__PURE__ */ jsxRuntime.jsx(
      antd.Menu,
      {
        mode: "inline",
        selectedKeys: [selectedKey],
        items,
        style: { height: "100%", borderRight: 0, paddingTop: 8 },
        onClick: ({ key }) => navigate(`/plugins/zhao-tire/${key}`)
      }
    ) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      Content,
      {
        style: {
          padding: 24,
          background: "#F5F7FA",
          overflowX: "auto"
        },
        children: permissions.loading ? /* @__PURE__ */ jsxRuntime.jsx("div", { style: { padding: 48, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Spin, {}) }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          permissions.error ? /* @__PURE__ */ jsxRuntime.jsx(
            antd.Alert,
            {
              type: "warning",
              showIcon: true,
              style: { marginBottom: 16 },
              message: `权限信息加载失败：${permissions.error}`
            }
          ) : null,
          children
        ] })
      }
    )
  ] });
};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var dayjs_min$1 = { exports: {} };
var dayjs_min = dayjs_min$1.exports;
var hasRequiredDayjs_min;
function requireDayjs_min() {
  if (hasRequiredDayjs_min) return dayjs_min$1.exports;
  hasRequiredDayjs_min = 1;
  (function(module2, exports2) {
    !(function(t, e) {
      module2.exports = e();
    })(dayjs_min, (function() {
      var t = 1e3, e = 6e4, n = 36e5, r = "millisecond", i = "second", s = "minute", u = "hour", a = "day", o = "week", c = "month", f = "quarter", h = "year", d = "date", l = "Invalid Date", $ = /^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[Tt\s]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/, y = /\[([^\]]+)]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g, M = { name: "en", weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"), months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"), ordinal: function(t2) {
        var e2 = ["th", "st", "nd", "rd"], n2 = t2 % 100;
        return "[" + t2 + (e2[(n2 - 20) % 10] || e2[n2] || e2[0]) + "]";
      } }, m = function(t2, e2, n2) {
        var r2 = String(t2);
        return !r2 || r2.length >= e2 ? t2 : "" + Array(e2 + 1 - r2.length).join(n2) + t2;
      }, v = { s: m, z: function(t2) {
        var e2 = -t2.utcOffset(), n2 = Math.abs(e2), r2 = Math.floor(n2 / 60), i2 = n2 % 60;
        return (e2 <= 0 ? "+" : "-") + m(r2, 2, "0") + ":" + m(i2, 2, "0");
      }, m: function t2(e2, n2) {
        if (e2.date() < n2.date()) return -t2(n2, e2);
        var r2 = 12 * (n2.year() - e2.year()) + (n2.month() - e2.month()), i2 = e2.clone().add(r2, c), s2 = n2 - i2 < 0, u2 = e2.clone().add(r2 + (s2 ? -1 : 1), c);
        return +(-(r2 + (n2 - i2) / (s2 ? i2 - u2 : u2 - i2)) || 0);
      }, a: function(t2) {
        return t2 < 0 ? Math.ceil(t2) || 0 : Math.floor(t2);
      }, p: function(t2) {
        return { M: c, y: h, w: o, d: a, D: d, h: u, m: s, s: i, ms: r, Q: f }[t2] || String(t2 || "").toLowerCase().replace(/s$/, "");
      }, u: function(t2) {
        return void 0 === t2;
      } }, g = "en", D = {};
      D[g] = M;
      var p = "$isDayjsObject", S = function(t2) {
        return t2 instanceof _ || !(!t2 || !t2[p]);
      }, w = function t2(e2, n2, r2) {
        var i2;
        if (!e2) return g;
        if ("string" == typeof e2) {
          var s2 = e2.toLowerCase();
          D[s2] && (i2 = s2), n2 && (D[s2] = n2, i2 = s2);
          var u2 = e2.split("-");
          if (!i2 && u2.length > 1) return t2(u2[0]);
        } else {
          var a2 = e2.name;
          D[a2] = e2, i2 = a2;
        }
        return !r2 && i2 && (g = i2), i2 || !r2 && g;
      }, O = function(t2, e2) {
        if (S(t2)) return t2.clone();
        var n2 = "object" == typeof e2 ? e2 : {};
        return n2.date = t2, n2.args = arguments, new _(n2);
      }, b = v;
      b.l = w, b.i = S, b.w = function(t2, e2) {
        return O(t2, { locale: e2.$L, utc: e2.$u, x: e2.$x, $offset: e2.$offset });
      };
      var _ = (function() {
        function M2(t2) {
          this.$L = w(t2.locale, null, true), this.parse(t2), this.$x = this.$x || t2.x || {}, this[p] = true;
        }
        var m2 = M2.prototype;
        return m2.parse = function(t2) {
          this.$d = (function(t3) {
            var e2 = t3.date, n2 = t3.utc;
            if (null === e2) return /* @__PURE__ */ new Date(NaN);
            if (b.u(e2)) return /* @__PURE__ */ new Date();
            if (e2 instanceof Date) return new Date(e2);
            if ("string" == typeof e2 && !/Z$/i.test(e2)) {
              var r2 = e2.match($);
              if (r2) {
                var i2 = r2[2] - 1 || 0, s2 = (r2[7] || "0").substring(0, 3);
                return n2 ? new Date(Date.UTC(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2)) : new Date(r2[1], i2, r2[3] || 1, r2[4] || 0, r2[5] || 0, r2[6] || 0, s2);
              }
            }
            return new Date(e2);
          })(t2), this.init();
        }, m2.init = function() {
          var t2 = this.$d;
          this.$y = t2.getFullYear(), this.$M = t2.getMonth(), this.$D = t2.getDate(), this.$W = t2.getDay(), this.$H = t2.getHours(), this.$m = t2.getMinutes(), this.$s = t2.getSeconds(), this.$ms = t2.getMilliseconds();
        }, m2.$utils = function() {
          return b;
        }, m2.isValid = function() {
          return !(this.$d.toString() === l);
        }, m2.isSame = function(t2, e2) {
          var n2 = O(t2);
          return this.startOf(e2) <= n2 && n2 <= this.endOf(e2);
        }, m2.isAfter = function(t2, e2) {
          return O(t2) < this.startOf(e2);
        }, m2.isBefore = function(t2, e2) {
          return this.endOf(e2) < O(t2);
        }, m2.$g = function(t2, e2, n2) {
          return b.u(t2) ? this[e2] : this.set(n2, t2);
        }, m2.unix = function() {
          return Math.floor(this.valueOf() / 1e3);
        }, m2.valueOf = function() {
          return this.$d.getTime();
        }, m2.startOf = function(t2, e2) {
          var n2 = this, r2 = !!b.u(e2) || e2, f2 = b.p(t2), l2 = function(t3, e3) {
            var i2 = b.w(n2.$u ? Date.UTC(n2.$y, e3, t3) : new Date(n2.$y, e3, t3), n2);
            return r2 ? i2 : i2.endOf(a);
          }, $2 = function(t3, e3) {
            return b.w(n2.toDate()[t3].apply(n2.toDate("s"), (r2 ? [0, 0, 0, 0] : [23, 59, 59, 999]).slice(e3)), n2);
          }, y2 = this.$W, M3 = this.$M, m3 = this.$D, v2 = "set" + (this.$u ? "UTC" : "");
          switch (f2) {
            case h:
              return r2 ? l2(1, 0) : l2(31, 11);
            case c:
              return r2 ? l2(1, M3) : l2(0, M3 + 1);
            case o:
              var g2 = this.$locale().weekStart || 0, D2 = (y2 < g2 ? y2 + 7 : y2) - g2;
              return l2(r2 ? m3 - D2 : m3 + (6 - D2), M3);
            case a:
            case d:
              return $2(v2 + "Hours", 0);
            case u:
              return $2(v2 + "Minutes", 1);
            case s:
              return $2(v2 + "Seconds", 2);
            case i:
              return $2(v2 + "Milliseconds", 3);
            default:
              return this.clone();
          }
        }, m2.endOf = function(t2) {
          return this.startOf(t2, false);
        }, m2.$set = function(t2, e2) {
          var n2, o2 = b.p(t2), f2 = "set" + (this.$u ? "UTC" : ""), l2 = (n2 = {}, n2[a] = f2 + "Date", n2[d] = f2 + "Date", n2[c] = f2 + "Month", n2[h] = f2 + "FullYear", n2[u] = f2 + "Hours", n2[s] = f2 + "Minutes", n2[i] = f2 + "Seconds", n2[r] = f2 + "Milliseconds", n2)[o2], $2 = o2 === a ? this.$D + (e2 - this.$W) : e2;
          if (o2 === c || o2 === h) {
            var y2 = this.clone().set(d, 1);
            y2.$d[l2]($2), y2.init(), this.$d = y2.set(d, Math.min(this.$D, y2.daysInMonth())).$d;
          } else l2 && this.$d[l2]($2);
          return this.init(), this;
        }, m2.set = function(t2, e2) {
          return this.clone().$set(t2, e2);
        }, m2.get = function(t2) {
          return this[b.p(t2)]();
        }, m2.add = function(r2, f2) {
          var d2, l2 = this;
          r2 = Number(r2);
          var $2 = b.p(f2), y2 = function(t2) {
            var e2 = O(l2);
            return b.w(e2.date(e2.date() + Math.round(t2 * r2)), l2);
          };
          if ($2 === c) return this.set(c, this.$M + r2);
          if ($2 === h) return this.set(h, this.$y + r2);
          if ($2 === a) return y2(1);
          if ($2 === o) return y2(7);
          var M3 = (d2 = {}, d2[s] = e, d2[u] = n, d2[i] = t, d2)[$2] || 1, m3 = this.$d.getTime() + r2 * M3;
          return b.w(m3, this);
        }, m2.subtract = function(t2, e2) {
          return this.add(-1 * t2, e2);
        }, m2.format = function(t2) {
          var e2 = this, n2 = this.$locale();
          if (!this.isValid()) return n2.invalidDate || l;
          var r2 = t2 || "YYYY-MM-DDTHH:mm:ssZ", i2 = b.z(this), s2 = this.$H, u2 = this.$m, a2 = this.$M, o2 = n2.weekdays, c2 = n2.months, f2 = n2.meridiem, h2 = function(t3, n3, i3, s3) {
            return t3 && (t3[n3] || t3(e2, r2)) || i3[n3].slice(0, s3);
          }, d2 = function(t3) {
            return b.s(s2 % 12 || 12, t3, "0");
          }, $2 = f2 || function(t3, e3, n3) {
            var r3 = t3 < 12 ? "AM" : "PM";
            return n3 ? r3.toLowerCase() : r3;
          };
          return r2.replace(y, (function(t3, r3) {
            return r3 || (function(t4) {
              switch (t4) {
                case "YY":
                  return String(e2.$y).slice(-2);
                case "YYYY":
                  return b.s(e2.$y, 4, "0");
                case "M":
                  return a2 + 1;
                case "MM":
                  return b.s(a2 + 1, 2, "0");
                case "MMM":
                  return h2(n2.monthsShort, a2, c2, 3);
                case "MMMM":
                  return h2(c2, a2);
                case "D":
                  return e2.$D;
                case "DD":
                  return b.s(e2.$D, 2, "0");
                case "d":
                  return String(e2.$W);
                case "dd":
                  return h2(n2.weekdaysMin, e2.$W, o2, 2);
                case "ddd":
                  return h2(n2.weekdaysShort, e2.$W, o2, 3);
                case "dddd":
                  return o2[e2.$W];
                case "H":
                  return String(s2);
                case "HH":
                  return b.s(s2, 2, "0");
                case "h":
                  return d2(1);
                case "hh":
                  return d2(2);
                case "a":
                  return $2(s2, u2, true);
                case "A":
                  return $2(s2, u2, false);
                case "m":
                  return String(u2);
                case "mm":
                  return b.s(u2, 2, "0");
                case "s":
                  return String(e2.$s);
                case "ss":
                  return b.s(e2.$s, 2, "0");
                case "SSS":
                  return b.s(e2.$ms, 3, "0");
                case "Z":
                  return i2;
              }
              return null;
            })(t3) || i2.replace(":", "");
          }));
        }, m2.utcOffset = function() {
          return 15 * -Math.round(this.$d.getTimezoneOffset() / 15);
        }, m2.diff = function(r2, d2, l2) {
          var $2, y2 = this, M3 = b.p(d2), m3 = O(r2), v2 = (m3.utcOffset() - this.utcOffset()) * e, g2 = this - m3, D2 = function() {
            return b.m(y2, m3);
          };
          switch (M3) {
            case h:
              $2 = D2() / 12;
              break;
            case c:
              $2 = D2();
              break;
            case f:
              $2 = D2() / 3;
              break;
            case o:
              $2 = (g2 - v2) / 6048e5;
              break;
            case a:
              $2 = (g2 - v2) / 864e5;
              break;
            case u:
              $2 = g2 / n;
              break;
            case s:
              $2 = g2 / e;
              break;
            case i:
              $2 = g2 / t;
              break;
            default:
              $2 = g2;
          }
          return l2 ? $2 : b.a($2);
        }, m2.daysInMonth = function() {
          return this.endOf(c).$D;
        }, m2.$locale = function() {
          return D[this.$L];
        }, m2.locale = function(t2, e2) {
          if (!t2) return this.$L;
          var n2 = this.clone(), r2 = w(t2, e2, true);
          return r2 && (n2.$L = r2), n2;
        }, m2.clone = function() {
          return b.w(this.$d, this);
        }, m2.toDate = function() {
          return new Date(this.valueOf());
        }, m2.toJSON = function() {
          return this.isValid() ? this.toISOString() : null;
        }, m2.toISOString = function() {
          return this.$d.toISOString();
        }, m2.toString = function() {
          return this.$d.toUTCString();
        }, M2;
      })(), Y = _.prototype;
      return O.prototype = Y, [["$ms", r], ["$s", i], ["$m", s], ["$H", u], ["$W", a], ["$M", c], ["$y", h], ["$D", d]].forEach((function(t2) {
        Y[t2[1]] = function(e2) {
          return this.$g(e2, t2[0], t2[1]);
        };
      })), O.extend = function(t2, e2) {
        return t2.$i || (t2(e2, _, O), t2.$i = true), O;
      }, O.locale = w, O.isDayjs = S, O.unix = function(t2) {
        return O(1e3 * t2);
      }, O.en = D[g], O.Ls = D, O.p = {}, O;
    }));
  })(dayjs_min$1);
  return dayjs_min$1.exports;
}
var dayjs_minExports = requireDayjs_min();
const dayjs = /* @__PURE__ */ getDefaultExportFromCjs(dayjs_minExports);
const WARM = "#E0523F";
const STATUS_TEXT = {
  pending_accept: "待接单",
  accepted: "待入库",
  stored: "寄存中",
  pending_outbound: "待出库",
  completed: "已完成",
  rejected: "已拒绝",
  canceled: "已取消"
};
const STATUS_COLOR = {
  pending_accept: "gold",
  accepted: "blue",
  stored: "green",
  pending_outbound: "cyan",
  completed: "default",
  rejected: "red",
  canceled: "default"
};
const SERVICE_TEXT = {
  store: "到店送存",
  pickup: "上门取送"
};
const CAR_TEXT = {
  sedan: "轿车",
  suv: "SUV",
  pickup: "皮卡"
};
const PAYMENT_TEXT = {
  unpaid: "未支付",
  deposit_paid: "已付定金",
  paid: "已支付"
};
const PAYMENT_METHOD_TEXT = {
  store_pay: "到店支付",
  deposit: "定金",
  full: "全额"
};
const SLOT_TEXT = {
  morning: "上午",
  afternoon: "下午"
};
const OUTBOUND_TEXT = {
  none: "未申请",
  pending: "审核中",
  approved: "已通过",
  rejected: "已驳回"
};
const TIMELINE_TEXT = {
  created: "提交订单",
  accepted: "商家接单",
  rejected: "商家拒绝",
  canceled: "订单取消",
  inbound: "入库登记",
  outbound_requested: "客户申请出库",
  outbound_approved: "出库申请通过",
  outbound_rejected: "出库申请驳回",
  outbound_done: "出库完成",
  renewed: "续费",
  payment: "收款登记",
  updated: "后台修改"
};
const SMS_TYPE_TEXT = {
  order_created: "下单成功",
  accepted: "已接单",
  inbound: "入库完成",
  due_7: "到期前 7 天",
  due_3: "到期前 3 天",
  outbound_done: "出库完成",
  manual: "手动提醒"
};
const SMS_STATUS_TEXT = {
  pending: "待发送",
  sent: "已发送",
  skipped: "已跳过"
};
const SMS_STATUS_COLOR = {
  pending: "gold",
  sent: "green",
  skipped: "default"
};
const money = (cents) => {
  const value = Number(cents);
  return `¥${((Number.isFinite(value) ? value : 0) / 100).toFixed(2)}`;
};
const yuanToCents = (value) => Math.round((Number(value) || 0) * 100);
const centsToYuan = (value) => Math.round(Number(value) || 0) / 100;
const dateText = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};
const pad2 = (value) => String(value).padStart(2, "0");
const dateTimeText = (value) => {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1e3);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(
    shifted.getUTCDate()
  )} ${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
};
const remainingText = (days) => {
  const value = Number(days);
  if (!Number.isFinite(value)) return "-";
  if (value > 0) return `剩 ${value} 天`;
  if (value === 0) return "今天到期";
  return `超期 ${Math.abs(value)} 天`;
};
const remainingColor = (days) => Number(days) <= 7 ? WARM : "#1f2937";
const linesToArray = (text) => String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
const StatusTag = ({ status, prefix }) => {
  const key = String(status || "");
  const color = STATUS_COLOR[key];
  return /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color, bordered: color !== "default", children: prefix ? `${prefix}${STATUS_TEXT[key] || key || "-"}` : STATUS_TEXT[key] || key || "-" });
};
const PhotoUploader = ({ max = 6, disabled, onChange }) => {
  const [fileList, setFileList] = react.useState([]);
  const [preview, setPreview] = react.useState("");
  const handleChange = ({ fileList: next }) => {
    const limited = (next || []).slice(0, max).map((item) => ({
      ...item,
      thumbUrl: item.thumbUrl || (item.originFileObj ? URL.createObjectURL(item.originFileObj) : void 0)
    }));
    setFileList(limited);
    const files = limited.map((item) => item.originFileObj).filter(Boolean);
    onChange?.(files);
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Upload,
      {
        accept: "image/*",
        multiple: true,
        listType: "picture-card",
        fileList,
        maxCount: max,
        disabled,
        beforeUpload: () => false,
        onChange: handleChange,
        onPreview: (file) => setPreview(file.thumbUrl || file.url || ""),
        children: fileList.length >= max ? null : /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginTop: 6, fontSize: 12 }, children: "上传照片" })
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: [
      "最多 ",
      max,
      " 张，支持 JPG/PNG；提交时随表单一起上传。"
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: !!preview,
        footer: null,
        onCancel: () => setPreview(""),
        width: 720,
        children: preview ? /* @__PURE__ */ jsxRuntime.jsx("img", { src: preview, style: { width: "100%" }, alt: "预览" }) : null
      }
    )
  ] });
};
const MediaPicker = ({ value, onChange, disabled, hint }) => {
  const { uploadImage } = useTireApi();
  const [uploading, setUploading] = react.useState(false);
  const beforeUpload = async (file) => {
    setUploading(true);
    try {
      const uploaded = await uploadImage(file);
      if (!uploaded.id) throw new Error("上传返回的图片 id 为空");
      onChange?.({ id: uploaded.id, url: uploaded.url });
      antd.message.success("图片已上传");
    } catch (error) {
      antd.message.error(`上传失败：${errorMessage(error)}`);
    } finally {
      setUploading(false);
    }
    return antd.Upload.LIST_IGNORE;
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [
    value?.url ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { align: "start", children: [
      /* @__PURE__ */ jsxRuntime.jsx(antd.Image, { src: value.url, width: 96, height: 96, style: { objectFit: "cover" } }),
      !disabled ? /* @__PURE__ */ jsxRuntime.jsx(
        antd.Button,
        {
          size: "small",
          danger: true,
          icon: /* @__PURE__ */ jsxRuntime.jsx(icons.DeleteOutlined, {}),
          onClick: () => onChange?.(null),
          children: "移除"
        }
      ) : null
    ] }) : null,
    !disabled ? /* @__PURE__ */ jsxRuntime.jsx(
      antd.Upload,
      {
        accept: "image/*",
        showUploadList: false,
        beforeUpload,
        disabled: uploading,
        children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.UploadOutlined, {}), loading: uploading, children: "选择图片" })
      }
    ) : null,
    hint ? /* @__PURE__ */ jsxRuntime.jsx(antd.Typography.Text, { type: "secondary", style: { fontSize: 12 }, children: hint }) : null
  ] });
};
const { RangePicker } = antd.DatePicker;
const { CheckableTag } = antd.Tag;
const { Text: Text$6 } = antd.Typography;
const STATUS_FILTERS = [
  { value: "", label: "全部" },
  ...Object.keys(STATUS_TEXT).map((key) => ({
    value: key,
    label: STATUS_TEXT[key]
  }))
];
const daysLeft = (value) => {
  if (!value) return 0;
  const target = dayjs(String(value).slice(0, 10)).startOf("day");
  return target.diff(dayjs().startOf("day"), "day");
};
const ACTION_TITLE = {
  inbound: "入库登记",
  outbound: "出库登记",
  edit: "修改订单",
  reject: "拒绝订单",
  "reject-outbound": "驳回出库申请",
  payment: "收款登记"
};
const ACTION_CONFIRM = {
  inbound: "确认入库",
  outbound: "确认出库",
  edit: "保存修改",
  reject: "确认拒绝",
  "reject-outbound": "确认驳回",
  payment: "登记收款"
};
const OrderActionDrawer = ({
  action,
  onClose,
  onDone
}) => {
  const { type, order } = action;
  const api = useTireApi();
  const [form] = antd.Form.useForm();
  const [photos, setPhotos] = react.useState([]);
  const [locationCode, setLocationCode] = react.useState(order.locationCode || "");
  const [reason, setReason] = react.useState("");
  const [amountYuan, setAmountYuan] = react.useState(
    Math.max(0, ((order.amountTotal || 0) - (order.paidAmount || 0)) / 100)
  );
  const [paymentMethod, setPaymentMethod] = react.useState(
    order.paymentMethod || "store_pay"
  );
  const [submitting, setSubmitting] = react.useState(false);
  react.useEffect(() => {
    if (type !== "edit") return;
    form.setFieldsValue({
      customerName: order.customerName,
      phone: order.phone,
      plateNo: order.plateNo || "",
      carType: order.carType,
      tireSpec: order.tireSpec || "",
      withWheelRim: Boolean(order.withWheelRim),
      serviceType: order.serviceType,
      pickupDate: order.pickupDate ? dayjs(order.pickupDate) : null,
      pickupSlot: order.pickupSlot || void 0,
      storageStartDate: order.storageStartDate ? dayjs(order.storageStartDate) : null,
      expectedReturnDate: order.expectedReturnDate ? dayjs(order.expectedReturnDate) : null,
      locationCode: order.locationCode || "",
      note: order.note || ""
    });
  }, [type, order, form]);
  const submit = async () => {
    setSubmitting(true);
    try {
      if (type === "inbound") {
        if (!locationCode.trim()) {
          antd.message.warning("请填写仓位编号");
          return;
        }
        if (photos.length === 0) {
          antd.message.warning("请至少上传一张入库照片");
          return;
        }
        await api.submitOrderPhotos(order.id, "inbound", photos, {
          locationCode: locationCode.trim()
        });
        antd.message.success("入库成功");
      } else if (type === "outbound") {
        if (photos.length === 0) {
          antd.message.warning("请至少上传一张出库照片");
          return;
        }
        await api.submitOrderPhotos(order.id, "outbound", photos);
        antd.message.success("出库成功");
      } else if (type === "reject") {
        if (!reason.trim()) {
          antd.message.warning("请填写拒绝原因");
          return;
        }
        await api.orderAction(order.id, "reject", { reason: reason.trim() });
        antd.message.success("已拒绝订单");
      } else if (type === "reject-outbound") {
        if (!reason.trim()) {
          antd.message.warning("请填写驳回原因");
          return;
        }
        await api.orderAction(order.id, "reject-outbound", {
          reason: reason.trim()
        });
        antd.message.success("已驳回出库申请");
      } else if (type === "payment") {
        const amount = yuanToCents(amountYuan);
        if (amount <= 0) {
          antd.message.warning("收款金额必须大于 0");
          return;
        }
        await api.orderAction(order.id, "payment", {
          amount,
          paymentMethod
        });
        antd.message.success("收款已登记");
      } else if (type === "edit") {
        const values = await form.validateFields();
        const payload = {
          customerName: String(values.customerName || "").trim(),
          phone: String(values.phone || "").trim(),
          plateNo: String(values.plateNo || "").trim(),
          tireSpec: String(values.tireSpec || "").trim(),
          carType: values.carType,
          withWheelRim: Boolean(values.withWheelRim),
          serviceType: values.serviceType,
          locationCode: String(values.locationCode || "").trim(),
          note: String(values.note || "")
        };
        if (values.pickupDate) {
          payload.pickupDate = values.pickupDate.format("YYYY-MM-DD");
        }
        if (values.pickupSlot) payload.pickupSlot = values.pickupSlot;
        if (values.storageStartDate) {
          payload.storageStartDate = values.storageStartDate.format(
            "YYYY-MM-DD"
          );
        }
        if (values.expectedReturnDate) {
          payload.expectedReturnDate = values.expectedReturnDate.format(
            "YYYY-MM-DD"
          );
        }
        await api.updateOrder(order.id, payload);
        antd.message.success("订单已更新");
      }
      onDone();
      onClose();
    } catch (error) {
      antd.message.error(`操作失败：${errorMessage(error)}`);
    } finally {
      setSubmitting(false);
    }
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(
    antd.Drawer,
    {
      title: `${ACTION_TITLE[type]} · ${order.orderNo}`,
      open: true,
      width: type === "edit" ? 560 : 480,
      onClose,
      styles: { body: { padding: 24 } },
      footer: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { style: { float: "right" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: onClose, children: "取消" }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", loading: submitting, onClick: submit, children: ACTION_CONFIRM[type] })
      ] }),
      children: [
        type === "inbound" || type === "outbound" ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            "客户：",
            order.customerName,
            "（",
            order.phone,
            "），车牌 ",
            order.plateNo || "-"
          ] }),
          type === "inbound" ? /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8 }, children: "仓位编号" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Input,
              {
                value: locationCode,
                onChange: (event) => setLocationCode(event.target.value),
                placeholder: "如 A-01-3",
                maxLength: 32
              }
            )
          ] }) : null,
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8 }, children: type === "inbound" ? "入库照片" : "出库照片" }),
            /* @__PURE__ */ jsxRuntime.jsx(PhotoUploader, { max: 4, onChange: setPhotos })
          ] })
        ] }) : null,
        type === "reject" || type === "reject-outbound" ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: type === "reject" ? "拒绝后订单状态变为「已拒绝」。" : "驳回后客户可重新提交出库申请。" }),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Input.TextArea,
            {
              rows: 4,
              value: reason,
              onChange: (event) => setReason(event.target.value),
              placeholder: "请填写原因，方便后续追溯"
            }
          )
        ] }) : null,
        type === "payment" ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            "订单总额 ",
            money(order.amountTotal),
            "，已收 ",
            money(order.paidAmount)
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8 }, children: "收款金额（元）" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.InputNumber,
              {
                min: 0,
                precision: 2,
                step: 0.01,
                value: amountYuan,
                onChange: (value) => setAmountYuan(Number(value) || 0),
                style: { width: "100%" }
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntime.jsx("div", { style: { marginBottom: 8 }, children: "支付方式" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
              {
                value: paymentMethod,
                onChange: setPaymentMethod,
                options: Object.keys(PAYMENT_METHOD_TEXT).map((value) => ({
                  value,
                  label: PAYMENT_METHOD_TEXT[value]
                })),
                style: { width: "100%" }
              }
            )
          ] })
        ] }) : null,
        type === "edit" ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "customerName",
              label: "客户姓名",
              rules: [{ required: true, message: "请填写客户姓名" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {})
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "phone",
              label: "手机号",
              rules: [
                { required: true, message: "请填写手机号" },
                { pattern: /^1[3-9]\d{9}$/, message: "手机号格式不正确" }
              ],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 11 })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "plateNo", label: "车牌号", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "carType", label: "车型", children: /* @__PURE__ */ jsxRuntime.jsx(
            antd.Select,
            {
              options: Object.keys(CAR_TEXT).map((value) => ({
                value,
                label: CAR_TEXT[value]
              }))
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "tireSpec", label: "轮胎规格", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "withWheelRim", label: "带轮毂", valuePropName: "checked", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "serviceType", label: "服务类型", children: /* @__PURE__ */ jsxRuntime.jsx(
            antd.Select,
            {
              options: Object.keys(SERVICE_TEXT).map((value) => ({
                value,
                label: SERVICE_TEXT[value]
              }))
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "pickupDate", label: "上门日期", children: /* @__PURE__ */ jsxRuntime.jsx(antd.DatePicker, { style: { width: "100%" } }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "pickupSlot", label: "上门时段", children: /* @__PURE__ */ jsxRuntime.jsx(
            antd.Select,
            {
              allowClear: true,
              options: Object.keys(SLOT_TEXT).map((value) => ({
                value,
                label: SLOT_TEXT[value]
              }))
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "storageStartDate", label: "寄存开始日", children: /* @__PURE__ */ jsxRuntime.jsx(antd.DatePicker, { style: { width: "100%" } }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "expectedReturnDate", label: "预计取回日", children: /* @__PURE__ */ jsxRuntime.jsx(antd.DatePicker, { style: { width: "100%" } }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "locationCode", label: "仓位编号", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "note", label: "备注", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 3 }) })
        ] }) : null
      ]
    }
  );
};
const OrdersPage = () => {
  const api = useTireApi();
  const { canFull, canStorage } = usePermissions();
  const [filters, setFilters] = react.useState({});
  const [page, setPage] = react.useState(1);
  const [pageSize, setPageSize] = react.useState(20);
  const [rows, setRows] = react.useState([]);
  const [total, setTotal] = react.useState(0);
  const [loading, setLoading] = react.useState(false);
  const [detail, setDetail] = react.useState(null);
  const [detailOpen, setDetailOpen] = react.useState(false);
  const [detailLoading, setDetailLoading] = react.useState(false);
  const [action, setAction] = react.useState(null);
  const loadOrders = async () => {
    setLoading(true);
    try {
      const result = await api.listOrders({ ...filters, page, pageSize });
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      antd.message.error(`加载订单失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    loadOrders();
  }, [
    page,
    pageSize,
    filters.status,
    filters.serviceType,
    filters.keyword,
    filters.dateFrom,
    filters.dateTo
  ]);
  const openDetail = async (order) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      setDetail(await api.getOrder(order.id));
    } catch (error) {
      antd.message.error(`加载订单详情失败：${errorMessage(error)}`);
    } finally {
      setDetailLoading(false);
    }
  };
  const refreshDetail = async (order) => {
    try {
      setDetail(await api.getOrder(order.id));
    } catch {
    }
  };
  const runAction = async (record, actionName, body = {}, success = "操作成功") => {
    try {
      await api.orderAction(record.id, actionName, body);
      antd.message.success(success);
      await loadOrders();
      if (detailOpen && detail?.id === record.id) await refreshDetail(record);
    } catch (error) {
      antd.message.error(`操作失败：${errorMessage(error)}`);
    }
  };
  const handleExport = async () => {
    try {
      const blob = await api.exportOrders({ ...filters });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `雪地胎订单-${dayjs().format("YYYYMMDD")}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      antd.message.error(`导出失败：${errorMessage(error)}`);
    }
  };
  const handleDone = async () => {
    await loadOrders();
    if (detailOpen && detail) {
      try {
        setDetail(await api.getOrder(detail.id));
      } catch {
      }
    }
  };
  const columns = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 150,
      render: (value, record) => /* @__PURE__ */ jsxRuntime.jsx("a", { onClick: () => openDetail(record), children: value })
    },
    {
      title: "客户",
      width: 170,
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { children: record.customerName }),
        /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: record.phone })
      ] })
    },
    {
      title: "车牌",
      dataIndex: "plateNo",
      width: 110,
      render: (value) => value || "-"
    },
    {
      title: "服务",
      dataIndex: "serviceType",
      width: 100,
      render: (value) => SERVICE_TEXT[value] || value
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (value, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 0, children: [
        /* @__PURE__ */ jsxRuntime.jsx(StatusTag, { status: value }),
        record.status === "stored" && record.outboundRequestStatus === "pending" ? /* @__PURE__ */ jsxRuntime.jsx(Text$6, { style: { fontSize: 12, color: "#E0523F" }, children: "出库申请待审" }) : null
      ] })
    },
    {
      title: "金额",
      dataIndex: "amountTotal",
      width: 110,
      align: "right",
      render: (value, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 0, style: { alignItems: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntime.jsx("span", { children: money(value) }),
        /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", style: { fontSize: 12 }, children: PAYMENT_TEXT[record.paymentStatus] || record.paymentStatus })
      ] })
    },
    {
      title: "到期",
      width: 130,
      render: (_, record) => {
        const days = daysLeft(record.expireAt);
        const isActive = record.status === "stored" || record.status === "pending_outbound";
        return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 0, children: [
          /* @__PURE__ */ jsxRuntime.jsx("span", { children: dateText(record.expireAt) }),
          isActive ? /* @__PURE__ */ jsxRuntime.jsx(Text$6, { style: { fontSize: 12, color: remainingColor(days) }, children: remainingText(days) }) : null
        ] });
      }
    },
    {
      title: "操作",
      key: "actions",
      width: 260,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { wrap: true, size: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openDetail(record), children: "详情" }),
        record.status === "pending_accept" && canFull ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Popconfirm,
            {
              title: "确认接单？",
              onConfirm: () => runAction(record, "accept", {}, "已接单"),
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", children: "接单" })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              size: "small",
              type: "link",
              danger: true,
              onClick: () => setAction({ type: "reject", order: record }),
              children: "拒绝"
            }
          )
        ] }) : null,
        record.status === "accepted" && canStorage ? /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            onClick: () => setAction({ type: "inbound", order: record }),
            children: "入库"
          }
        ) : null,
        record.status === "stored" && record.outboundRequestStatus === "pending" && canFull ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Popconfirm,
            {
              title: "通过该出库申请？",
              onConfirm: () => runAction(record, "approve-outbound", {}, "已通过出库申请"),
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", children: "通过出库" })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              size: "small",
              type: "link",
              danger: true,
              onClick: () => setAction({ type: "reject-outbound", order: record }),
              children: "驳回出库"
            }
          )
        ] }) : null,
        record.status === "pending_outbound" && canStorage ? /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            onClick: () => setAction({ type: "outbound", order: record }),
            children: "出库"
          }
        ) : null,
        canFull ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              size: "small",
              type: "link",
              icon: /* @__PURE__ */ jsxRuntime.jsx(icons.EditOutlined, {}),
              onClick: () => setAction({ type: "edit", order: record }),
              children: "改单"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              size: "small",
              type: "link",
              onClick: () => setAction({ type: "payment", order: record }),
              children: "收款"
            }
          )
        ] }) : null
      ] })
    }
  ];
  const detailPhotos = (photos) => {
    if (!photos || photos.length === 0) {
      return /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: "暂无照片" });
    }
    return /* @__PURE__ */ jsxRuntime.jsx(antd.Image.PreviewGroup, { children: /* @__PURE__ */ jsxRuntime.jsx(antd.Space, { wrap: true, children: photos.map((photo) => /* @__PURE__ */ jsxRuntime.jsx(
      antd.Image,
      {
        src: absoluteMediaUrl(photo.url),
        width: 88,
        height: 88,
        style: { objectFit: "cover", borderRadius: 6 }
      },
      photo.id
    )) }) });
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsxs(
      "div",
      {
        style: {
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
          marginBottom: 16
        },
        children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Card,
            {
              style: { width: 240, flex: "0 0 240px" },
              styles: { body: { padding: 16 } },
              children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [
                /* @__PURE__ */ jsxRuntime.jsx(Text$6, { strong: true, children: "订单状态" }),
                /* @__PURE__ */ jsxRuntime.jsx(antd.Space, { wrap: true, size: 4, children: STATUS_FILTERS.map((item) => /* @__PURE__ */ jsxRuntime.jsx(
                  CheckableTag,
                  {
                    checked: (filters.status || "") === item.value,
                    onChange: () => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        status: item.value || void 0
                      }));
                    },
                    children: item.label
                  },
                  item.value || "all"
                )) }),
                /* @__PURE__ */ jsxRuntime.jsx(Text$6, { strong: true, children: "服务类型" }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  antd.Select,
                  {
                    allowClear: true,
                    placeholder: "全部服务",
                    style: { width: "100%" },
                    value: filters.serviceType,
                    onChange: (value) => {
                      setPage(1);
                      setFilters((prev) => ({ ...prev, serviceType: value }));
                    },
                    options: Object.keys(SERVICE_TEXT).map((value) => ({
                      value,
                      label: SERVICE_TEXT[value]
                    }))
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(Text$6, { strong: true, children: "下单日期" }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  RangePicker,
                  {
                    style: { width: "100%" },
                    value: filters.dateFrom && filters.dateTo ? [dayjs(filters.dateFrom), dayjs(filters.dateTo)] : null,
                    onChange: (values) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        dateFrom: values?.[0]?.format("YYYY-MM-DD"),
                        dateTo: values?.[1]?.format("YYYY-MM-DD")
                      }));
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(Text$6, { strong: true, children: "关键词" }),
                /* @__PURE__ */ jsxRuntime.jsx(
                  antd.Input.Search,
                  {
                    allowClear: true,
                    placeholder: "订单号 / 手机号 / 车牌 / 姓名",
                    style: { width: "100%" },
                    onSearch: (value) => {
                      setPage(1);
                      setFilters((prev) => ({
                        ...prev,
                        keyword: value.trim() || void 0
                      }));
                    }
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { wrap: true, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: () => loadOrders(), children: "刷新" }),
                  canFull ? /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.DownloadOutlined, {}), onClick: handleExport, children: "导出 Excel" }) : null
                ] })
              ] })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx("div", { style: { flex: 1, minWidth: 0 }, children: /* @__PURE__ */ jsxRuntime.jsx(
            antd.Table,
            {
              rowKey: "id",
              size: "middle",
              loading,
              columns,
              dataSource: rows,
              scroll: { x: 1180 },
              pagination: {
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showTotal: (value) => `共 ${value} 单`,
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                }
              }
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Drawer,
      {
        title: detail ? `订单详情 · ${detail.orderNo}` : "订单详情",
        open: detailOpen,
        width: 760,
        onClose: () => setDetailOpen(false),
        loading: detailLoading,
        styles: { body: { padding: 24 } },
        extra: detail ? /* @__PURE__ */ jsxRuntime.jsx(StatusTag, { status: detail.status }) : null,
        children: detail ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 20, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 2, size: "small", bordered: true, title: "客户与车辆", children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "客户姓名", children: detail.customerName }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "手机号", children: detail.phone }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "车牌号", children: detail.plateNo || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "车型", children: CAR_TEXT[detail.carType] || detail.carType }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "轮胎规格", children: detail.tireSpec || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "带轮毂", children: detail.withWheelRim ? "是" : "否" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 2, size: "small", bordered: true, title: "服务与寄存", children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "服务类型", children: SERVICE_TEXT[detail.serviceType] || detail.serviceType }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "取回方式", children: detail.returnMethod || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "上门日期", children: dateText(detail.pickupDate) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "上门时段", children: SLOT_TEXT[detail.pickupSlot] || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "寄存开始日", children: dateText(detail.storageStartDate) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "预计取回日", children: dateText(detail.expectedReturnDate) }),
            /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions.Item, { label: "寄存月数", children: [
              detail.months || 0,
              " 个月"
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "到期日", children: dateText(detail.expireAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "仓位编号", children: detail.locationCode || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "入库时间", children: dateTimeText(detail.inboundAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "出库时间", children: dateTimeText(detail.outboundAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "出库申请", children: OUTBOUND_TEXT[detail.outboundRequestStatus] || detail.outboundRequestStatus || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "申请时间", children: dateTimeText(detail.outboundRequestedAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "出库备注", children: detail.outboundNote || "-" })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 2, size: "small", bordered: true, title: "费用", children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "套餐费", children: money(detail.amountPackage) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "增值费", children: money(detail.amountAddon) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "订单总额", children: money(detail.amountTotal) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "已收金额", children: money(detail.paidAmount) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "支付方式", children: PAYMENT_METHOD_TEXT[detail.paymentMethod] || detail.paymentMethod }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "支付状态", children: PAYMENT_TEXT[detail.paymentStatus] || detail.paymentStatus }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "套餐快照", span: 2, children: /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { margin: 0, whiteSpace: "pre-wrap" }, children: JSON.stringify(detail.packageSnapshot || {}, null, 2) }) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "增值项", span: 2, children: Array.isArray(detail.addons) && detail.addons.length > 0 ? detail.addons.map((item) => `${item.name} ${money(item.price)}`).join("、") : "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "续费记录", span: 2, children: /* @__PURE__ */ jsxRuntime.jsx("pre", { style: { margin: 0, whiteSpace: "pre-wrap" }, children: JSON.stringify(detail.renewals || [], null, 2) }) })
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { size: "small", title: "入库照片", children: detailPhotos(detail.inboundPhotos) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { size: "small", title: "出库照片", children: detailPhotos(detail.outboundPhotos) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { size: "small", title: "操作记录", children: Array.isArray(detail.timeline) && detail.timeline.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx(
            antd.Timeline,
            {
              items: detail.timeline.map((item, index) => ({
                key: index,
                color: "blue",
                children: /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
                  /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
                    TIMELINE_TEXT[item.event] || item.event,
                    " ·",
                    " ",
                    dateTimeText(item.at)
                  ] }),
                  item.detail ? /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: item.detail }) : null
                ] })
              }))
            }
          ) : /* @__PURE__ */ jsxRuntime.jsx(Text$6, { type: "secondary", children: "暂无记录" }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Descriptions, { column: 2, size: "small", bordered: true, title: "其他信息", children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "订单 ID", children: detail.id }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "来源", children: detail.source || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "下单令牌", children: detail.clientToken || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "入库操作员", children: detail.storageOperator?.firstname || detail.storageOperator?.email || "-" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "创建时间", children: dateTimeText(detail.createdAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "更新时间", children: dateTimeText(detail.updatedAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "协议同意时间", children: dateTimeText(detail.agreementAcceptedAt) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Descriptions.Item, { label: "备注", children: detail.note || "-" })
          ] })
        ] }) : null
      }
    ),
    action ? /* @__PURE__ */ jsxRuntime.jsx(
      OrderActionDrawer,
      {
        action,
        onClose: () => setAction(null),
        onDone: handleDone
      }
    ) : null
  ] });
};
const { Text: Text$5 } = antd.Typography;
const InventoryPage = () => {
  const api = useTireApi();
  const { canFull } = usePermissions();
  const [tab, setTab] = react.useState("stored");
  const [locationCode, setLocationCode] = react.useState("");
  const [keyword, setKeyword] = react.useState("");
  const [query, setQuery] = react.useState(
    {}
  );
  const [days, setDays] = react.useState(30);
  const [page, setPage] = react.useState(1);
  const [pageSize, setPageSize] = react.useState(20);
  const [rows, setRows] = react.useState([]);
  const [total, setTotal] = react.useState(0);
  const [loading, setLoading] = react.useState(false);
  const [selectedKeys, setSelectedKeys] = react.useState([]);
  const [reminding, setReminding] = react.useState(false);
  const load = async () => {
    setLoading(true);
    try {
      if (tab === "stored") {
        const result = await api.listInventory({
          ...query,
          page,
          pageSize
        });
        setRows(result?.data || []);
        setTotal(Number(result?.pagination?.total) || 0);
      } else {
        const result = await api.listExpiring({ ...query, days });
        const keyword2 = String(query.keyword || "").toLowerCase();
        const list = (result?.data || []).filter((item) => {
          if (!keyword2) return true;
          return [
            item.phone,
            item.plateNo,
            item.customerName,
            item.orderNo
          ].map((value) => String(value || "").toLowerCase()).some((value) => value.includes(keyword2));
        });
        setRows(list);
        setTotal(list.length);
      }
    } catch (error) {
      antd.message.error(`加载库存失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, [
    tab,
    page,
    pageSize,
    days,
    query.locationCode,
    query.keyword
  ]);
  const search = () => {
    setPage(1);
    setSelectedKeys([]);
    setQuery({
      locationCode: locationCode.trim() || void 0,
      keyword: keyword.trim() || void 0
    });
  };
  const reset = () => {
    setLocationCode("");
    setKeyword("");
    setPage(1);
    setSelectedKeys([]);
    setQuery({});
  };
  const remind = async () => {
    if (selectedKeys.length === 0) {
      antd.message.warning("请先勾选需要提醒的订单");
      return;
    }
    setReminding(true);
    try {
      const result = await api.remindInventory(
        selectedKeys.map((key) => Number(key))
      );
      antd.message.success(
        `已生成提醒：排队 ${result?.queued || 0} 条，跳过 ${result?.skipped || 0} 条`
      );
      setSelectedKeys([]);
      await load();
    } catch (error) {
      antd.message.error(`生成提醒失败：${errorMessage(error)}`);
    } finally {
      setReminding(false);
    }
  };
  const columns = [
    {
      title: "仓位编号",
      dataIndex: "locationCode",
      width: 120,
      render: (value) => value || "-"
    },
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 150
    },
    {
      title: "客户",
      width: 170,
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntime.jsx("div", { children: record.customerName }),
        /* @__PURE__ */ jsxRuntime.jsx(Text$5, { type: "secondary", children: record.phone })
      ] })
    },
    {
      title: "车牌",
      dataIndex: "plateNo",
      width: 110,
      render: (value) => value || "-"
    },
    {
      title: "服务",
      dataIndex: "serviceType",
      width: 100,
      render: (value) => SERVICE_TEXT[value] || value
    },
    {
      title: "入库时间",
      dataIndex: "inboundAt",
      width: 150,
      render: (value) => dateTimeText(value)
    },
    {
      title: "到期日",
      dataIndex: "expireAt",
      width: 120,
      render: (value) => dateText(value)
    },
    {
      title: "剩余",
      dataIndex: "remainingDays",
      width: 110,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(Text$5, { style: { color: remainingColor(value), fontWeight: 500 }, children: remainingText(value) })
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 0, children: [
        /* @__PURE__ */ jsxRuntime.jsx(StatusTag, { status: value }),
        record.outboundRequestStatus === "pending" ? /* @__PURE__ */ jsxRuntime.jsx(Text$5, { style: { fontSize: 12, color: WARM }, children: "出库待审" }) : null
      ] })
    },
    {
      title: "出库申请",
      dataIndex: "outboundRequestStatus",
      width: 100,
      render: (value) => OUTBOUND_TEXT[value] || value || "未申请"
    },
    {
      title: "轮胎规格",
      dataIndex: "tireSpec",
      width: 130,
      render: (value) => value || "-"
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { styles: { body: { padding: 16 } }, children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { wrap: true, size: 12, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input,
        {
          allowClear: true,
          placeholder: "仓位编号",
          value: locationCode,
          onChange: (event) => setLocationCode(event.target.value),
          onPressEnter: search,
          style: { width: 160 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input,
        {
          allowClear: true,
          placeholder: "手机号 / 车牌 / 订单号",
          value: keyword,
          onChange: (event) => setKeyword(event.target.value),
          onPressEnter: search,
          style: { width: 240 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}), onClick: search, children: "查询" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: reset, children: "重置" }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: () => load(), children: "刷新" }),
      canFull ? /* @__PURE__ */ jsxRuntime.jsx(
        antd.Popconfirm,
        {
          title: `为已选 ${selectedKeys.length} 单生成提醒？`,
          onConfirm: remind,
          disabled: selectedKeys.length === 0,
          children: /* @__PURE__ */ jsxRuntime.jsxs(
            antd.Button,
            {
              icon: /* @__PURE__ */ jsxRuntime.jsx(icons.BellOutlined, {}),
              loading: reminding,
              disabled: selectedKeys.length === 0,
              children: [
                "批量生成提醒（",
                selectedKeys.length,
                "）"
              ]
            }
          )
        }
      ) : null
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsxs(antd.Card, { styles: { body: { paddingTop: 8 } }, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Tabs,
        {
          activeKey: tab,
          onChange: (key) => {
            setTab(key);
            setPage(1);
            setSelectedKeys([]);
          },
          items: [
            {
              key: "stored",
              label: "在存"
            },
            {
              key: "expiring",
              label: "临期超期"
            }
          ],
          tabBarExtraContent: tab === "expiring" ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(Text$5, { type: "secondary", children: "预警范围" }),
            /* @__PURE__ */ jsxRuntime.jsx(
              antd.Select,
              {
                value: days,
                onChange: (value) => {
                  setDays(value);
                  setPage(1);
                  setSelectedKeys([]);
                },
                style: { width: 130 },
                options: [
                  { value: 7, label: "7 天内" },
                  { value: 15, label: "15 天内" },
                  { value: 30, label: "30 天内" },
                  { value: 60, label: "60 天内" }
                ]
              }
            )
          ] }) : null
        }
      ),
      tab === "expiring" ? /* @__PURE__ */ jsxRuntime.jsxs(Text$5, { type: "secondary", children: [
        "共 ",
        total,
        " 单（含超期，按到期日升序）"
      ] }) : null,
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Table,
        {
          rowKey: "id",
          size: "middle",
          loading,
          columns,
          dataSource: rows,
          scroll: { x: 1280 },
          rowSelection: {
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys)
          },
          pagination: tab === "stored" ? {
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 单`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }
          } : false
        }
      )
    ] })
  ] });
};
const { Text: Text$4 } = antd.Typography;
const CatalogPage = () => {
  const api = useTireApi();
  const [packages, setPackages] = react.useState([]);
  const [addons, setAddons] = react.useState([]);
  const [config, setConfig] = react.useState({});
  const [configDraft, setConfigDraft] = react.useState({});
  const [loading, setLoading] = react.useState(false);
  const [savingConfig, setSavingConfig] = react.useState(false);
  const [modalType, setModalType] = react.useState(null);
  const [editing, setEditing] = react.useState(null);
  const [saving, setSaving] = react.useState(false);
  const [form] = antd.Form.useForm();
  const loadAll = async () => {
    setLoading(true);
    try {
      const [packageList, addonList, siteConfig] = await Promise.all([
        api.listCollection("packages"),
        api.listCollection("addons"),
        api.getConfig()
      ]);
      setPackages(Array.isArray(packageList) ? packageList : []);
      setAddons(Array.isArray(addonList) ? addonList : []);
      setConfig(siteConfig || {});
      setConfigDraft(siteConfig || {});
    } catch (error) {
      antd.message.error(`加载套餐配置失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    loadAll();
  }, []);
  const openCreate = (type) => {
    setEditing(null);
    setModalType(type);
    form.resetFields();
    if (type === "packages") {
      form.setFieldsValue({
        baseMonths: 6,
        storePrice: 0,
        pickupPrice: 0,
        extraMonthPrice: 0,
        overdueDayPrice: 0,
        enabled: true,
        sort: 0,
        highlightsText: ""
      });
    } else {
      form.setFieldsValue({ price: 0, enabled: true, sort: 0 });
    }
  };
  const openEdit = (type, record) => {
    setEditing(record);
    setModalType(type);
    if (type === "packages") {
      form.setFieldsValue({
        ...record,
        storePrice: centsToYuan(record.storePrice),
        pickupPrice: centsToYuan(record.pickupPrice),
        extraMonthPrice: centsToYuan(record.extraMonthPrice),
        overdueDayPrice: centsToYuan(record.overdueDayPrice),
        highlightsText: Array.isArray(record.highlights) ? record.highlights.join("\n") : ""
      });
    } else {
      form.setFieldsValue({
        ...record,
        price: centsToYuan(record.price)
      });
    }
  };
  const saveCatalog = async () => {
    if (!modalType) return;
    const values = await form.validateFields();
    setSaving(true);
    try {
      let payload;
      if (modalType === "packages") {
        payload = {
          name: values.name,
          code: values.code,
          baseMonths: Number(values.baseMonths) || 0,
          storePrice: yuanToCents(values.storePrice),
          pickupPrice: yuanToCents(values.pickupPrice),
          extraMonthPrice: yuanToCents(values.extraMonthPrice),
          overdueDayPrice: yuanToCents(values.overdueDayPrice),
          durationText: values.durationText || "",
          highlights: linesToArray(values.highlightsText || ""),
          enabled: Boolean(values.enabled),
          sort: Number(values.sort) || 0
        };
      } else {
        payload = {
          name: values.name,
          code: values.code,
          price: yuanToCents(values.price),
          unitText: values.unitText || "",
          enabled: Boolean(values.enabled),
          sort: Number(values.sort) || 0
        };
      }
      if (editing) {
        await api.updateCollection(modalType, Number(editing.id), payload);
        antd.message.success("已保存");
      } else {
        await api.createCollection(modalType, payload);
        antd.message.success("已新增");
      }
      setModalType(null);
      setEditing(null);
      await loadAll();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const removeCatalog = async (type, record) => {
    try {
      await api.removeCollection(type, Number(record.id));
      antd.message.success("已删除");
      await loadAll();
    } catch (error) {
      antd.message.error(`删除失败：${errorMessage(error)}`);
    }
  };
  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await api.updateConfig({
        paymentOnlineEnabled: Boolean(configDraft.paymentOnlineEnabled),
        depositEnabled: Boolean(configDraft.depositEnabled),
        depositRatio: Number(configDraft.depositRatio) || 0
      });
      setConfig(updated || configDraft);
      setConfigDraft(updated || configDraft);
      antd.message.success("支付配置已保存");
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSavingConfig(false);
    }
  };
  const packageColumns = [
    { title: "名称", dataIndex: "name", width: 160 },
    {
      title: "标识",
      dataIndex: "code",
      width: 130,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(Text$4, { code: true, children: value })
    },
    {
      title: "基础月数",
      dataIndex: "baseMonths",
      width: 90,
      render: (value) => `${value || 0} 个月`
    },
    {
      title: "到店价",
      dataIndex: "storePrice",
      width: 100,
      align: "right",
      render: (value) => money(value)
    },
    {
      title: "上门价",
      dataIndex: "pickupPrice",
      width: 100,
      align: "right",
      render: (value) => money(value)
    },
    {
      title: "超月单价",
      dataIndex: "extraMonthPrice",
      width: 110,
      align: "right",
      render: (value) => money(value)
    },
    {
      title: "超期日价",
      dataIndex: "overdueDayPrice",
      width: 110,
      align: "right",
      render: (value) => money(value)
    },
    {
      title: "时长文案",
      dataIndex: "durationText",
      width: 130,
      render: (value) => value || "-"
    },
    {
      title: "亮点",
      dataIndex: "highlights",
      width: 220,
      render: (value) => Array.isArray(value) && value.length > 0 ? value.join("、") : "-"
    },
    {
      title: "排序",
      dataIndex: "sort",
      width: 80
    },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value) => value ? /* @__PURE__ */ jsxRuntime.jsx(Text$4, { type: "success", children: "启用" }) : /* @__PURE__ */ jsxRuntime.jsx(Text$4, { type: "secondary", children: "停用" })
    },
    {
      title: "操作",
      width: 140,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openEdit("packages", record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Popconfirm,
          {
            title: "删除该套餐？",
            onConfirm: () => removeCatalog("packages", record),
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  const addonColumns = [
    { title: "名称", dataIndex: "name", width: 180 },
    {
      title: "标识",
      dataIndex: "code",
      width: 140,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(Text$4, { code: true, children: value })
    },
    {
      title: "价格",
      dataIndex: "price",
      width: 110,
      align: "right",
      render: (value) => money(value)
    },
    {
      title: "单位说明",
      dataIndex: "unitText",
      width: 180,
      render: (value) => value || "-"
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value) => value ? /* @__PURE__ */ jsxRuntime.jsx(Text$4, { type: "success", children: "启用" }) : /* @__PURE__ */ jsxRuntime.jsx(Text$4, { type: "secondary", children: "停用" })
    },
    {
      title: "操作",
      width: 140,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 4, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openEdit("addons", record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Popconfirm,
          {
            title: "删除该增值项？",
            onConfirm: () => removeCatalog("addons", record),
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "删除" })
          }
        )
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "寄存套餐",
        extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: loadAll, children: "刷新" }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: () => openCreate("packages"), children: "新增套餐" })
        ] }),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Table,
          {
            rowKey: "id",
            size: "middle",
            loading,
            columns: packageColumns,
            dataSource: packages,
            pagination: false,
            scroll: { x: 1500 }
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "增值项",
        extra: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            type: "primary",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}),
            onClick: () => openCreate("addons"),
            children: "新增增值项"
          }
        ),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Table,
          {
            rowKey: "id",
            size: "middle",
            loading,
            columns: addonColumns,
            dataSource: addons,
            pagination: false,
            scroll: { x: 900 }
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { title: "支付开关", children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 24, wrap: true, align: "center", children: [
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text$4, { children: "在线支付" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Switch,
          {
            checked: Boolean(configDraft.paymentOnlineEnabled),
            onChange: (checked) => setConfigDraft((prev) => ({
              ...prev,
              paymentOnlineEnabled: checked
            }))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text$4, { children: "支持定金" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Switch,
          {
            checked: Boolean(configDraft.depositEnabled),
            onChange: (checked) => setConfigDraft((prev) => ({ ...prev, depositEnabled: checked }))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
        /* @__PURE__ */ jsxRuntime.jsx(Text$4, { children: "定金比例（%）" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.InputNumber,
          {
            min: 0,
            max: 100,
            value: Number(configDraft.depositRatio) || 0,
            onChange: (value) => setConfigDraft((prev) => ({
              ...prev,
              depositRatio: Number(value) || 0
            }))
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", loading: savingConfig, onClick: saveConfig, children: "保存支付配置" }),
      /* @__PURE__ */ jsxRuntime.jsxs(Text$4, { type: "secondary", children: [
        "当前线上状态：",
        config.paymentOnlineEnabled ? "已开启" : "已关闭"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: !!modalType,
        title: `${editing ? "编辑" : "新增"}${modalType === "packages" ? "套餐" : "增值项"}`,
        onCancel: () => {
          setModalType(null);
          setEditing(null);
        },
        onOk: saveCatalog,
        confirmLoading: saving,
        width: 560,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "name",
              label: "名称",
              rules: [{ required: true, message: "请填写名称" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {})
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "code",
              label: "标识（英文/数字）",
              rules: [
                { required: true, message: "请填写标识" },
                { pattern: /^[a-z0-9-_]+$/, message: "仅支持小写字母、数字、- 和 _" }
              ],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "如 six_month" })
            }
          ),
          modalType === "packages" ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "baseMonths", label: "基础月数", style: { width: 200 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 1, max: 60, style: { width: "100%" } }) }),
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "sort", label: "排序", style: { width: 160 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" } }) }),
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "enabled", label: "启用", valuePropName: "checked", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "storePrice", label: "到店价（元）", style: { width: 200 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, precision: 2, step: 0.01, style: { width: "100%" } }) }),
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "pickupPrice", label: "上门价（元）", style: { width: 200 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, precision: 2, step: 0.01, style: { width: "100%" } }) })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                antd.Form.Item,
                {
                  name: "extraMonthPrice",
                  label: "超月单价（元）",
                  style: { width: 200 },
                  children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, precision: 2, step: 0.01, style: { width: "100%" } })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                antd.Form.Item,
                {
                  name: "overdueDayPrice",
                  label: "超期日价（元）",
                  style: { width: 200 },
                  children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, precision: 2, step: 0.01, style: { width: "100%" } })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "durationText", label: "时长文案", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "如 6 个月（180 天）" }) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "highlightsText", label: "亮点（每行一条）", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 4 }) })
          ] }) : /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
            /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "price", label: "价格（元）", style: { width: 200 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, precision: 2, step: 0.01, style: { width: "100%" } }) }),
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "sort", label: "排序", style: { width: 160 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" } }) }),
              /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "enabled", label: "启用", valuePropName: "checked", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "unitText", label: "单位说明", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { placeholder: "如 每次 / 每套" }) })
          ] })
        ] })
      }
    )
  ] });
};
const { Text: Text$3 } = antd.Typography;
const CustomersPage = () => {
  const api = useTireApi();
  const [keyword, setKeyword] = react.useState("");
  const [query, setQuery] = react.useState(void 0);
  const [page, setPage] = react.useState(1);
  const [pageSize, setPageSize] = react.useState(20);
  const [rows, setRows] = react.useState([]);
  const [total, setTotal] = react.useState(0);
  const [loading, setLoading] = react.useState(false);
  const [current, setCurrent] = react.useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const result = await api.listCustomers({
        page,
        pageSize,
        keyword: query
      });
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      antd.message.error(`加载客户失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, [page, pageSize, query]);
  const columns = [
    {
      title: "客户姓名",
      dataIndex: "customerName",
      width: 150,
      render: (value, record) => value || `手机号 ${record.phone}`
    },
    { title: "手机号", dataIndex: "phone", width: 140 },
    { title: "订单数", dataIndex: "orderCount", width: 100 },
    {
      title: "在存数",
      dataIndex: "storedCount",
      width: 100,
      render: (value) => value > 0 ? /* @__PURE__ */ jsxRuntime.jsx(Text$3, { style: { color: "#2563EB" }, children: value }) : /* @__PURE__ */ jsxRuntime.jsx(Text$3, { type: "secondary", children: "0" })
    },
    {
      title: "累计金额",
      dataIndex: "totalAmount",
      width: 120,
      align: "right",
      render: (value) => money(value)
    },
    { title: "最近订单号", dataIndex: "latestOrderNo", width: 160 },
    {
      title: "最近下单",
      dataIndex: "latestCreatedAt",
      width: 160,
      render: (value) => dateTimeText(value)
    },
    {
      title: "操作",
      width: 120,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => setCurrent(record), children: "历史订单" })
    }
  ];
  const orderColumns = [
    { title: "订单号", dataIndex: "orderNo", width: 150 },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(StatusTag, { status: value })
    },
    {
      title: "服务",
      dataIndex: "serviceType",
      width: 100,
      render: (value) => SERVICE_TEXT[value] || value
    },
    {
      title: "车牌",
      dataIndex: "plateNo",
      width: 110,
      render: (value) => value || "-"
    },
    {
      title: "仓位",
      dataIndex: "locationCode",
      width: 100,
      render: (value) => value || "-"
    },
    {
      title: "下单时间",
      dataIndex: "createdAt",
      width: 150,
      render: (value) => dateTimeText(value)
    },
    {
      title: "到期日",
      dataIndex: "expireAt",
      width: 110,
      render: (value) => dateText(value)
    },
    {
      title: "金额",
      dataIndex: "amountTotal",
      width: 100,
      align: "right",
      render: (value) => money(value)
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { styles: { body: { padding: 16 } }, style: { marginBottom: 16 }, children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { wrap: true, size: 12, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input,
        {
          allowClear: true,
          placeholder: "手机号 / 姓名 / 车牌",
          value: keyword,
          onChange: (event) => setKeyword(event.target.value),
          onPressEnter: () => {
            setPage(1);
            setQuery(keyword.trim() || void 0);
          },
          style: { width: 260 }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Button,
        {
          type: "primary",
          icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SearchOutlined, {}),
          onClick: () => {
            setPage(1);
            setQuery(keyword.trim() || void 0);
          },
          children: "查询"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Button,
        {
          onClick: () => {
            setKeyword("");
            setPage(1);
            setQuery(void 0);
          },
          children: "重置"
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: () => load(), children: "刷新" })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Table,
      {
        rowKey: "phone",
        size: "middle",
        loading,
        columns,
        dataSource: rows,
        scroll: { x: 1100 },
        pagination: {
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 位客户`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Drawer,
      {
        title: current ? `历史订单 · ${current.customerName || current.phone}` : "历史订单",
        open: !!current,
        width: 720,
        onClose: () => setCurrent(null),
        styles: { body: { padding: 24 } },
        children: current ? /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 12, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(Text$3, { type: "secondary", children: [
            "手机号 ",
            current.phone,
            "，共 ",
            current.orderCount,
            " 单，累计",
            " ",
            money(current.totalAmount)
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Table,
            {
              rowKey: "id",
              size: "small",
              columns: orderColumns,
              dataSource: current.orders || [],
              pagination: false,
              scroll: { x: 1e3 }
            }
          )
        ] }) : null
      }
    )
  ] });
};
const { Text: Text$2 } = antd.Typography;
const DEFAULT_TEMPLATES = {
  order_created: "{name}您好，您的雪地胎寄存订单 {orderNo} 已下单成功，请在订单页保存二维码。",
  accepted: "{name}您好，您的雪地胎寄存订单 {orderNo} 已接单，{pickupText}，请保持电话畅通。",
  inbound: "{name}您好，您的轮胎已入库，订单 {orderNo}，仓位 {locationCode}，寄存到期日 {expireAt}。",
  due_7: "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请提前安排取胎或续费。",
  due_3: "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（仅剩 {daysLeft} 天），请尽快取胎或续费。",
  outbound_done: "{name}您好，您的雪地胎寄存订单 {orderNo} 的轮胎已完成出库，感谢使用雪地胎寄存服务。",
  manual: "{name}您好，{content}"
};
const TEMPLATE_KEYS = Object.keys(DEFAULT_TEMPLATES);
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    antd.message.success("已复制到剪贴板");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    antd.message.success("已复制到剪贴板");
  }
};
const MessagesPage = () => {
  const api = useTireApi();
  const [filters, setFilters] = react.useState({});
  const [page, setPage] = react.useState(1);
  const [pageSize, setPageSize] = react.useState(20);
  const [rows, setRows] = react.useState([]);
  const [total, setTotal] = react.useState(0);
  const [loading, setLoading] = react.useState(false);
  const [templates, setTemplates] = react.useState({
    ...DEFAULT_TEMPLATES
  });
  const [templateLoading, setTemplateLoading] = react.useState(true);
  const [savingTemplates, setSavingTemplates] = react.useState(false);
  const [editing, setEditing] = react.useState(null);
  const [contentDraft, setContentDraft] = react.useState("");
  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, pageSize };
      const keyword = String(params.keyword || "").trim();
      delete params.keyword;
      if (keyword) {
        if (/^1[3-9]\d{9}$/.test(keyword)) params.phone = keyword;
        else params.orderNo = keyword;
      }
      const result = await api.listSmsLogs(params);
      setRows(result?.data || []);
      setTotal(Number(result?.pagination?.total) || 0);
    } catch (error) {
      antd.message.error(`加载通知失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  const loadTemplates = async () => {
    setTemplateLoading(true);
    try {
      const config = await api.getConfig();
      const override = config?.smsTemplateOverride;
      const merged = { ...DEFAULT_TEMPLATES };
      if (override && typeof override === "object") {
        TEMPLATE_KEYS.forEach((key) => {
          if (typeof override[key] === "string" && override[key].trim()) {
            merged[key] = override[key];
          }
        });
      }
      setTemplates(merged);
    } catch (error) {
      antd.message.error(`加载模板失败：${errorMessage(error)}`);
    } finally {
      setTemplateLoading(false);
    }
  };
  react.useEffect(() => {
    loadLogs();
  }, [
    page,
    pageSize,
    filters.status,
    filters.type,
    filters.keyword
  ]);
  react.useEffect(() => {
    loadTemplates();
  }, []);
  const updateStatus = async (record, status) => {
    try {
      await api.updateSmsLog(record.id, {
        status,
        ...record.content ? { content: record.content } : {}
      });
      antd.message.success(status === "sent" ? "已标记为已发送" : "已跳过");
      await loadLogs();
    } catch (error) {
      antd.message.error(`操作失败：${errorMessage(error)}`);
    }
  };
  const saveContent = async () => {
    if (!editing) return;
    try {
      await api.updateSmsLog(editing.id, {
        status: editing.status,
        content: contentDraft
      });
      antd.message.success("文案已更新");
      setEditing(null);
      await loadLogs();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    }
  };
  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const override = {};
      TEMPLATE_KEYS.forEach((key) => {
        const value = String(templates[key] || "").trim();
        if (value && value !== DEFAULT_TEMPLATES[key]) {
          override[key] = value;
        }
      });
      await api.updateConfig({ smsTemplateOverride: override });
      antd.message.success("模板文案已保存");
      await loadTemplates();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSavingTemplates(false);
    }
  };
  const columns = [
    {
      title: "类型",
      dataIndex: "type",
      width: 120,
      render: (value) => SMS_TYPE_TEXT[value] || value
    },
    {
      title: "订单号",
      width: 150,
      render: (_, record) => record.order?.orderNo || "-"
    },
    {
      title: "手机号",
      dataIndex: "phone",
      width: 130
    },
    {
      title: "文案",
      dataIndex: "content",
      width: 360,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tooltip, { title: value, children: /* @__PURE__ */ jsxRuntime.jsx(
        "div",
        {
          style: {
            maxWidth: 340,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          },
          children: value
        }
      ) })
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx(antd.Tag, { color: SMS_STATUS_COLOR[value], children: SMS_STATUS_TEXT[value] || value })
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 150,
      render: (value) => dateTimeText(value)
    },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 2, wrap: true, children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.CopyOutlined, {}),
            onClick: () => copyText(record.content || ""),
            children: "复制"
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.EditOutlined, {}),
            onClick: () => {
              setEditing(record);
              setContentDraft(record.content || "");
            },
            children: "编辑"
          }
        ),
        record.status === "pending" ? /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Popconfirm,
            {
              title: "确认该通知已发送？",
              onConfirm: () => updateStatus(record, "sent"),
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SendOutlined, {}), children: "已发" })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Popconfirm,
            {
              title: "跳过该通知？",
              onConfirm: () => updateStatus(record, "skipped"),
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "跳过" })
            }
          )
        ] }) : null
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 16, style: { width: "100%" }, children: [
    /* @__PURE__ */ jsxRuntime.jsx(antd.Card, { styles: { body: { padding: 16 } }, children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { wrap: true, size: 12, children: [
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          allowClear: true,
          placeholder: "状态",
          style: { width: 130 },
          value: filters.status,
          onChange: (value) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, status: value }));
          },
          options: Object.keys(SMS_STATUS_TEXT).map((value) => ({
            value,
            label: SMS_STATUS_TEXT[value]
          }))
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Select,
        {
          allowClear: true,
          placeholder: "通知类型",
          style: { width: 150 },
          value: filters.type,
          onChange: (value) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, type: value }));
          },
          options: Object.keys(SMS_TYPE_TEXT).map((value) => ({
            value,
            label: SMS_TYPE_TEXT[value]
          }))
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        antd.Input.Search,
        {
          allowClear: true,
          placeholder: "手机号 / 订单号",
          style: { width: 240 },
          onSearch: (value) => {
            setPage(1);
            setFilters((prev) => ({
              ...prev,
              keyword: value.trim() || void 0
            }));
          }
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: () => loadLogs(), children: "刷新" })
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Table,
      {
        rowKey: "id",
        size: "middle",
        loading,
        columns,
        dataSource: rows,
        scroll: { x: 1300 },
        pagination: {
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: (nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }
        }
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title: "模板文案",
        extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              onClick: () => setTemplates({ ...DEFAULT_TEMPLATES }),
              disabled: savingTemplates,
              children: "恢复默认"
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Button,
            {
              type: "primary",
              loading: savingTemplates,
              onClick: saveTemplates,
              children: "保存模板"
            }
          )
        ] }),
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { direction: "vertical", size: 8, style: { width: "100%" }, children: [
          /* @__PURE__ */ jsxRuntime.jsxs(Text$2, { type: "secondary", children: [
            "可用变量：",
            "{name} {orderNo} {expireAt} {daysLeft} {locationCode} {pickupText} {content}"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Collapse,
            {
              items: TEMPLATE_KEYS.map((key) => ({
                key,
                label: SMS_TYPE_TEXT[key] || key,
                children: /* @__PURE__ */ jsxRuntime.jsx(
                  antd.Input.TextArea,
                  {
                    rows: 3,
                    value: templates[key],
                    disabled: templateLoading,
                    onChange: (event) => setTemplates((prev) => ({
                      ...prev,
                      [key]: event.target.value
                    }))
                  }
                )
              }))
            }
          )
        ] })
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open: !!editing,
        title: editing ? `编辑文案 · ${SMS_TYPE_TEXT[editing.type] || editing.type}` : "编辑文案",
        onCancel: () => setEditing(null),
        onOk: saveContent,
        okText: "保存",
        width: 560,
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Input.TextArea,
          {
            rows: 5,
            value: contentDraft,
            onChange: (event) => setContentDraft(event.target.value)
          }
        )
      }
    )
  ] });
};
const { Text: Text$1 } = antd.Typography;
const moveItem = async (api, name, list, record, direction) => {
  const sorted = [...list].sort(
    (a, b) => (Number(a.sort) || 0) - (Number(b.sort) || 0)
  );
  const index = sorted.findIndex((item) => item.id === record.id);
  const target = sorted[index + direction];
  if (index < 0 || !target) return;
  try {
    await api.updateCollection(name, Number(target.id), {
      sort: Number(record.sort) || 0
    });
    await api.updateCollection(name, Number(record.id), {
      sort: Number(target.sort) || 0
    });
    antd.message.success("排序已更新");
  } catch (error) {
    antd.message.error(`排序失败：${errorMessage(error)}`);
  }
};
const FaqManager = ({ name, title, onChanged }) => {
  const api = useTireApi();
  const [list, setList] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [editing, setEditing] = react.useState(null);
  const [open, setOpen] = react.useState(false);
  const [saving, setSaving] = react.useState(false);
  const [form] = antd.Form.useForm();
  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      antd.message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, []);
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, enabled: true });
    setOpen(true);
  };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };
  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        question: values.question,
        answer: values.answer,
        sort: Number(values.sort) || 0,
        enabled: Boolean(values.enabled)
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      antd.message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (record) => {
    try {
      await api.removeCollection(name, Number(record.id));
      antd.message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`删除失败：${errorMessage(error)}`);
    }
  };
  const columns = [
    {
      title: "问题",
      dataIndex: "question",
      width: 260,
      render: (value) => value || "-"
    },
    {
      title: "回答",
      dataIndex: "answer",
      width: 420,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx("div", { style: { whiteSpace: "pre-wrap" }, children: value || "-" })
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "启用",
      dataIndex: "enabled",
      width: 80,
      render: (value) => value ? /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "success", children: "启用" }) : /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", children: "停用" })
    },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openEdit(record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowUpOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowDownOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "删除该问答？", onConfirm: () => remove(record), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "删除" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title,
        extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: load, children: "刷新" }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: openCreate, children: "新增问答" })
        ] }),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Table,
          {
            rowKey: "id",
            size: "middle",
            loading,
            columns,
            dataSource: list,
            pagination: false,
            scroll: { x: 1100 }
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open,
        title: editing ? "编辑问答" : "新增问答",
        onCancel: () => setOpen(false),
        onOk: submit,
        confirmLoading: saving,
        width: 620,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "question",
              label: "问题",
              rules: [{ required: true, message: "请填写问题" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {})
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            antd.Form.Item,
            {
              name: "answer",
              label: "回答",
              rules: [{ required: true, message: "请填写回答" }],
              children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 5 })
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "sort", label: "排序", style: { width: 160 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" } }) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "enabled", label: "启用", valuePropName: "checked", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) })
          ] })
        ] })
      }
    )
  ] });
};
const ReviewManager = ({ name, title, onChanged }) => {
  const api = useTireApi();
  const [list, setList] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [editing, setEditing] = react.useState(null);
  const [open, setOpen] = react.useState(false);
  const [saving, setSaving] = react.useState(false);
  const [form] = antd.Form.useForm();
  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      antd.message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, []);
  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ rating: 5, showOnHome: false, sort: 0 });
    setOpen(true);
  };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpen(true);
  };
  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        nickname: values.nickname || "",
        content: values.content || "",
        rating: Number(values.rating) || 0,
        showOnHome: Boolean(values.showOnHome),
        sort: Number(values.sort) || 0
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      antd.message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (record) => {
    try {
      await api.removeCollection(name, Number(record.id));
      antd.message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`删除失败：${errorMessage(error)}`);
    }
  };
  const columns = [
    { title: "昵称", dataIndex: "nickname", width: 140, render: (v) => v || "-" },
    {
      title: "评价内容",
      dataIndex: "content",
      width: 420,
      render: (value) => /* @__PURE__ */ jsxRuntime.jsx("div", { style: { whiteSpace: "pre-wrap" }, children: value || "-" })
    },
    {
      title: "评分",
      dataIndex: "rating",
      width: 90,
      render: (value) => `${value || 0} 分`
    },
    {
      title: "首页展示",
      dataIndex: "showOnHome",
      width: 100,
      render: (value) => value ? /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "success", children: "是" }) : /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", children: "否" })
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openEdit(record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowUpOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowDownOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "删除该评价？", onConfirm: () => remove(record), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "删除" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title,
        extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: load, children: "刷新" }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: openCreate, children: "新增评价" })
        ] }),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Table,
          {
            rowKey: "id",
            size: "middle",
            loading,
            columns,
            dataSource: list,
            pagination: false,
            scroll: { x: 1050 }
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open,
        title: editing ? "编辑评价" : "新增评价",
        onCancel: () => setOpen(false),
        onOk: submit,
        confirmLoading: saving,
        width: 620,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "nickname", label: "昵称", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 40 }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "content", label: "评价内容", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 4 }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 16, style: { display: "flex" }, children: [
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "rating", label: "评分", style: { width: 160 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 1, max: 5, style: { width: "100%" } }) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "sort", label: "排序", style: { width: 160 }, children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" } }) }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "showOnHome", label: "首页展示", valuePropName: "checked", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Switch, {}) })
          ] })
        ] })
      }
    )
  ] });
};
const GalleryManager = ({ name, title, onChanged }) => {
  const api = useTireApi();
  const [list, setList] = react.useState([]);
  const [loading, setLoading] = react.useState(false);
  const [editing, setEditing] = react.useState(null);
  const [open, setOpen] = react.useState(false);
  const [saving, setSaving] = react.useState(false);
  const [image, setImage] = react.useState(null);
  const [form] = antd.Form.useForm();
  const load = async () => {
    setLoading(true);
    try {
      setList(await api.listCollection(name));
    } catch (error) {
      antd.message.error(`加载${title}失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, []);
  const openCreate = () => {
    setEditing(null);
    setImage(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0 });
    setOpen(true);
  };
  const openEdit = (record) => {
    setEditing(record);
    setImage(
      record.image ? { id: Number(record.image.id), url: absoluteMediaUrl(record.image.url) } : null
    );
    form.setFieldsValue(record);
    setOpen(true);
  };
  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const payload = {
        caption: values.caption || "",
        sort: Number(values.sort) || 0,
        imageId: image?.id ?? null
      };
      if (editing) {
        await api.updateCollection(name, Number(editing.id), payload);
      } else {
        await api.createCollection(name, payload);
      }
      antd.message.success("已保存");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (record) => {
    try {
      await api.removeCollection(name, Number(record.id));
      antd.message.success("已删除");
      await load();
      onChanged?.();
    } catch (error) {
      antd.message.error(`删除失败：${errorMessage(error)}`);
    }
  };
  const columns = [
    {
      title: "图片",
      dataIndex: "image",
      width: 120,
      render: (value) => value?.url ? /* @__PURE__ */ jsxRuntime.jsx(
        antd.Image,
        {
          src: absoluteMediaUrl(value.url),
          width: 72,
          height: 72,
          style: { objectFit: "cover", borderRadius: 4 }
        }
      ) : /* @__PURE__ */ jsxRuntime.jsx(Text$1, { type: "secondary", children: "未设置" })
    },
    {
      title: "说明",
      dataIndex: "caption",
      width: 300,
      render: (value) => value || "-"
    },
    { title: "排序", dataIndex: "sort", width: 80 },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_, record) => /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { size: 2, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", onClick: () => openEdit(record), children: "编辑" }),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowUpOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, -1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(
          antd.Button,
          {
            size: "small",
            type: "link",
            icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ArrowDownOutlined, {}),
            onClick: async () => {
              await moveItem(api, name, list, record, 1);
              await load();
            }
          }
        ),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Popconfirm, { title: "删除该图片？", onConfirm: () => remove(record), children: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { size: "small", type: "link", danger: true, children: "删除" }) })
      ] })
    }
  ];
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Card,
      {
        title,
        extra: /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { icon: /* @__PURE__ */ jsxRuntime.jsx(icons.ReloadOutlined, {}), onClick: load, children: "刷新" }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.PlusOutlined, {}), onClick: openCreate, children: "新增图片" })
        ] }),
        children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Table,
          {
            rowKey: "id",
            size: "middle",
            loading,
            columns,
            dataSource: list,
            pagination: false,
            scroll: { x: 850 }
          }
        )
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      antd.Modal,
      {
        open,
        title: editing ? "编辑图片" : "新增图片",
        onCancel: () => setOpen(false),
        onOk: submit,
        confirmLoading: saving,
        width: 520,
        children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Form, { form, layout: "vertical", children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { label: "图片", required: true, children: /* @__PURE__ */ jsxRuntime.jsx(
            MediaPicker,
            {
              value: image,
              onChange: setImage,
              hint: "建议使用横向或方形图片，单张不超过 5MB。"
            }
          ) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "caption", label: "图片说明", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 80 }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "sort", label: "排序", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: 160 } }) })
        ] })
      }
    )
  ] });
};
const { Text } = antd.Typography;
const ContentPage = () => {
  const api = useTireApi();
  const [form] = antd.Form.useForm();
  const [loading, setLoading] = react.useState(false);
  const [saving, setSaving] = react.useState(false);
  const [bannerImage, setBannerImage] = react.useState(null);
  const [wechatQr, setWechatQr] = react.useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const config = await api.getConfig();
      form.setFieldsValue({
        bannerTitle: config.bannerTitle || "",
        bannerSubtitle: config.bannerSubtitle || "",
        serviceIntro: config.serviceIntro || "",
        warehouseConditions: config.warehouseConditions || "",
        guaranteesText: JSON.stringify(config.guarantees || [], null, 2),
        serviceAreaText: config.serviceAreaText || "",
        warehouseAddress: config.warehouseAddress || "",
        warehouseLat: config.warehouseLat ?? void 0,
        warehouseLng: config.warehouseLng ?? void 0,
        mapUrl: config.mapUrl || "",
        contactPhone: config.contactPhone || "",
        dailyPickupLimitMorning: config.dailyPickupLimitMorning ?? 6,
        dailyPickupLimitAfternoon: config.dailyPickupLimitAfternoon ?? 6,
        agreementText: config.agreementText || "",
        maxStorageDate: config.maxStorageDate ? dayjs(config.maxStorageDate) : null,
        announcement: config.announcement || ""
      });
      setBannerImage(
        config.bannerImage ? {
          id: Number(config.bannerImage.id),
          url: absoluteMediaUrl(config.bannerImage.url)
        } : null
      );
      setWechatQr(
        config.wechatQr ? {
          id: Number(config.wechatQr.id),
          url: absoluteMediaUrl(config.wechatQr.url)
        } : null
      );
    } catch (error) {
      antd.message.error(`加载站点内容失败：${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };
  react.useEffect(() => {
    load();
  }, []);
  const save = async () => {
    const values = await form.validateFields();
    let guarantees = [];
    const rawGuarantees = String(values.guaranteesText || "").trim();
    if (rawGuarantees) {
      try {
        guarantees = JSON.parse(rawGuarantees);
      } catch {
        antd.message.error("保障内容必须是合法的 JSON 数组");
        return;
      }
      if (!Array.isArray(guarantees)) {
        antd.message.error("保障内容必须是 JSON 数组");
        return;
      }
    }
    setSaving(true);
    try {
      await api.updateConfig({
        bannerTitle: values.bannerTitle || "",
        bannerSubtitle: values.bannerSubtitle || "",
        serviceIntro: values.serviceIntro || "",
        warehouseConditions: values.warehouseConditions || "",
        guarantees,
        serviceAreaText: values.serviceAreaText || "",
        warehouseAddress: values.warehouseAddress || "",
        warehouseLat: values.warehouseLat ?? null,
        warehouseLng: values.warehouseLng ?? null,
        mapUrl: values.mapUrl || "",
        contactPhone: values.contactPhone || "",
        dailyPickupLimitMorning: Number(values.dailyPickupLimitMorning) || 0,
        dailyPickupLimitAfternoon: Number(values.dailyPickupLimitAfternoon) || 0,
        agreementText: values.agreementText || "",
        maxStorageDate: values.maxStorageDate ? values.maxStorageDate.format("YYYY-MM-DD") : null,
        announcement: values.announcement || "",
        bannerImageId: bannerImage?.id ?? null,
        wechatQrId: wechatQr?.id ?? null
      });
      antd.message.success("站点内容已保存");
      await load();
    } catch (error) {
      antd.message.error(`保存失败：${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };
  const siteForm = /* @__PURE__ */ jsxRuntime.jsx(
    antd.Card,
    {
      title: "站点内容",
      loading,
      extra: /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { type: "primary", icon: /* @__PURE__ */ jsxRuntime.jsx(icons.SaveOutlined, {}), loading: saving, onClick: save, children: "保存站点内容" }),
      children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form, { form, layout: "vertical", children: /* @__PURE__ */ jsxRuntime.jsxs(antd.Row, { gutter: 16, children: [
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "bannerTitle", label: "Banner 主标题", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 60 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "bannerSubtitle", label: "Banner 副标题", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 120 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 8, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { label: "Banner 图片", children: /* @__PURE__ */ jsxRuntime.jsx(
          MediaPicker,
          {
            value: bannerImage,
            onChange: setBannerImage,
            hint: "建议尺寸 750 × 420，横图。"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 8, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { label: "客服微信二维码", children: /* @__PURE__ */ jsxRuntime.jsx(
          MediaPicker,
          {
            value: wechatQr,
            onChange: setWechatQr,
            hint: "用于订单页展示客服二维码。"
          }
        ) }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(antd.Col, { span: 8, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "contactPhone", label: "客服电话", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 20 }) }),
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "announcement", label: "公告", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, { maxLength: 100 }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "serviceIntro", label: "服务说明", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 5 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "warehouseConditions", label: "寄存条件", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 5 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(
          antd.Form.Item,
          {
            name: "guaranteesText",
            label: "服务保障（JSON 数组）",
            extra: '示例：[{"title":"专业仓储","desc":"恒温干燥"}]',
            children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 6 })
          }
        ) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "serviceAreaText", label: "服务区域", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 6 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "warehouseAddress", label: "仓库地址", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "warehouseLat", label: "纬度", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" }, step: 1e-6 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "warehouseLng", label: "经度", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { style: { width: "100%" }, step: 1e-6 }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "mapUrl", label: "地图链接", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input, {}) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "dailyPickupLimitMorning", label: "上午上门名额", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, style: { width: "100%" } }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 6, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "dailyPickupLimitAfternoon", label: "下午上门名额", children: /* @__PURE__ */ jsxRuntime.jsx(antd.InputNumber, { min: 0, style: { width: "100%" } }) }) }),
        /* @__PURE__ */ jsxRuntime.jsx(antd.Col, { span: 12, children: /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "maxStorageDate", label: "最晚寄存期限", children: /* @__PURE__ */ jsxRuntime.jsx(antd.DatePicker, { style: { width: "100%" } }) }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(antd.Col, { span: 24, children: [
          /* @__PURE__ */ jsxRuntime.jsx(antd.Form.Item, { name: "agreementText", label: "协议文案", children: /* @__PURE__ */ jsxRuntime.jsx(antd.Input.TextArea, { rows: 10 }) }),
          /* @__PURE__ */ jsxRuntime.jsxs(antd.Space, { children: [
            /* @__PURE__ */ jsxRuntime.jsx(Text, { type: "secondary", children: "协议支持纯文本，换行会保留在页面上。" }),
            /* @__PURE__ */ jsxRuntime.jsx(antd.Button, { onClick: load, children: "重新加载" })
          ] })
        ] })
      ] }) })
    }
  );
  return /* @__PURE__ */ jsxRuntime.jsx(
    antd.Tabs,
    {
      defaultActiveKey: "site",
      items: [
        { key: "site", label: "站点内容", children: siteForm },
        {
          key: "faq",
          label: "常见问答",
          children: /* @__PURE__ */ jsxRuntime.jsx(FaqManager, { name: "faqs", title: "常见问答" })
        },
        {
          key: "review",
          label: "用户评价",
          children: /* @__PURE__ */ jsxRuntime.jsx(ReviewManager, { name: "reviews", title: "用户评价" })
        },
        {
          key: "gallery",
          label: "实拍相册",
          children: /* @__PURE__ */ jsxRuntime.jsx(GalleryManager, { name: "gallery", title: "实拍相册" })
        }
      ]
    }
  );
};
const App = () => /* @__PURE__ */ jsxRuntime.jsx(
  antd.ConfigProvider,
  {
    locale: zhCN__default.default,
    theme: { token: { colorPrimary: "#2563EB", borderRadius: 6 } },
    children: /* @__PURE__ */ jsxRuntime.jsx(PermissionProvider, { children: /* @__PURE__ */ jsxRuntime.jsx(PluginLayout, { children: /* @__PURE__ */ jsxRuntime.jsxs(reactRouterDom.Routes, { children: [
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { index: true, element: /* @__PURE__ */ jsxRuntime.jsx(OrdersPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "orders", element: /* @__PURE__ */ jsxRuntime.jsx(OrdersPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "inventory", element: /* @__PURE__ */ jsxRuntime.jsx(InventoryPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "catalog", element: /* @__PURE__ */ jsxRuntime.jsx(CatalogPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "customers", element: /* @__PURE__ */ jsxRuntime.jsx(CustomersPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "messages", element: /* @__PURE__ */ jsxRuntime.jsx(MessagesPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "content", element: /* @__PURE__ */ jsxRuntime.jsx(ContentPage, {}) }),
      /* @__PURE__ */ jsxRuntime.jsx(reactRouterDom.Route, { path: "*", element: /* @__PURE__ */ jsxRuntime.jsx("div", { children: "页面建设中" }) })
    ] }) }) })
  }
);
exports.default = App;

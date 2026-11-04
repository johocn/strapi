/* 主题引导脚本：页面 <head> 内同步加载，首帧前套用，避免闪色。
   优先级：URL ?theme=预览 > 本机覆盖 > 站点默认 > theme.config.js 内置默认 */
(function () {
  var cfg = window.JOYOGO_THEME || { default: 'amber', themes: [] };
  var list = (cfg.themes || []).map(function (t) { return t.id; });
  var KEY = 'joyogo-ski-theme';
  var SITE_KEY = 'joyogo-ski-theme-default';

  function valid(id) { return !!id && (list.indexOf(id) !== -1); }

  function fromUrl() {
    var m = /[?&]theme=([a-z]+)/.exec(location.search);
    return m && valid(m[1]) ? m[1] : null;
  }
  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, id) {
    try { localStorage.setItem(key, id); } catch (e) {}
  }
  function removeStored(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function siteDefault() {
    var v = readStored(SITE_KEY);
    return valid(v) ? v : null;
  }
  function fallback() { return siteDefault() || cfg.default || 'amber'; }
  function apply(id) { document.documentElement.setAttribute('data-theme', id); }

  var stored = readStored(KEY);
  var current = fromUrl() || (valid(stored) ? stored : null) || fallback();
  apply(current);

  window.JoyogoTheme = {
    list: function () { return (cfg.themes || []).slice(); },
    /* theme.config.js 里写死的值，永远不作为「后台默认」展示 */
    builtinDefault: function () { return cfg.default || 'amber'; },
    /* 当前生效的站点默认：站点配置优先，否则内置默认 */
    defaultTheme: function () { return fallback(); },
    current: function () { return document.documentElement.getAttribute('data-theme'); },
    /* 本机覆盖：只影响当前浏览器 */
    preview: function (id) {
      if (!valid(id)) return false;
      writeStored(KEY, id);
      apply(id);
      return true;
    },
    /* 站点默认：写入配置层，并清掉本机覆盖让当前页跟随 */
    setSiteDefault: function (id) {
      if (!valid(id)) return false;
      writeStored(SITE_KEY, id);
      removeStored(KEY);
      apply(id);
      return true;
    },
    clearSiteDefault: function () {
      removeStored(SITE_KEY);
      apply(fromUrl() || fallback());
      return this.current();
    },
    /* 清除本机覆盖，回落到站点默认 */
    reset: function () {
      removeStored(KEY);
      apply(fromUrl() || fallback());
      return this.current();
    }
  };
})();

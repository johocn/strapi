/* 主题引导脚本：页面 <head> 内同步加载，首帧前套用，避免闪色。
   优先级：URL ?theme=预览 > 本机后台设定 > theme.config.js 默认值 */
(function () {
  var cfg = window.JOYOGO_THEME || { default: 'amber', themes: [] };
  var list = (cfg.themes || []).map(function (t) { return t.id; });
  var KEY = 'joyogo-ski-theme';

  function valid(id) { return !!id && (list.indexOf(id) !== -1); }

  function fromUrl() {
    var m = /[?&]theme=([a-z]+)/.exec(location.search);
    return m && valid(m[1]) ? m[1] : null;
  }
  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  var current = fromUrl() || stored() || cfg.default || 'amber';
  document.documentElement.setAttribute('data-theme', current);

  window.JoyogoTheme = {
    list: function () { return (cfg.themes || []).slice(); },
    defaultTheme: function () { return cfg.default || 'amber'; },
    current: function () { return document.documentElement.getAttribute('data-theme'); },
    /* 本机预览：立即生效并在同浏览器内记忆 */
    preview: function (id) {
      if (!valid(id)) return false;
      try { localStorage.setItem(KEY, id); } catch (e) {}
      document.documentElement.setAttribute('data-theme', id);
      return true;
    },
    /* 清除本机覆盖，回落到后台默认 */
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      document.documentElement.setAttribute('data-theme', cfg.default || 'amber');
      return this.current();
    }
  };
})();

/* 共用皮膚：讀取首頁「我的工具箱」儲存的 jless_skin_v1（主題色＋字型大小）
   並套用到本頁，使所有工具與首頁風格一致。
   夜間模式：jless_theme_mode_v1 = auto | light | dark（預設 auto）。 */
(function(){
  var THEMES = {
    rose:  {accent:'#c23b6a',accent2:'#a8305c',soft:'#fdeaf2',line:'#f4c9da'},
    blue:  {accent:'#2563eb',accent2:'#1d4ed8',soft:'#e8efff',line:'#cdddff'},
    green: {accent:'#0f766e',accent2:'#0b5d56',soft:'#e3f3f1',line:'#bfe6e1'},
    purple:{accent:'#7c3aed',accent2:'#6d28d9',soft:'#f1e9ff',line:'#d9c7ff'},
    amber: {accent:'#d97706',accent2:'#b45309',soft:'#fdf0dd',line:'#f3d9a8'}
  };
  var FONTS = {0:0.9, 1:1, 2:1.15, 3:1.3};
  var DARK = {
    rose:  {accent:'#e06a94',accent2:'#c23b6a',soft:'#3d2030',line:'#5d3346'},
    blue:  {accent:'#6f9dff',accent2:'#3b6fe0',soft:'#1e2a42',line:'#2f4a78'},
    green: {accent:'#4fc3b5',accent2:'#0f9b8f',soft:'#173432',line:'#26544f'},
    purple:{accent:'#b18cff',accent2:'#8b5cf6',soft:'#2b2143',line:'#46356b'},
    amber: {accent:'#f0ab4b',accent2:'#d97706',soft:'#3a2a17',line:'#5c4526'}
  };
  var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var mode = 'auto';
  try{ mode = localStorage.getItem('jless_theme_mode_v1') || 'auto'; }catch(e){}
  function isDark(){
    if(mode==='dark')return true;
    if(mode==='light')return false;
    return !!(mql && mql.matches);
  }
  function apply(){
    try{
      var s = JSON.parse(localStorage.getItem('jless_skin_v1') || '{}');
      var key = (s && s.theme) ? s.theme : 'rose';
      var dark = isDark();
      var t = (dark ? DARK[key] : THEMES[key]) || (dark ? DARK.rose : THEMES.rose);
      var r = document.documentElement.style;
      r.setProperty('--accent', t.accent);
      r.setProperty('--accent2', t.accent2);
      r.setProperty('--accent-soft', t.soft);
      r.setProperty('--accent-line', t.line);
      var f = FONTS[(s && s.fkey != null) ? s.fkey : 1];
      if(f == null) f = 1;
      r.setProperty('--fs', String(f));
      var de = document.documentElement;
      de.setAttribute('data-theme', key);
      if(dark)de.setAttribute('data-mode','dark');else de.removeAttribute('data-mode');
      var mt = document.querySelector('meta[name="theme-color"]');
      if(mt)mt.setAttribute('content', dark ? '#171114' : '#fffaf3');
    }catch(e){}
  }
  apply();
  if(mql){
    var on = function(){ if(mode==='auto') apply(); };
    if(mql.addEventListener)mql.addEventListener('change',on);
    else if(mql.addListener)mql.addListener(on);
  }
  window.JLessTheme = {
    apply:apply,
    get mode(){return mode;},
    set:function(m){mode=(m==='dark'||m==='light')?m:'auto';try{localStorage.setItem('jless_theme_mode_v1',mode);}catch(e){}apply();}
  };
})();

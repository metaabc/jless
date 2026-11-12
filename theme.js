/* 共用皮膚：讀取首頁「我的工具箱」儲存的 jless_skin_v1（主題色＋字型大小）
   並套用到本頁，使所有工具與首頁風格一致。 */
(function(){
  var THEMES = {
    rose:  {accent:'#c23b6a',accent2:'#a8305c',soft:'#fdeaf2',line:'#f4c9da'},
    blue:  {accent:'#2563eb',accent2:'#1d4ed8',soft:'#e8efff',line:'#cdddff'},
    green: {accent:'#0f766e',accent2:'#0b5d56',soft:'#e3f3f1',line:'#bfe6e1'},
    purple:{accent:'#7c3aed',accent2:'#6d28d9',soft:'#f1e9ff',line:'#d9c7ff'},
    amber: {accent:'#d97706',accent2:'#b45309',soft:'#fdf0dd',line:'#f3d9a8'}
  };
  var FONTS = {0:0.9, 1:1, 2:1.15, 3:1.3};
  try{
    var s = JSON.parse(localStorage.getItem('jless_skin_v1') || '{}');
    var key = (s && s.theme) ? s.theme : 'rose';
    var t = THEMES[key] || THEMES.rose;
    var r = document.documentElement.style;
    r.setProperty('--accent', t.accent);
    r.setProperty('--accent2', t.accent2);
    r.setProperty('--accent-soft', t.soft);
    r.setProperty('--accent-line', t.line);
    var f = FONTS[(s && s.fkey != null) ? s.fkey : 1];
    if(f == null) f = 1;
    r.setProperty('--fs', String(f));
    document.documentElement.setAttribute('data-theme', key);
  }catch(e){}
})();

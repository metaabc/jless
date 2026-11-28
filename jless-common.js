/* JLess 共用基礎模組 v2：全域搜尋、快速新增、回收桶、本機提醒、離線快取、返回鍵
 * 完全本機；file:// 下自動降級（不註冊 SW、不顯示通知）。
 * API:
 *   JLess.search.open()
 *   JLess.quick.open(type)                 // type: todo | note | expense
 *   JLess.undo(msg, fn)                    // 5 秒復原
 *   JLess.trash.snapshot(key,label)
 *   JLess.trash.open()
 *   JLess.notify.enable() / schedule(id,ts,title,body) / check()
 *   JLess.badge.set(n)
 */
(function(){
'use strict';
var J=window.JLess=window.JLess||{};

function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function dateStr(ts){var d=new Date(ts||Date.now());function p(n){return(n<10?'0':'')+n;}return d.getFullYear()+'/'+p(d.getMonth()+1)+'/'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());}
function pad(n){return (n<10?'0':'')+n;}
function todayISO(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function uid(p){return (p||'q')+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function fileOf(){return (location.pathname||'').split('/').pop()||'index.html';}

/* ---------- Service worker（離線外殼） ---------- */
function regSW(){
  if(!('serviceWorker' in navigator))return;
  if(!/^https?:$/.test(location.protocol))return;
  var path=(location.pathname||'/').split('/').slice(0,-1).join('/')||'';
  navigator.serviceWorker.register(path+'/sw.js').catch(function(){});
}
if(document.readyState==='complete')regSW();else window.addEventListener('load',regSW);

/* ---------- 通用小工具 ---------- */
var toastTimer=null;
function toast(msg,action,fn){
  var old=document.getElementById('jToast');
  if(old&&old.parentNode)old.parentNode.removeChild(old);
  var t=document.createElement('div');t.id='jToast';
  t.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 92px);transform:translateX(-50%) translateY(10px);'+
    'background:rgba(50,32,42,.95);color:#fff;padding:11px 16px;border-radius:13px;font-size:13px;z-index:560;'+
    'display:flex;align-items:center;gap:12px;max-width:calc(100% - 32px);box-shadow:0 8px 24px rgba(0,0,0,.25);opacity:0;transition:.2s';
  t.innerHTML='<span>'+esc(msg)+'</span>';
  if(action){
    var b=document.createElement('button');b.textContent=action;
    b.style.cssText='border:none;background:rgba(255,255,255,.18);color:#fff;font-weight:700;border-radius:8px;padding:6px 11px;font-size:12px;cursor:pointer;flex:0 0 auto';
    b.onclick=function(){
      if(t.parentNode)t.parentNode.removeChild(t);
      if(toastTimer)clearTimeout(toastTimer);
      try{if(fn)fn();}catch(e){}
    };
    t.appendChild(b);
  }
  document.body.appendChild(t);
  requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){
    t.style.opacity='0';t.style.transform='translateX(-50%) translateY(8px)';
    setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},220);
  },action?5200:2000);
}

/* ---------- 回收桶：以整個 app key 快照支援還原 ---------- */
var TKEY='jless_trash_v1', TMAX=40;
function tlist(){
  try{var a=JSON.parse(lsGet(TKEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}
}
function tsave(a){return lsSet(TKEY,JSON.stringify(a.slice(0,TMAX)));}
function snapshot(key,label){
  if(!key)return;
  var v=lsGet(key);if(v===null)return;
  var a=tlist();
  a.unshift({id:'t'+Date.now()+Math.random().toString(36).slice(2,6),key:key,label:label||key,value:v,ts:Date.now()});
  tsave(a);
}
/* 合併還原：只把快照中有、目前沒有的項目加回，保留現有資料 */
function keyOf(x){
  if(!x||typeof x!=='object')return null;
  var k=x.id!=null?x.id:(x.k!=null?x.k:(x.key!=null?x.key:null));
  return k==null?null:String(k);
}
function unionArr(cur,inc){
  var out=Array.isArray(cur)?cur.slice():[],seen={};
  out.forEach(function(x){var k=keyOf(x)||JSON.stringify(x);seen[k]=1;});
  (Array.isArray(inc)?inc:[]).forEach(function(x){
    var k=keyOf(x)||JSON.stringify(x);
    if(!seen[k]){out.push(x);seen[k]=1;}
  });
  return out;
}
function mergeRestore(snapVal,curVal){
  var s,j;try{s=JSON.parse(snapVal);}catch(e){return null;}
  var c;try{c=JSON.parse(curVal);}catch(e){return null;}
  if(!s||!c)return null;
  if(Array.isArray(s)&&Array.isArray(c))return JSON.stringify(unionArr(c,s));
  if(!Array.isArray(s)&&!Array.isArray(c)&&typeof s==='object'&&typeof c==='object'){
    var added=0;
    Object.keys(s).forEach(function(k){
      if(k==='logs'||k==='history'||k==='done'||k==='completed'||k==='checked')return;
      if(Array.isArray(s[k])&&Array.isArray(c[k])){
        var before=c[k].length;c[k]=unionArr(c[k],s[k]);if(c[k].length>before)added++;
      }else if(c[k]==null&&s[k]!=null){c[k]=s[k];added++;}
    });
    return added?JSON.stringify(c):null;
  }
  return null;
}
function openTrash(){
  var old=document.getElementById('jTrash');
  if(old)old.parentNode.removeChild(old);
  var mask=document.createElement('div');mask.id='jTrash';
  mask.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(40,20,30,.45);display:flex;align-items:flex-end;justify-content:center';
  var box=document.createElement('div');
  box.style.cssText='width:100%;max-width:560px;max-height:82vh;overflow:auto;background:var(--bg,#fffaf3);border-radius:20px 20px 0 0;padding:16px 18px calc(env(safe-area-inset-bottom) + 20px);box-shadow:0 -8px 30px rgba(0,0,0,.18)';
  var a=tlist();
  var h='<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:15px;color:var(--ink,#3b2530)">回收桶</b>'+
    '<button data-x style="margin-left:auto;width:32px;height:32px;border-radius:9px;border:1px solid var(--line,#f0e2d8);background:var(--panel,#fff);cursor:pointer">✕</button></div>'+
    '<p style="font-size:12px;color:var(--muted,#967f89);margin:0 0 12px">只保留最近 '+TMAX+' 筆。「合併還原」只加回不存在的項目；「取代」會覆蓋目前資料。</p>';
  if(!a.length)h+='<p style="font-size:13px;color:var(--muted,#967f89);text-align:center;padding:24px 0">回收桶是空的</p>';
  a.forEach(function(x){
    h+='<div style="background:var(--panel,#fff);border:1px solid var(--line,#f0e2d8);border-radius:12px;padding:10px 12px;margin-bottom:8px">'+
      '<div style="font-size:13px;font-weight:600;color:var(--ink,#3b2530)">'+esc(x.label)+'</div>'+
      '<div style="font-size:11px;color:var(--muted,#967f89);margin:3px 0 8px">'+dateStr(x.ts)+' · '+esc(x.key)+'</div>'+
      '<button data-m="'+esc(x.id)+'" style="border:1px solid var(--accent,#c23b6a);background:var(--accent-soft,#fdeaf2);color:var(--accent,#c23b6a);border-radius:9px;padding:8px 12px;min-height:38px;font-size:12px;font-weight:700;cursor:pointer">合併還原</button> '+
      '<button data-r="'+esc(x.id)+'" style="border:1px solid var(--line,#f0e2d8);background:var(--panel,#fff);color:var(--ink2,#5b4750);border-radius:9px;padding:8px 12px;min-height:38px;font-size:12px;cursor:pointer">取代</button> '+
      '<button data-d="'+esc(x.id)+'" style="border:1px solid var(--line,#f0e2d8);background:var(--bg,#fffaf3);color:var(--muted,#967f89);border-radius:9px;padding:8px 12px;min-height:38px;font-size:12px;cursor:pointer">永久刪除</button></div>';
  });
  box.innerHTML=h;mask.appendChild(box);document.body.appendChild(mask);
  function close(){if(mask.parentNode)mask.parentNode.removeChild(mask);}
  mask.addEventListener('click',function(e){if(e.target===mask||e.target.hasAttribute('data-x'))close();});
  box.addEventListener('click',function(e){
    var r=e.target.getAttribute&&e.target.getAttribute('data-r');
    var d=e.target.getAttribute&&e.target.getAttribute('data-d');
    var m=e.target.getAttribute&&e.target.getAttribute('data-m');
    if(m){
      var item=tlist().filter(function(x){return x.id===m;})[0];
      if(!item)return;
      var merged=mergeRestore(item.value,lsGet(item.key));
      if(!merged){toast('這筆快照不支援合併，請改用「取代」');return;}
      if(!confirm('合併還原「'+item.label+'」？只會加回目前沒有的項目。'))return;
      lsSet(item.key,merged);
      tsave(tlist().filter(function(x){return x.id!==m;}));
      close();location.reload();
    }else if(r){
      var item=tlist().filter(function(x){return x.id===r;})[0];
      if(item&&confirm('還原「'+item.label+'」？該應用目前資料會被快照取代。')){
        lsSet(item.key,item.value);
        tsave(tlist().filter(function(x){return x.id!==r;}));
        close();location.reload();
      }
    }else if(d){
      if(confirm('永久刪除這筆回收桶紀錄？')){tsave(tlist().filter(function(x){return x.id!==d;}));close();openTrash();}
    }
  });
}

/* ---------- 全域搜尋 ---------- */
var MAP={
  'jless_todo_v1':['待辦','todo.html'],'jless_note_v1':['筆記','note.html'],
  'jless_quickbook_v1':['記帳','quickbook.html'],'habit_checkin_v1':['小習慣','habit.html'],
  'jless_metric_v1':['指標','metric.html'],'jless_leave_v1':['年假','leave.html'],
  'jless_absence_v1':['缺勤','absence.html'],'jless_wealth_v1':['財富','wealth.html'],
  'bookmark_mgr_v1':['書籤','bookmark.html'],'flashcard_list_v1':['記憶卡','remember.html'],
  'coupon_book_v1':['消費券','consume.html'],'jless_album_v1':['相簿','album.html'],
  'jless_member_v1':['會員','member.html']
};
var DEEP={'note.html':1,'album.html':1,'bookmark.html':1,'todo.html':1,'quickbook.html':1,
  'member.html':1,'voucher.html':1,'consume.html':1,'leave.html':1,'absence.html':1,
  'metric.html':1,'remember.html':1,'calc.html':1,'excel.html':1,'ocr.html':1,'timer.html':1,'wealth.html':1};
function walk(o,out,depth){
  if(depth>5||out.length>4000)return;
  if(typeof o==='string'){
    if(o.length>1&&o.length<300&&o.indexOf('data:')!==0)out.push(o);
  }else if(Array.isArray(o)){
    o.forEach(function(x){walk(x,out,depth+1);});
  }else if(o&&typeof o==='object'){
    Object.keys(o).forEach(function(k){if(k!=='data'&&k!=='img'&&k!=='thumb'&&k!=='receipt')walk(o[k],out,depth+1);});
  }
}
var ADV_FILES={'wealth.html':true};
function entries(){
  var out=[];
  var advUnlocked=false;
  try{advUnlocked=lsGet('jless_adv_v1')==='1';}catch(e){}
  Object.keys(MAP).forEach(function(k){
    if(ADV_FILES[MAP[k][1]]&&!advUnlocked)return;
    var raw=lsGet(k);if(!raw)return;
    var obj=null;try{obj=JSON.parse(raw);}catch(e){obj=null;}
    var words=[];walk(obj,words,0);
    var uniq=[];words.forEach(function(w){if(uniq.indexOf(w)<0)uniq.push(w);});
    uniq.slice(0,300).forEach(function(w){
      out.push({app:MAP[k][0],file:MAP[k][1],text:w});
    });
  });
  return out;
}
/* 團購券內容在 IndexedDB，開啟搜尋時才讀 */
function idbEntries(){
  if(!window.indexedDB)return Promise.resolve([]);
  return new Promise(function(res){
    try{
      var req=indexedDB.open('tgq_db',1);
      req.onupgradeneeded=function(){};
      req.onerror=function(){res([]);};
      req.onsuccess=function(){
        var db=req.result;
        if(!db.objectStoreNames.contains('vouchers')){res([]);return;}
        try{
          var r=db.transaction('vouchers','readonly').objectStore('vouchers').getAll();
          r.onsuccess=function(){
            var out=[];
            (r.result||[]).forEach(function(v){
              [v.name,v.note,v.code,v.shop].forEach(function(x){
                if(typeof x==='string'&&x.trim())out.push({app:'團購券',file:'voucher.html',text:x.trim()});
              });
              if(v.amount)out.push({app:'團購券',file:'voucher.html',text:'面額 $'+v.amount});
            });
            res(out.slice(0,600));
          };
          r.onerror=function(){res([]);};
        }catch(e){res([]);}
      };
    }catch(e){res([]);}
  });
}
function mark(html,term){
  if(!term)return html;
  var i=html.toLowerCase().indexOf(term.toLowerCase());
  if(i<0)return html;
  return html.slice(0,i)+'<mark style="background:var(--accent-soft);color:var(--accent);border-radius:4px;padding:0 2px">'+
    html.slice(i,i+term.length)+'</mark>'+html.slice(i+term.length);
}
var RKEY='jless_search_recent_v1';
function recent(){try{var a=JSON.parse(lsGet(RKEY)||'[]');return Array.isArray(a)?a.slice(0,6):[];}catch(e){return [];}}
function pushRecent(q){
  q=String(q||'').trim();if(!q)return;
  var a=recent().filter(function(x){return x!==q;});a.unshift(q);
  lsSet(RKEY,JSON.stringify(a.slice(0,6)));
}
function openSearch(){
  if(document.getElementById('jSearch'))return;
  var mask=document.createElement('div');mask.id='jSearch';
  mask.style.cssText='position:fixed;inset:0;z-index:520;background:rgba(40,20,30,.45);display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 34px) 12px 12px';
  var box=document.createElement('div');
  box.style.cssText='width:100%;max-width:560px;background:var(--bg,#fffaf3);border-radius:16px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.24);max-height:82vh;overflow:auto';
  box.innerHTML='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">'+
    '<input id="jSearchQ" placeholder="搜尋所有應用的記錄…" style="flex:1;border:1px solid var(--line,#f0e2d8);border-radius:11px;padding:11px;background:var(--panel,#fff);color:var(--ink,#3b2530);outline:none;font-size:14px">'+
    '<button data-x style="width:34px;height:34px;border-radius:10px;border:1px solid var(--line,#f0e2d8);background:var(--panel,#fff);cursor:pointer">✕</button></div><div id="jSearchR"></div>';
  mask.appendChild(box);document.body.appendChild(mask);
  var q=box.querySelector('#jSearchQ'),r=box.querySelector('#jSearchR');
  var all=entries();
  function itemHTML(x,term){
    var href=x.file+(DEEP[x.file]?'?q='+encodeURIComponent(term||x.text.slice(0,20)):'');
    return '<a href="'+href+'" data-s style="display:flex;gap:8px;text-decoration:none;color:inherit;background:var(--panel,#fff);border:1px solid var(--line,#f0e2d8);border-radius:10px;padding:9px 11px;margin-bottom:6px">'+
      '<span style="font-size:13px;flex:1;min-width:0">'+mark(esc(x.text),term)+'</span><span style="color:var(--muted);flex:0 0 auto">›</span></a>';
  }
  function show(term){
    term=String(term||'').trim();
    var list=term?all.filter(function(x){return x.text.toLowerCase().indexOf(term.toLowerCase())>=0;}):[];
    if(!term){
      var rs=recent();
      var quick=[['待辦','todo.html','✅'],['記帳','quickbook.html','🧾'],['筆記','note.html','📝'],['會員','member.html','💳']];
      r.innerHTML='<div style="font-size:11.5px;color:var(--muted);margin:2px 2px 8px">常用</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'+quick.map(function(x){
          return '<a href="'+x[1]+'" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:10px 12px;font-size:13px;font-weight:600">'+x[2]+' '+x[0]+'</a>';
        }).join('')+'</div>'+
        (rs.length?'<div style="font-size:11.5px;color:var(--muted);margin:2px 2px 8px">最近搜尋</div>'+rs.map(function(s){
          return '<button data-q="'+esc(s)+'" style="border:1px solid var(--line);background:var(--panel);color:var(--ink2);border-radius:999px;padding:6px 11px;font-size:12px;margin:0 6px 6px 0;cursor:pointer">'+esc(s)+'</button>';
        }).join(''):'<div style="font-size:12px;color:var(--muted);text-align:center;padding:16px 0">輸入關鍵字，搜尋所有應用</div>');
      return;
    }
    if(!list.length){
      r.innerHTML='<p style="font-size:13px;color:var(--muted);text-align:center;padding:18px 0">找不到相關記錄</p>';
      return;
    }
    var groups={},order=[];
    list.slice(0,60).forEach(function(x){
      if(!groups[x.app]){groups[x.app]=[];order.push(x.app);}
      if(groups[x.app].length<6)groups[x.app].push(x);
    });
    r.innerHTML=order.map(function(app){
      return '<div style="font-size:11.5px;color:var(--muted);margin:8px 2px 6px">'+esc(app)+' · '+groups[app].length+'</div>'+
        groups[app].map(function(x){return itemHTML(x,term);}).join('');
    }).join('');
  }
  show('');
  q.addEventListener('input',function(){show(q.value);});
  q.addEventListener('keydown',function(e){
    if(e.key==='Enter'&&q.value.trim()){
      pushRecent(q.value.trim());
      var list=all.filter(function(x){return x.text.toLowerCase().indexOf(q.value.trim().toLowerCase())>=0;});
      if(list.length){location.href=list[0].file+(DEEP[list[0].file]?'?q='+encodeURIComponent(q.value.trim()):'');}
    }
  });
  r.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-q]');
    if(b){q.value=b.getAttribute('data-q');show(q.value);q.focus();return;}
    var a=e.target.closest&&e.target.closest('a[data-s]');
    if(a&&q.value.trim())pushRecent(q.value.trim());
  });
  function close(){if(mask.parentNode)mask.parentNode.removeChild(mask);}
  mask.addEventListener('click',function(e){if(e.target===mask||e.target.hasAttribute('data-x'))close();});
  setTimeout(function(){q.focus();},40);
  /* 背景補上團購券索引 */
  idbEntries().then(function(rows){
    if(!rows.length)return;
    all=all.concat(rows);
    if(q.value.trim())show(q.value);
  });
}
document.addEventListener('keydown',function(e){
  if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();openSearch();}
  if(e.key==='Escape'){
    var s=document.getElementById('jSearch'),t=document.getElementById('jTrash');
    if(s&&s.parentNode)s.parentNode.removeChild(s);
    if(t&&t.parentNode)t.parentNode.removeChild(t);
  }
});

/* ---------- 快速新增 ---------- */
var APP_FILES={'index.html':1,'todo.html':1,'note.html':1,'quickbook.html':1,'habit.html':1,'member.html':1,'consume.html':1,'voucher.html':1,'album.html':1,'bookmark.html':1,'metric.html':1,'timer.html':1,'calc.html':1,'excel.html':1,'ocr.html':1,'leave.html':1,'absence.html':1,'wealth.html':1,'remember.html':1};
function parseTodo(s){
  var title=String(s||'').trim(),due='',time='',tags=[];
  var tm=title.match(/(\d{1,2})[:：點](\d{1,2})?/);
  if(tm){
    var hh=Math.min(23,+tm[1]),mm=tm[2]?Math.min(59,+tm[2]):0;
    time=pad(hh)+':'+pad(mm);
    title=title.replace(tm[0],' ');
  }
  var d=new Date();
  if(/後天/.test(title)){d.setDate(d.getDate()+2);due=d.toISOString().slice(0,10);title=title.replace(/後天/g,' ');}
  else if(/明天|聽日/.test(title)){d.setDate(d.getDate()+1);due=d.toISOString().slice(0,10);title=title.replace(/明天|聽日/g,' ');}
  else if(/今天|今日/.test(title)){due=todayISO();title=title.replace(/今天|今日/g,' ');}
  title=title.replace(/#([^\s#]+)/g,function(_,t){if(tags.length<10)tags.push(t.slice(0,12));return ' ';});
  title=title.replace(/\s+/g,' ').trim();
  return {title:title||String(s||'').trim()||'新任務',due:due,time:time,tags:tags};
}
function addTodo(text){
  var p=parseTodo(text);
  var raw=lsGet('jless_todo_v1'),d=null;
  try{d=JSON.parse(raw);}catch(e){}
  if(!d||!Array.isArray(d.lists)||!d.lists.length)d={v:1,lists:[{id:uid('l'),name:'我的清單',tasks:[],completed:[]}]};
  var l=d.lists[0];if(!Array.isArray(l.tasks))l.tasks=[];
  l.tasks.unshift({id:uid('t'),title:p.title,content:'',due:p.due,time:p.time,tags:p.tags,repeat:'none',done:false,completedAt:0,pin:false,attach:[]});
  lsSet('jless_todo_v1',JSON.stringify(d));
}
function addNote(text){
  var raw=lsGet('jless_note_v1'),d=null;
  try{d=JSON.parse(raw);}catch(e){}
  if(!d||!Array.isArray(d.lists)||!d.lists.length)d={v:1,lists:[{id:uid('l'),name:'我的筆記',notes:[]}]};
  var l=d.lists[0];if(!Array.isArray(l.notes))l.notes=[];
  var lines=String(text||'').split('\n');
  var title=(lines.shift()||'').trim().slice(0,80);
  var body=lines.join('\n').trim();
  l.notes.unshift({id:uid('n'),title:title||body.slice(0,30)||'快速筆記',body:body,color:'#ffffff',img:'',items:null,pin:false,ts:Date.now()});
  lsSet('jless_note_v1',JSON.stringify(d));
}
function qbState(){
  var d=null;try{d=JSON.parse(lsGet('jless_quickbook_v1'));}catch(e){}
  return (d&&typeof d==='object')?d:null;
}
function addExpense(amount,catId,note){
  var d=qbState();
  if(!d||!Array.isArray(d.expense)||!d.expense.length)return false;
  if(!Array.isArray(d.txns))d.txns=[];
  var c=d.expense.filter(function(x){return x.id===catId;})[0]||d.expense[0];
  var date=todayISO();
  d.txns.push({id:uid('x'),type:'expense',catId:c.id,accId:d.defAcc||'a_none',amount:Math.round(amount*100)/100,
    note:String(note||'').slice(0,60),ts:new Date(date+'T12:00:00').getTime(),date:date,receipt:'',tplId:'',period:''});
  return lsSet('jless_quickbook_v1',JSON.stringify(d));
}
function openQuickAdd(type){
  if(document.getElementById('jQuick'))return;
  var curFile=fileOf();
  var tab=type==='note'?'note':(type==='expense'?'expense':'todo');
  var mask=document.createElement('div');mask.id='jQuick';
  mask.style.cssText='position:fixed;inset:0;z-index:530;background:rgba(30,16,24,.48);display:flex;align-items:flex-end;justify-content:center';
  var box=document.createElement('div');
  box.style.cssText='width:100%;max-width:560px;background:var(--bg,#fffaf3);border-radius:22px 22px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom) + 18px);box-shadow:0 -10px 34px rgba(0,0,0,.2)';
  var qb=qbState();
  var cats=(qb&&Array.isArray(qb.expense))?qb.expense:[];
  var last={};try{last=JSON.parse(lsGet('jless_quick_last_v1')||'{}')||{};}catch(e){}
  box.innerHTML=
    '<div style="display:flex;align-items:center;margin-bottom:12px"><b style="font-size:16px;color:var(--ink)">快速新增</b>'+
    '<button data-x style="margin-left:auto;width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--panel);color:var(--ink2);cursor:pointer">✕</button></div>'+
    '<div id="jqTabs" style="display:flex;gap:6px;margin-bottom:12px">'+
      ['todo:待辦','note:筆記','expense:支出'].map(function(x){
        var k=x.split(':')[0];
        return '<button data-t="'+k+'" class="'+((k===tab)?'on':'')+'" style="flex:1;min-height:44px;border-radius:11px;border:1px solid var(--line);background:'+((k===tab)?'var(--accent)':'var(--panel)')+';color:'+((k===tab)?'#fff':'var(--ink2)')+';font-weight:700;font-size:13px;cursor:pointer">'+x.split(':')[1]+'</button>';
      }).join('')+'</div>'+
    '<textarea id="jqText" rows="2" placeholder="一句話…例如：明天 3點 交作業 #工作" style="width:100%;min-height:52px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:12px;padding:11px;font-size:14px;outline:none;resize:none"></textarea>'+
    '<div id="jqExp" style="display:none;margin-top:10px">'+
      '<div style="display:flex;gap:8px"><input id="jqAmt" type="number" inputmode="decimal" step="any" min="0" placeholder="金額" value="'+(last.amount||'')+'" style="flex:1;min-height:44px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:12px;padding:11px;font-size:14px;outline:none">'+
      '<input id="jqNote" placeholder="備註（可選）" list="jqNotes" style="flex:1.4;min-height:44px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:12px;padding:11px;font-size:13px;outline:none">'+
      '<datalist id="jqNotes">'+(Array.isArray(last.notes)?last.notes.slice(0,8).map(function(x){return '<option value="'+esc(x)+'">';}).join(''):'')+'</datalist></div>'+
      '<div id="jqCats" style="display:flex;gap:6px;overflow-x:auto;margin-top:9px;padding-bottom:2px">'+cats.map(function(c,i){
        var on=c.id===last.cat;
        return '<button data-c="'+esc(c.id)+'" aria-label="'+esc(c.name)+'" style="flex:0 0 auto;min-height:38px;border:1px solid var(--line);background:'+(on?'var(--accent-soft)':'var(--panel)')+';color:'+(on?'var(--accent)':'var(--ink2)')+';border-radius:999px;padding:7px 11px;font-size:12px;cursor:pointer;white-space:nowrap">'+esc(c.icon||'')+' '+esc(c.name)+'</button>';
      }).join('')+'</div>'+
    '</div>'+
    '<button id="jqSave" style="width:100%;margin-top:12px;min-height:46px;border:none;border-radius:13px;background:var(--accent);color:#fff;font-size:15px;font-weight:800;cursor:pointer">儲存</button>'+
    '<div style="font-size:10.5px;color:var(--muted);text-align:center;margin-top:7px">Enter 儲存 · Esc 關閉</div>';
  mask.appendChild(box);document.body.appendChild(mask);
  var ta=box.querySelector('#jqText'),exp=box.querySelector('#jqExp'),amt=box.querySelector('#jqAmt'),note=box.querySelector('#jqNote');
  var selCat=(last.cat&&cats.some(function(c){return c.id===last.cat;}))?last.cat:(cats.length?cats[0].id:'');
  [].slice.call(box.querySelectorAll('#jqCats button')).forEach(function(b){b.classList.toggle('on',b.getAttribute('data-c')===selCat);});
  function setTab(k){
    tab=k;
    box.querySelectorAll('#jqTabs button').forEach(function(b){
      var on=b.getAttribute('data-t')===k;
      b.style.background=on?'var(--accent)':'var(--panel)';
      b.style.color=on?'#fff':'var(--ink2)';
    });
    exp.style.display=k==='expense'?'block':'none';
    ta.style.display=k==='expense'?'none':'block';
    ta.placeholder=k==='todo'?'一句話…例如：明天 3點 交作業 #工作':'隨手記下想法…';
    if(k==='expense')setTimeout(function(){amt.focus();},50);else setTimeout(function(){ta.focus();},50);
  }
  box.querySelector('#jqTabs').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-t]');if(b)setTab(b.getAttribute('data-t'));
  });
  box.querySelector('#jqCats').addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-c]');if(!b)return;
    selCat=b.getAttribute('data-c');
    box.querySelectorAll('#jqCats button').forEach(function(x){
      var on=x===b;x.style.background=on?'var(--accent-soft)':'var(--panel)';x.style.color=on?'var(--accent)':'var(--ink2)';
    });
  });
  function remember(){
    var l={};try{l=JSON.parse(lsGet('jless_quick_last_v1')||'{}')||{};}catch(e){}
    if(isFinite(parseFloat(amt.value)))l.amount=parseFloat(amt.value);
    l.cat=selCat;
    var nt=note.value.trim(),ns=Array.isArray(l.notes)?l.notes.slice():[];
    if(nt&&ns.indexOf(nt)<0){ns.unshift(nt);l.notes=ns.slice(0,8);}
    lsSet('jless_quick_last_v1',JSON.stringify(l));
  }
  function close(){if(mask.parentNode)mask.parentNode.removeChild(mask);}
  mask.addEventListener('click',function(e){if(e.target===mask||e.target.hasAttribute('data-x'))close();});
  box.querySelector('#jqSave').onclick=function(){
    var text=ta.value.trim(),v=parseFloat(amt.value);
    if(tab==='expense'){
      if(!isFinite(v)||v<=0){toast('請輸入金額');amt.focus();return;}
      if(curFile==='quickbook.html'&&typeof window.openSheet==='function'){
        close();window.openSheet();try{window.expr=String(v);if(window.renderSDisp)window.renderSDisp();}catch(e){}
        return;
      }
      if(!cats.length){toast('請先在記帳建立支出分類');close();location.href='quickbook.html';return;}
      if(!addExpense(v,selCat,note.value.trim())){toast('儲存失敗');return;}
      remember();toast('已記支出 $'+v);
    }else if(tab==='todo'){
      if(!text){toast('請輸入內容');ta.focus();return;}
      /* 在待辦頁就用原生編輯器，避免與頁面記憶體狀態衝突 */
      if(curFile==='todo.html'&&typeof window.openEditor==='function'){
        close();window.openEditor();
        setTimeout(function(){
          var el=document.getElementById('eTitle');
          if(el){el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();}
        },120);
        return;
      }
      addTodo(text);toast('已加入待辦');
    }else{
      if(!text){toast('請輸入內容');ta.focus();return;}
      if(curFile==='note.html'&&typeof window.openEditor==='function'){
        close();window.openEditor();
        setTimeout(function(){
          var el=document.getElementById('eBody');
          if(el){el.value=text;el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();}
        },120);
        return;
      }
      addNote(text);toast('已加入筆記');
    }
    try{window.dispatchEvent(new CustomEvent('jless:data',{detail:{type:tab}}));}catch(e){}
    close();
  };
  /* Enter / Ctrl+Enter 儲存、Esc 關閉 */
  function keySave(e){
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Enter')return;
    if(e.shiftKey)return;
    if(e.target===ta&&tab!=='expense'){e.preventDefault();box.querySelector('#jqSave').click();return;}
    if(e.target===note||e.target===amt){e.preventDefault();box.querySelector('#jqSave').click();}
  }
  box.addEventListener('keydown',keySave);
  mask.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close();}});
  setTab(tab);
}
function mountQuickAdd(){
  var cur=fileOf();
  if(!APP_FILES[cur])return;
  /* 首頁用底部導覽中央的「＋」，避免浮動鍵遮住卡片 */
  if(cur==='index.html')return;
  if(document.getElementById('jAddFab'))return;
  var b=document.createElement('button');
  b.id='jAddFab';b.type='button';b.setAttribute('aria-label','快速新增');b.textContent='＋';
  b.style.cssText='position:fixed;left:14px;bottom:calc(env(safe-area-inset-bottom) + 80px);width:50px;height:50px;border-radius:16px;'+
    'border:none;background:var(--accent);color:#fff;font-size:26px;font-weight:400;line-height:1;cursor:pointer;z-index:70;'+
    'box-shadow:0 6px 18px rgba(120,60,80,.32);display:flex;align-items:center;justify-content:center;padding:0 0 3px;'+
    'transition:opacity .18s,transform .18s';
  b.onclick=function(){openQuickAdd();};
  document.body.appendChild(b);

  /* 任何彈層（輸入面板／詳情／選單）打開時自動隱藏，避免蓋住面板內容 */
  function overlayOpen(){
    var vw=window.innerWidth||390,vh=window.innerHeight||800,min=vw*vh*0.45;
    var cand=document.querySelectorAll('[id*="Mask"],[class*="mask"],[class*="sheet"],[class*="modal"],[class*="drawer"]');
    for(var i=0;i<cand.length;i++){
      var el=cand[i];
      if(el===b||el.contains(b))continue;
      var cs;try{cs=getComputedStyle(el);}catch(e){continue;}
      if(!cs||cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')continue;
      var r=el.getBoundingClientRect();
      /* 只算「真正落在畫面內」的面積（關閉中的面板可能只是移出畫面） */
      var visW=Math.min(r.right,vw)-Math.max(r.left,0), visH=Math.min(r.bottom,vh)-Math.max(r.top,0);
      if(visW>0&&visH>0&&visW*visH>=min)return true;
    }
    return false;
  }
  var last=null;
  function sync(){
    var o=overlayOpen();
    if(o===last)return;
    last=o;
    b.style.opacity=o?'0':'1';
    b.style.transform=o?'scale(.86)':'none';
    b.style.pointerEvents=o?'none':'auto';
  }
  var tk=null;
  function queue(){if(tk)return;tk=setTimeout(function(){tk=null;sync();},120);}
  try{new MutationObserver(queue).observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','style']});}catch(e){}
  window.setInterval(sync,1200);
  sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountQuickAdd);else mountQuickAdd();

/* ---------- 返回首頁（同頁導航時顯示） ---------- */
function mountBack(){
  var cur=fileOf();
  if(cur==='index.html'||!APP_FILES[cur])return;
  var fromHome=false;
  try{fromHome=sessionStorage.getItem('jless_from_home')==='1';}catch(e){}
  if(!fromHome)return;
  var btn=document.createElement('button');
  btn.type='button';btn.setAttribute('aria-label','返回小助手');btn.innerHTML='←';
  btn.style.cssText='width:32px;height:32px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--ink2);'+
    'font-size:17px;line-height:1;cursor:pointer;flex:0 0 auto;display:flex;align-items:center;justify-content:center;padding:0 0 2px';
  btn.onclick=function(){
    try{sessionStorage.removeItem('jless_from_home');}catch(e){}
    if(history.length>1)history.back();else location.href='index.html';
  };
  var bar=document.querySelector('.topbar');
  if(bar){bar.insertBefore(btn,bar.firstChild);return;}
  btn.style.position='fixed';
  btn.style.left='10px';
  btn.style.top='calc(env(safe-area-inset-top) + 10px)';
  btn.style.zIndex='75';
  btn.style.boxShadow='0 3px 10px rgba(0,0,0,.12)';
  document.body.appendChild(btn);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBack);else mountBack();

/* ---------- 應用圖示徽章 ---------- */
function setBadge(n){
  try{
    if(n>0&&navigator.setAppBadge)navigator.setAppBadge(n);
    else if(navigator.clearAppBadge)navigator.clearAppBadge();
  }catch(e){}
}

/* ---------- 本機提醒 ---------- */
var NKEY='jless_notify_v1';
function nlist(){try{var a=JSON.parse(lsGet(NKEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return [];}}
function nsave(a){lsSet(NKEY,JSON.stringify(a));}
function enable(){
  if(!('Notification' in window))return Promise.resolve(false);
  return Notification.requestPermission();
}
function schedule(id,ts,title,body){
  if(!ts||ts<=Date.now())return;
  var a=nlist().filter(function(x){return x.id!==id;});
  a.push({id:id,ts:ts,title:title,body:body||'',done:false});nsave(a);
}
function check(){
  var a=nlist(),now=Date.now(),fired=false;
  a.forEach(function(x){
    if(!x.done&&x.ts<=now){
      x.done=true;fired=true;
      try{if('Notification' in window&&Notification.permission==='granted')new Notification(x.title,{body:x.body});}catch(e){}
      try{console.info('[JLess 提醒] '+x.title+'：'+x.body);}catch(e){}
    }
  });
  if(fired)nsave(a);
}
check();setInterval(check,60000);

/* ---------- 全域鍵盤快捷鍵 ---------- */
function typing(el){
  if(!el)return false;
  var t=String(el.tagName||'').toLowerCase();
  return t==='input'||t==='textarea'||t==='select'||el.isContentEditable;
}
window.addEventListener('keydown',function(e){
  var mod=e.ctrlKey||e.metaKey;
  if(mod&&String(e.key||'').toLowerCase()==='k'){e.preventDefault();clearHits();openSearch();return;}
  if(e.key==='Escape'){
    if(document.getElementById('jSearch')||document.getElementById('jQuick')||document.getElementById('jTrash'))return;
    if(hitTerm){clearHits();return;}
    /* 關閉最上層 app 面板 */
    var sheets=document.querySelectorAll('.sheet.on,.modal.on,[class*="Mask"][style*="flex"]');
    if(sheets.length){
      for(var i=sheets.length-1;i>=0;i--){
        var s=sheets[i],x=s.querySelector('[data-close],.x');
        if(x){x.click();return;}
      }
    }
    return;
  }
  if(typing(e.target)||e.altKey||mod)return;
  if(e.key==='/'||e.key==='？'){e.preventDefault();openSearch();return;}
  if(String(e.key||'').toLowerCase()==='n'){e.preventDefault();openQuickAdd();}
});

/* ---------- 搜尋落地：把命中字眼在頁面中高亮並捲到可見範圍 ---------- */
var hitTerm='',hitBar=null;
function clearHits(){
  if(hitBar&&hitBar.parentNode)hitBar.parentNode.removeChild(hitBar);hitBar=null;
  try{
    [].slice.call(document.querySelectorAll('mark.jl-hit')).forEach(function(m){
      var p=m.parentNode;if(!p)return;
      while(m.firstChild)p.insertBefore(m.firstChild,m);
      p.removeChild(m);p.normalize();
    });
  }catch(e){}
  hitTerm='';
}
function markHits(term){
  clearHits();
  term=String(term||'').trim();if(term.length<1)return 0;
  hitTerm=term;
  var low=term.toLowerCase(),n=0,first=null;
  var walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
    acceptNode:function(node){
      var p=node.parentNode;if(!p)return NodeFilter.FILTER_REJECT;
      var tag=String(p.nodeName||'').toLowerCase();
      if(tag==='script'||tag==='style'||tag==='mark'||tag==='input'||tag==='textarea')return NodeFilter.FILTER_REJECT;
      if(!node.nodeValue||node.nodeValue.toLowerCase().indexOf(low)<0)return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes=[],x;while((x=walker.nextNode()))nodes.push(x);
  nodes.forEach(function(node){
    var s=node.nodeValue,ls=s.toLowerCase(),frag=document.createDocumentFragment(),i=0,pos;
    while((pos=ls.indexOf(low,i))>=0){
      if(pos>i)frag.appendChild(document.createTextNode(s.slice(i,pos)));
      var m=document.createElement('mark');m.className='jl-hit';m.textContent=s.slice(pos,pos+term.length);
      frag.appendChild(m);n++;i=pos+term.length;
      if(!first)first=m;
    }
    if(i<s.length)frag.appendChild(document.createTextNode(s.slice(i)));
    node.parentNode.replaceChild(frag,node);
  });
  if(!n)return 0;
  var style=document.createElement('style');style.id='jlHitStyle';
  style.textContent='mark.jl-hit{background:#ffe08a!important;color:#3b2530!important;border-radius:4px;padding:0 2px;box-shadow:0 0 0 2px rgba(255,190,60,.35)}'+
    'html[data-mode="dark"] mark.jl-hit{background:#7a5a1e!important;color:#fff5d6!important}';
  if(!document.getElementById('jlHitStyle'))document.head.appendChild(style);
  hitBar=document.createElement('div');
  hitBar.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 12px);transform:translateX(-50%);z-index:555;'+
    'background:rgba(50,32,42,.94);color:#fff;border-radius:12px;padding:8px 10px;font-size:11.5px;display:flex;align-items:center;gap:8px;box-shadow:0 6px 20px rgba(0,0,0,.25);white-space:nowrap;max-width:calc(100% - 20px)';
  hitBar.innerHTML='<span style="min-width:0;overflow:hidden;text-overflow:ellipsis">找到 '+n+' 處「'+esc(term)+'」</span><button type="button" style="flex:0 0 auto;white-space:nowrap;border:none;background:rgba(255,255,255,.18);color:#fff;border-radius:7px;padding:4px 9px;font-size:11.5px;cursor:pointer">關閉</button>';
  hitBar.querySelector('button').onclick=clearHits;
  document.body.appendChild(hitBar);
  try{first.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}
  return n;
}
function locate(term){return markHits(term);}
function autoLocate(){
  var q='';try{q=new URLSearchParams(location.search).get('q')||'';}catch(e){}
  if(!q)return;
  /* 有原生搜尋框的頁面先讓它自行篩選，再做文字高亮 */
  markHits(q);setTimeout(function(){markHits(q);},650);
}

/* ---------- 券核銷 → 自動記帳（共用，寫 src / voucherId 供還原時移除） ---------- */
function voucherBook(o){
  o=o||{};
  var amt=Math.abs(+o.amount||0);if(!(amt>0))return '';
  var d=null;try{d=JSON.parse(lsGet('jless_quickbook_v1'));}catch(e){}
  if(!d||!Array.isArray(d.expense)||!d.expense.length)return '';
  if(!Array.isArray(d.txns))d.txns=[];
  var cat=d.expense.filter(function(c){return /券|優惠|消費/.test(String(c.name||''));})[0]||d.expense[0];
  var qid='qb'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  var dt=new Date(o.ts||Date.now());
  function p(n){return (n<10?'0':'')+n;}
  var date=dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate());
  d.txns.push({id:qid,type:'expense',catId:cat.id,accId:d.defAcc||'a_none',amount:amt,
    note:String(o.note||'券核銷').slice(0,60),ts:dt.getTime(),date:date,receipt:'',tplId:'',period:'',
    src:o.src||'voucher',voucherId:o.id||'',voucherApp:o.app||''});
  if(!lsSet('jless_quickbook_v1',JSON.stringify(d)))return '';
  return qid;
}
function voucherUnbook(qid){
  if(!qid)return;
  var d=null;try{d=JSON.parse(lsGet('jless_quickbook_v1'));}catch(e){}
  if(!d||!Array.isArray(d.txns))return;
  d.txns=d.txns.filter(function(x){return x.id!==qid;});
  lsSet('jless_quickbook_v1',JSON.stringify(d));
}
function autoBookOn(){return lsGet('jless_voucher_autobook_v1')==='1';}
function setAutoBook(on){lsSet('jless_voucher_autobook_v1',on?'1':'0');}

/* ---------- PWA 安裝引導 + 離線提示 ---------- */
var deferredInstall=null;
function showInstallBar(){
  if(document.getElementById('jInstall'))return;
  var b=document.createElement('div');b.id='jInstall';
  b.style.cssText='position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 74px);transform:translateX(-50%);z-index:554;'+
    'display:flex;align-items:center;gap:8px;max-width:calc(100% - 24px);background:var(--panel,#fff);color:var(--ink,#3b2530);'+
    'border:1px solid var(--line,#f0e2d8);border-radius:14px;padding:8px 10px;box-shadow:0 8px 26px rgba(0,0,0,.18);font-size:11.5px;white-space:nowrap';
  b.innerHTML='<span style="overflow:hidden;text-overflow:ellipsis">📲 安裝到主畫面</span>'+
    '<button data-ok style="flex:0 0 auto;white-space:nowrap;border:none;background:var(--accent,#c23b6a);color:#fff;border-radius:8px;padding:6px 10px;font-size:11.5px;font-weight:700;cursor:pointer">安裝</button>'+
    '<button data-no style="flex:0 0 auto;border:none;background:none;color:var(--muted,#967f89);font-size:16px;cursor:pointer;padding:0 3px">✕</button>';
  document.body.appendChild(b);
  b.querySelector('[data-ok]').onclick=function(){
    if(deferredInstall){deferredInstall.prompt();deferredInstall.userChoice.then(function(){b.remove();deferredInstall=null;});}
    else{toast('用瀏覽器選單「新增至主畫面」');b.remove();}
    try{localStorage.setItem('jless_install_seen_v1','1');}catch(e){}
  };
  b.querySelector('[data-no]').onclick=function(){
    try{localStorage.setItem('jless_install_seen_v1','1');}catch(e){}
    b.remove();
  };
  setTimeout(function(){if(b.parentNode)b.remove();},12000);
}
function initInstall(){
  try{if(localStorage.getItem('jless_install_seen_v1')==='1')return;}catch(e){}
  if(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)return;
  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();deferredInstall=e;showInstallBar();
  });
  function offline(){toast('目前離線 · 資料仍可正常使用');}
  window.addEventListener('offline',offline);
}
initInstall();

J.search={open:openSearch,entries:entries,locate:locate,clear:clearHits};
J.quick={open:openQuickAdd};
J.undo=function(msg,fn){toast(msg,'復原',fn);};
J.trash={snapshot:snapshot,open:openTrash,list:tlist};
J.notify={enable:enable,schedule:schedule,cancel:function(id){nsave(nlist().filter(function(x){return x.id!==id;}));},check:check,list:nlist};
J.badge={set:setBadge};
J.book={add:voucherBook,remove:voucherUnbook,autoOn:autoBookOn,setAuto:setAutoBook};
J.util={esc:esc,dateStr:dateStr,today:todayISO,uid:uid,toast:toast};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoLocate);
else autoLocate();
})();

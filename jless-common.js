/* JLess 共用基礎模組：全域搜尋、回收桶、本機提醒、離線快取
 * 完全本機；file:// 下自動降級（不註冊 SW、不顯示通知）。
 * API:
 *   JLess.search.open()
 *   JLess.trash.snapshot(key, label)   // 刪除前快照整個 app key
 *   JLess.trash.open()
 *   JLess.notify.enable()
 *   JLess.notify.schedule(id, ts, title, body)   // ts = epoch ms
 *   JLess.notify.check()
 */
(function(){
  'use strict';
  var J=window.JLess=window.JLess||{};

  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}
  function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}
  function dateStr(ts){var d=new Date(ts||Date.now());function p(n){return(n<10?'0':'')+n;}return d.getFullYear()+'/'+p(d.getMonth()+1)+'/'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());}

  /* ---------- Service worker（離線外殼） ---------- */
  function regSW(){
    if(!('serviceWorker' in navigator))return;
    if(!/^https?:$/.test(location.protocol))return;
    var path=(location.pathname||'/').split('/').slice(0,-1).join('/')||'';
    navigator.serviceWorker.register(path+'/sw.js').catch(function(){});
  }
  if(document.readyState==='complete')regSW();else window.addEventListener('load',regSW);

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
      '<p style="font-size:12px;color:var(--muted,#967f89);margin:0 0 12px">只保留最近 '+TMAX+' 筆；還原會以快照取代該應用目前資料。</p>';
    if(!a.length)h+='<p style="font-size:13px;color:var(--muted,#967f89);text-align:center;padding:24px 0">回收桶是空的</p>';
    a.forEach(function(x){
      h+='<div style="background:var(--panel,#fff);border:1px solid var(--line,#f0e2d8);border-radius:12px;padding:10px 12px;margin-bottom:8px">'+
        '<div style="font-size:13px;font-weight:600;color:var(--ink,#3b2530)">'+esc(x.label)+'</div>'+
        '<div style="font-size:11px;color:var(--muted,#967f89);margin:3px 0 8px">'+dateStr(x.ts)+' · '+esc(x.key)+'</div>'+
        '<button data-r="'+esc(x.id)+'" style="border:1px solid var(--accent,#c23b6a);background:var(--accent-soft,#fdeaf2);color:var(--accent,#c23b6a);border-radius:9px;padding:6px 12px;font-size:12px;font-weight:700;cursor:pointer">還原</button> '+
        '<button data-d="'+esc(x.id)+'" style="border:1px solid var(--line,#f0e2d8);background:var(--bg,#fffaf3);color:var(--muted,#967f89);border-radius:9px;padding:6px 12px;font-size:12px;cursor:pointer">永久刪除</button></div>';
    });
    box.innerHTML=h;mask.appendChild(box);document.body.appendChild(mask);
    function close(){if(mask.parentNode)mask.parentNode.removeChild(mask);}
    mask.addEventListener('click',function(e){if(e.target===mask||e.target.hasAttribute('data-x'))close();});
    box.addEventListener('click',function(e){
      var r=e.target.getAttribute&&e.target.getAttribute('data-r');
      var d=e.target.getAttribute&&e.target.getAttribute('data-d');
      if(r){
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
    'coupon_book_v1':['消費券','consume.html'],'jless_album_v1':['相簿','album.html']
  };
  function walk(o,out,depth){
    if(depth>5||out.length>4000)return;
    if(typeof o==='string'){
      if(o.length>1&&o.length<300&&o.indexOf('data:')!==0)out.push(o);
    }else if(Array.isArray(o)){
      o.forEach(function(x){walk(x,out,depth+1);});
    }else if(o&&typeof o==='object'){
      Object.keys(o).forEach(function(k){if(k!=='data'&&k!=='img'&&k!=='thumb')walk(o[k],out,depth+1);});
    }
  }
  /* 進階應用：未解鎖時不納入全域搜尋，避免泄漏資料 */
  var ADV_FILES={'wealth.html':true};
  function entries(){
    var out=[];
    var advUnlocked=false;
    try{advUnlocked=localStorage.getItem('jless_adv_v1')==='1';}catch(e){}
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
  function openSearch(){
    if(document.getElementById('jSearch'))return;
    var all=entries();
    var mask=document.createElement('div');mask.id='jSearch';
    mask.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(40,20,30,.45);display:flex;align-items:flex-start;justify-content:center;padding-top:calc(env(safe-area-inset-top) + 40px)';
    var box=document.createElement('div');
    box.style.cssText='width:100%;max-width:560px;background:var(--bg,#fffaf3);border-radius:16px;padding:14px;box-shadow:0 12px 40px rgba(0,0,0,.24)';
    box.innerHTML='<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><input id="jSearchQ" placeholder="搜尋所有應用的記錄…" style="flex:1;border:1px solid var(--line,#f0e2d8);border-radius:11px;padding:11px;background:var(--panel,#fff);color:var(--ink,#3b2530);outline:none;font-size:14px"><button data-x style="width:34px;height:34px;border-radius:10px;border:1px solid var(--line,#f0e2d8);background:var(--panel,#fff);cursor:pointer">✕</button></div><div id="jSearchR"></div>';
    mask.appendChild(box);document.body.appendChild(mask);
    var q=box.querySelector('#jSearchQ'),r=box.querySelector('#jSearchR');
    function show(term){
      term=String(term||'').trim().toLowerCase();
      var list=term?all.filter(function(x){return x.text.toLowerCase().indexOf(term)>=0;}).slice(0,30):all.slice(0,12);
      r.innerHTML=list.length?list.map(function(x,i){
        return '<a href="'+x.file+'" style="display:block;text-decoration:none;color:inherit;background:var(--panel,#fff);border:1px solid var(--line,#f0e2d8);border-radius:10px;padding:9px 11px;margin-bottom:6px">'+
          '<span style="font-size:11px;color:var(--accent,#c23b6a);font-weight:700;margin-right:8px">'+esc(x.app)+'</span>'+
          '<span style="font-size:13px">'+esc(x.text)+'</span></a>';
      }).join(''):'<p style="font-size:13px;color:var(--muted,#967f89);text-align:center;padding:18px 0">找不到相關記錄</p>';
    }
    show('');
    q.addEventListener('input',function(){show(q.value);});
    function close(){if(mask.parentNode)mask.parentNode.removeChild(mask);}
    mask.addEventListener('click',function(e){if(e.target===mask||e.target.hasAttribute('data-x'))close();});
    setTimeout(function(){q.focus();},40);
  }
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'){e.preventDefault();openSearch();}
    if(e.key==='Escape'){
      var s=document.getElementById('jSearch'),t=document.getElementById('jTrash');
      if(s&&s.parentNode)s.parentNode.removeChild(s);
      if(t&&t.parentNode)t.parentNode.removeChild(t);
    }
  });

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

  J.search={open:openSearch,entries:entries};
  J.trash={snapshot:snapshot,open:openTrash,list:tlist};
  J.notify={enable:enable,schedule:schedule,check:check,list:nlist};
  J.util={esc:esc,dateStr:dateStr};
})();

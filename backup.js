/* 共用備份模組 v2：啟動器（全量）與各應用（自身）共用
 * 用法：
 *   JLessBackup.export(keys, filename)                 // 舊版：只匯出 localStorage（同步）
 *   JLessBackup.exportFull(opts, cb)                   // 全量：localStorage + IndexedDB
 *        opts = {keys:null, includeMedia:true, filename:''}
 *   JLessBackup.importFromFile(file, keys, cb)         // 舊版：只還原 localStorage
 *   JLessBackup.importFull(file, opts, cb)             // 全量匯入
 *        opts = {mode:'replace'|'merge', includeMedia:true, allKeys:true}
 *   JLessBackup.estimate()                             // 儲存用量
 *   JLessBackup.meta() / markExport()                  // 上次匯出時間
 *   JLessBackup.allKeys()
 *
 * IndexedDB 清單：相簿相片、團購券內容。只讀取已知的 store，不動其他資料庫。
 */
(function(){
'use strict';
var PREFIX='jless_';
var META_KEY='jless_backup_meta_v1';
var IDB_LIST=[
  {db:'jless_album_db',store:'photos',label:'相簿相片'},
  {db:'tgq_db',store:'vouchers',label:'團購券'}
];

function pad(n){return (n<10?'0':'')+n;}
function ymd(){var d=new Date();return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate());}
function allKeys(){
  var ks=[];
  try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k)ks.push(k);}}catch(e){}
  return ks;
}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true;}catch(e){return false;}}

/* ---------- IndexedDB 通用讀寫 ---------- */
function openDB(name,store){
  return new Promise(function(res){
    try{
      if(!window.indexedDB){res(null);return;}
      var req=indexedDB.open(name,1);
      req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains(store))d.createObjectStore(store,{keyPath:'id'});};
      req.onsuccess=function(){res(req.result);};
      req.onerror=function(){res(null);};
      req.onblocked=function(){res(null);};
    }catch(e){res(null);}
  });
}
function readStore(name,store){
  return openDB(name,store).then(function(db){
    if(!db)return [];
    return new Promise(function(res){
      try{
        var tx=db.transaction(store,'readonly'),r=tx.objectStore(store).getAll();
        r.onsuccess=function(){res(r.result||[]);};
        r.onerror=function(){res([]);};
      }catch(e){res([]);}
    });
  });
}
function writeStore(name,store,records,clearFirst){
  return openDB(name,store).then(function(db){
    if(!db)return 0;
    return new Promise(function(res){
      try{
        var tx=db.transaction(store,'readwrite'),os=tx.objectStore(store);
        if(clearFirst)os.clear();
        var n=0;
        (records||[]).forEach(function(rec){
          if(!rec||typeof rec!=='object'||rec.id==null)return;
          try{os.put(rec);n++;}catch(e){}
        });
        tx.oncomplete=function(){res(n);};
        tx.onerror=function(){res(n);};
        tx.onabort=function(){res(n);};
      }catch(e){res(0);}
    });
  });
}
function buildIdb(){
  var out={},counts={};var jobs=IDB_LIST.map(function(it){
    return readStore(it.db,it.store).then(function(rows){
      if(rows.length){if(!out[it.db])out[it.db]={};out[it.db][it.store]=rows;counts[it.label]=rows.length;}
    });
  });
  return Promise.all(jobs).then(function(){return {data:out,counts:counts};});
}

/* ---------- 匯出 ---------- */
function build(opts){
  opts=opts||{};
  var keys=opts.keys||allKeys();
  var data={app:'jless-backup',version:2,exportedAt:new Date().toISOString(),items:{},idb:{},counts:{}};
  keys.forEach(function(k){var v=lsGet(k);if(v!==null)data.items[k]=v;});
  if(opts.includeMedia===false)return Promise.resolve(data);
  return buildIdb().then(function(r){data.idb=r.data;data.counts=r.counts;return data;});
}
function download(data,filename){
  var blob;
  try{blob=new Blob([JSON.stringify(data)],{type:'application/json;charset=utf-8'});}
  catch(e){return {ok:false,msg:'資料過大，無法建立備份'};}
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;a.download=filename||('jless-backup-'+ymd()+'.json');a.rel='noopener';a.style.display='none';
  document.body.appendChild(a);a.click();
  setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}if(a.parentNode)a.parentNode.removeChild(a);},5000);
  return {ok:true,size:blob.size};
}
function exportKeys(keys,filename){
  return download(build({keys:keys,includeMedia:false}),filename);
}
function exportFull(opts,cb){
  opts=opts||{};
  build(opts).then(function(data){
    var r=download(data,opts.filename);
    if(r.ok){
      markExport();
      if(cb)cb(true,r.size,data.counts||{});
    }else if(cb)cb(false,0,{});
  }).catch(function(){if(cb)cb(false,0,{});});
}

/* ---------- 合併（只針對已知結構；其他應用保留現有資料） ---------- */
function arr(v){return Array.isArray(v)?v:[];}
function unionById(cur,inc){
  cur=arr(cur).slice();var seen={};
  cur.forEach(function(x){if(x&&x.id!=null)seen[x.id]=1;});
  arr(inc).forEach(function(x){if(x&&x.id!=null&&!seen[x.id]){cur.push(x);seen[x.id]=1;}});
  return cur;
}
function mergeTodo(cur,inc){
  if(!cur||!Array.isArray(cur.lists))return inc;
  var by={};cur.lists.forEach(function(l){by[l.id]=l;});
  arr(inc.lists).forEach(function(il){
    var l=by[il.id];
    if(!l){cur.lists.push(il);by[il.id]=il;return;}
    ['tasks','completed'].forEach(function(k){
      var seen={};arr(l[k]).forEach(function(t){seen[t.id]=1;});
      arr(il[k]).forEach(function(t){if(t&&!seen[t.id])l[k].push(t);});
    });
  });
  return cur;
}
function mergeNote(cur,inc){
  if(!cur||!Array.isArray(cur.lists))return inc;
  var by={};cur.lists.forEach(function(l){by[l.id]=l;});
  arr(inc.lists).forEach(function(il){
    var l=by[il.id];
    if(!l){cur.lists.push(il);by[il.id]=il;return;}
    l.notes=unionById(l.notes,il.notes);
  });
  return cur;
}
function mergeQuickbook(cur,inc){
  if(!cur||typeof cur!=='object')return inc;
  cur.expense=unionById(cur.expense,inc.expense);
  cur.income=unionById(cur.income,inc.income);
  cur.accounts=unionById(cur.accounts,inc.accounts);
  cur.txns=unionById(cur.txns,inc.txns);
  cur.templates=unionById(cur.templates,inc.templates);
  return cur;
}
function mergeMember(cur,inc){
  if(!cur||typeof cur!=='object')return inc;
  cur.regions=unionById(cur.regions,inc.regions);
  cur.members=unionById(cur.members,inc.members);
  cur.txns=unionById(cur.txns,inc.txns);
  return cur;
}
function mergeHabit(cur,inc){
  if(!cur||typeof cur!=='object')return inc;
  cur.habits=unionById(cur.habits,inc.habits);
  cur.metrics=unionById(cur.metrics,inc.metrics);
  if(inc.logs&&typeof inc.logs==='object'){
    if(!cur.logs||typeof cur.logs!=='object')cur.logs={};
    Object.keys(inc.logs).forEach(function(d){
      var mine=arr(cur.logs[d]),seen={};
      mine.forEach(function(e){if(e&&e.k)seen[e.k]=1;});
      arr(inc.logs[d]).forEach(function(e){if(e&&!seen[e.k]){mine.push(e);seen[e.k]=1;}});
      if(mine.length)cur.logs[d]=mine;
    });
  }
  return cur;
}
function mergeAlbum(cur,inc){
  if(!cur||typeof cur!=='object')return inc;
  if(Array.isArray(inc.albums))cur.albums=unionById(cur.albums,inc.albums);
  if(Array.isArray(inc.photos))cur.photos=unionById(cur.photos,inc.photos);
  return cur;
}
var MERGE={
  'jless_todo_v1':mergeTodo,
  'jless_note_v1':mergeNote,
  'jless_quickbook_v1':mergeQuickbook,
  'jless_member_v1':mergeMember,
  'habit_checkin_v1':mergeHabit,
  'jless_album_v1':mergeAlbum
};
function mergeItems(items){
  var changed=0,kept=0;
  Object.keys(items||{}).forEach(function(k){
    var inc=null;try{inc=JSON.parse(items[k]);}catch(e){return;}
    var raw=lsGet(k);
    if(!raw){lsSet(k,items[k]);changed++;return;}
    var cur=null;try{cur=JSON.parse(raw);}catch(e){cur=null;}
    if(!cur||!MERGE[k]){kept++;return;}
    var merged=MERGE[k](cur,inc);
    try{lsSet(k,JSON.stringify(merged));changed++;}catch(e){kept++;}
  });
  return {changed:changed,kept:kept};
}

/* ---------- 匯入 ---------- */
function readFile(file,cb){
  var r=new FileReader();
  r.onload=function(){cb(r.result);};
  r.onerror=function(){cb(null);};
  r.readAsText(file);
}
function importFull(file,opts,cb){
  opts=opts||{};
  if(!file){if(cb)cb(false,'未選擇檔案');return;}
  readFile(file,function(text){
    if(text==null){if(cb)cb(false,'讀取失敗');return;}
    var data=null;
    try{data=JSON.parse(text);}catch(e){if(cb)cb(false,'檔案不是有效 JSON');return;}
    var items=(data&&data.items&&typeof data.items==='object')?data.items:null;
    if(!items&&data&&typeof data==='object'&&data.state){if(cb)cb(false,'這是單一應用的備份，請在該應用內匯入');return;}
    if(!items){if(cb)cb(false,'備份檔格式不正確');return;}
    var includeMedia=opts.includeMedia!==false;
    var mode=opts.mode==='merge'?'merge':'replace';

    /* 先快照目前資料，方便由回收桶還原 */
    if(window.JLess&&JLess.trash&&JLess.trash.snapshot){
      try{
        JLess.trash.snapshot('jless_todo_v1','匯入前：待辦');
        JLess.trash.snapshot('jless_note_v1','匯入前：筆記');
        JLess.trash.snapshot('jless_quickbook_v1','匯入前：記帳');
        JLess.trash.snapshot('jless_member_v1','匯入前：會員');
      }catch(e){}
    }

    var restored=0;
    if(mode==='merge'){
      var r=mergeItems(items);
      restored=r.changed;
    }else{
      Object.keys(items).forEach(function(k){
        if(opts.allKeys===false&&k.indexOf(PREFIX)!==0)return;
        if(lsSet(k,String(items[k])))restored++;
      });
    }

    var mediaJob=Promise.resolve({photos:0,vouchers:0});
    if(includeMedia&&data.idb&&typeof data.idb==='object'){
      var jobs=[];
      IDB_LIST.forEach(function(it){
        var bucket=data.idb[it.db];
        var rows=bucket&&Array.isArray(bucket[it.store])?bucket[it.store]:null;
        if(!rows)return;
        jobs.push(writeStore(it.db,it.store,rows,mode==='replace').then(function(n){
          return {store:it.store,n:n};
        }));
      });
      mediaJob=Promise.all(jobs).then(function(list){
        var o={photos:0,vouchers:0};
        list.forEach(function(x){if(x.store==='photos')o.photos=x.n;if(x.store==='vouchers')o.vouchers=x.n;});
        return o;
      });
    }
    mediaJob.then(function(media){
      var msg='已'+(mode==='merge'?'合併':'還原')+' '+restored+' 項資料';
      if(media.photos)msg+='、'+media.photos+' 張相片';
      if(media.vouchers)msg+='、'+media.vouchers+' 張券';
      if(cb)cb(true,msg,{items:restored,media:media,mode:mode});
    });
  });
}
/* 舊版 API：只處理 localStorage */
function importFromFile(file,keys,onDone){
  if(!file){if(onDone)onDone(false,'未選擇檔案');return;}
  readFile(file,function(text){
    if(text==null){if(onDone)onDone(false,'讀取失敗');return;}
    try{
      var data=JSON.parse(text);
      var items=(data&&data.items&&typeof data.items==='object')?data.items
              :(data&&typeof data==='object'&&!Array.isArray(data))?data:null;
      if(!items){if(onDone)onDone(false,'檔案格式不正確');return;}
      var restored=0,allow=(keys&&keys.length)?keys:null;
      for(var k in items){
        if(!Object.prototype.hasOwnProperty.call(items,k))continue;
        if(allow&&allow.indexOf(k)<0)continue;
        if(lsSet(k,String(items[k])))restored++;
      }
      if(onDone)onDone(true,'已還原 '+restored+' 項資料',restored);
    }catch(e){if(onDone)onDone(false,'讀取失敗：檔案可能損壞');}
  });
}

/* ---------- 用量與上次備份 ---------- */
function estimate(){
  var local=0;
  allKeys().forEach(function(k){var v=lsGet(k);if(v)local+=k.length+v.length;});
  if(!navigator.storage||!navigator.storage.estimate){
    return Promise.resolve({local:local,usage:local,quota:0,percent:0});
  }
  return navigator.storage.estimate().then(function(e){
    var usage=e.usage||0,quota=e.quota||0;
    return {local:local,usage:usage,quota:quota,percent:quota?Math.round(usage/quota*100):0};
  }).catch(function(){return {local:local,usage:local,quota:0,percent:0};});
}
function meta(){
  try{var o=JSON.parse(lsGet(META_KEY)||'{}');return o&&typeof o==='object'?o:{};}catch(e){return {};}
}
function markExport(){lsSet(META_KEY,JSON.stringify({lastExport:Date.now(),version:2}));}
function fmtSize(n){
  n=+n||0;
  if(n<1024)return n+' B';
  if(n<1048576)return (n/1024).toFixed(1)+' KB';
  if(n<1073741824)return (n/1048576).toFixed(1)+' MB';
  return (n/1073741824).toFixed(2)+' GB';
}

window.JLessBackup={
  allKeys:allKeys,export:exportKeys,exportFull:exportFull,
  importFromFile:importFromFile,importFull:importFull,
  build:build,estimate:estimate,meta:meta,markExport:markExport,fmtSize:fmtSize,
  mergeItems:mergeItems,prefix:PREFIX,idbList:IDB_LIST
};
})();

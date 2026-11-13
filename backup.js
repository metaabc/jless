/* 共用備份模組：啟動器（全量）與各應用（自身）共用
 * 用法：
 *   JLessBackup.export(keys, filename)            // keys: 字串陣列；null=全部 jless_* 鍵
 *   JLessBackup.importFromFile(file, keys, cb)    // keys: 限定還原的鍵；null=還原檔內全部
 *   JLessBackup.allKeys()                         // 傳回所有 jless_* 鍵
 */
(function(){
  'use strict';
  var PREFIX='jless_';
  function ymd(){ var d=new Date(); function p(n){return (n<10?'0':'')+n;} return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate()); }
  function allKeys(){
    /* 全量備份：匯出 localStorage 中所有鍵（含舊版非 jless_ 前綴的應用資料，如 bookmark_mgr_v1 等） */
    var ks=[];
    try{ for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i); if(k) ks.push(k); } }catch(e){}
    return ks;
  }
  function exportKeys(keys, filename){
    keys = keys || allKeys();
    var data={ app:'jless-backup', version:1, exportedAt:new Date().toISOString(), items:{} };
    keys.forEach(function(k){ try{ var v=localStorage.getItem(k); if(v!==null) data.items[k]=v; }catch(e){} });
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=filename||('jless-backup-'+ymd()+'.json'); a.rel='noopener'; a.style.display='none';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ try{URL.revokeObjectURL(url);}catch(e){} if(a.parentNode)a.parentNode.removeChild(a); },4000);
    return data;
  }
  function importFromFile(file, keys, onDone){
    if(!file){ if(onDone)onDone(false,'未選擇檔案'); return; }
    var r=new FileReader();
    r.onload=function(){
      try{
        var data=JSON.parse(r.result);
        var items = (data&&data.items&&typeof data.items==='object') ? data.items
                  : (data&&typeof data==='object'&&!Array.isArray(data)) ? data : null;
        if(!items){ if(onDone)onDone(false,'檔案格式不正確'); return; }
        var restored=0, allow = (keys&&keys.length)?keys:null;
        for(var k in items){
          if(!Object.prototype.hasOwnProperty.call(items,k)) continue;
          if(allow&&allow.indexOf(k)<0) continue;
          try{ localStorage.setItem(k, String(items[k])); restored++; }catch(e){}
        }
        if(onDone) onDone(true, '已還原 '+restored+' 項資料', restored);
      }catch(e){ if(onDone) onDone(false,'讀取失敗：檔案可能損壞'); }
    };
    r.readAsText(file);
  }
  window.JLessBackup={ allKeys:allKeys, export:exportKeys, importFromFile:importFromFile, prefix:PREFIX };
})();

/* JLess 離線外殼：只快取程式碼，不快取任何個人資料或相片 */
var CACHE='jless-shell-v10';
var SHELL=[
  './','./index.html','./theme.css','./theme.js','./share.js','./backup.js','./ga.js','./help.js','./jless-common.js',
  './favicon.svg','./manifest.json','./album-manifest.json','./jless-logo.svg','./jless-og.png',
  './todo.html','./quickbook.html','./note.html','./habit.html','./metric.html','./leave.html','./absence.html',
  './wealth.html','./bookmark.html','./remember.html','./voucher.html','./consume.html','./album.html',
  './ocr.html','./excel.html','./calc.html','./timer.html','./member.html','./share.html',
  './guide-consumer-voucher.html','./guide-rental-yield.html','./guide-spaced-repetition.html'
];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  /* 頁面導航：先取網絡（更新較即時），離線才用快取 */
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(function(res){
      if(res&&res.status===200){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){return hit||caches.match('./index.html');});
    }));
    return;
  }
  e.respondWith(caches.match(req).then(function(hit){
    return hit||fetch(req).then(function(res){
      if(res&&res.status===200&&res.type==='basic'){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){c.put(req,copy);});
      }
      return res;
    }).catch(function(){return caches.match('./index.html');});
  }));
});

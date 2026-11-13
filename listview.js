/* listview.js — 共用「卡片／清單」切換與「排序」按鈕
   設計目標：所有清單共用同一套操作——
   1) 卡片(▦)／清單(☰) 佈局切換，設定存於 localStorage；
   2) 旁邊只有一個「⇅ 排序」按鈕，點擊後才進入拖動排序模式；
   3) 平常每個項目「沒有」拖拉按鈕，排序模式下才出現握把(.lv-grip)。
   用法：
     <div class="lv-bar" id="lvBar"></div> 放在清單上方
     <容器 id="xxx"> 內每個項目須為 .lv-item 且帶 data-id，並內含一個 .lv-grip
     LV.init({id, bar, container, layout:'card'|'list', onReorder(ids){}, onSorting(s){}, onChange(l){}});
*/
(function(){
  var LV = {};
  function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function injectCSS(){
    if(window.__lvCSS) return; window.__lvCSS = true;
    var s = document.createElement('style');
    s.textContent =
      '.lv-bar{display:flex;align-items:center;gap:10px;margin:10px 16px 4px}' +
      '.lv-bar .lv-sp{flex:1}' +
      '.lv-sw{display:inline-flex;background:var(--line2,#f8efe7);border-radius:10px;padding:2px;gap:2px}' +
      '.lv-sw button{border:none;background:transparent;width:32px;height:28px;border-radius:8px;font-size:15px;cursor:pointer;color:var(--ink2,#3b2530);display:flex;align-items:center;justify-content:center}' +
      '.lv-sw button.on{background:#fff;color:var(--accent,#c23b6a);box-shadow:0 1px 4px rgba(0,0,0,.08)}' +
      '.lv-sort{border:1px solid var(--line,#f0e2d8);background:var(--panel,#fff);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:600;color:var(--ink2,#5f4b55);cursor:pointer;user-select:none;-webkit-user-select:none}' +
      '.lv-sort.on{background:var(--accent,#c23b6a);color:#fff;border-color:var(--accent,#c23b6a)}' +
      '.lv-grip{display:none}' +
      '.lv-sorting .lv-grip{display:flex;align-items:center;justify-content:center;cursor:grab;color:var(--muted,#8b7380);user-select:none;-webkit-user-select:none;touch-action:none}' +
      '.lv-sorting .lv-item{cursor:grab}' +
      '.lv-item.lv-dragging{opacity:.5;box-shadow:0 8px 20px rgba(120,60,80,.22)}';
    document.head.appendChild(s);
  }
  LV.init = function(o){
    injectCSS();
    var bar = typeof o.bar === 'string' ? document.getElementById(o.bar) : o.bar;
    var cont = typeof o.container === 'string' ? document.getElementById(o.container) : o.container;
    if(!bar || !cont) return;
    var key = 'lv_' + o.id;
    var layout = lsGet(key) || (o.layout || 'card');
    var sorting = false;
    function setLayout(l){
      layout = l; lsSet(key, l);
      cont.classList.toggle('lv-card', l === 'card');
      cont.classList.toggle('lv-list', l === 'list');
      var bs = bar.querySelectorAll('[data-lv-l]');
      for(var i=0;i<bs.length;i++){ bs[i].classList.toggle('on', bs[i].getAttribute('data-lv-l') === l); }
      if(o.onChange) o.onChange(l);
    }
    function setSorting(s){
      sorting = s;
      cont.classList.toggle('lv-sorting', s);
      var b = bar.querySelector('[data-lv-sort]');
      if(b){ b.classList.toggle('on', s); b.textContent = s ? '完成' : '⇅ 排序'; }
      if(o.onSorting) o.onSorting(s);
    }
    bar.innerHTML =
      '<span class="lv-sw">' +
        '<button type="button" data-lv-l="card" title="卡片">▦</button>' +
        '<button type="button" data-lv-l="list" title="清單">☰</button>' +
      '</span><span class="lv-sp"></span>' +
      '<button type="button" class="lv-sort" data-lv-sort>⇅ 排序</button>';
    bar.querySelector('[data-lv-l="card"]').onclick = function(){ setLayout('card'); };
    bar.querySelector('[data-lv-l="list"]').onclick = function(){ setLayout('list'); };
    bar.querySelector('[data-lv-sort]').onclick = function(){ setSorting(!sorting); };

    var dragEl = null, startY = 0, started = false;
    cont.addEventListener('pointerdown', function(e){
      if(!sorting) return;
      var grip = e.target.closest('.lv-grip');
      if(!grip) return;
      var item = grip.closest('.lv-item');
      if(!item || !cont.contains(item)) return;
      e.preventDefault();
      dragEl = item; started = false; startY = e.clientY;
      item.classList.add('lv-dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
    function onMove(e){
      if(!dragEl) return;
      if(!started && Math.abs(e.clientY - startY) > 4) started = true;
      if(!started) return;
      var after = afterY(e.clientY);
      if(after === dragEl) return;
      if(after) cont.insertBefore(dragEl, after); else cont.appendChild(dragEl);
    }
    function onUp(){
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if(dragEl) dragEl.classList.remove('lv-dragging');
      if(started && o.onReorder){
        var ids = [];
        var ns = cont.querySelectorAll('.lv-item');
        for(var i=0;i<ns.length;i++){ ids.push(ns[i].getAttribute('data-id')); }
        o.onReorder(ids);
      }
      dragEl = null; started = false;
    }
    function afterY(y){
      var els = [];
      var ns = cont.querySelectorAll('.lv-item');
      for(var i=0;i<ns.length;i++){ if(ns[i] !== dragEl) els.push(ns[i]); }
      for(var j=0;j<els.length;j++){ var r = els[j].getBoundingClientRect(); if(y < r.top + r.height/2) return els[j]; }
      return null;
    }
    setLayout(layout);
  };
  window.LV = LV;
})();

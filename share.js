/* share.js — 共用分享工具
   提供：文字分享（Web Share / 剪貼簿兜底）、圖片分享（canvas → PNG，Web Share files / 下載兜底）。
   設計目標：在無 GMS 的手機瀏覽器上也能順利把內容分享出去。
   用法：
     JLessShare.shareText(title, text, cb)        // cb(true)=已叫起分享, false=已複製/兜底
     JLessShare.shareImage(canvas, filename, cb)  // cb(true)=已叫起分享, false=已下載/兜底
     JLessShare.getVar('--accent', '#c23b6a')     // 讀取目前主題色
     JLessShare.roundRect(ctx,x,y,w,h,r)          // 圓角矩形路徑
     JLessShare.clip(s,n)                         // 截斷文字並加省略號
*/
window.JLessShare = (function () {
  function getVar(name, fb) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      v = v && v.trim();
      return v || fb;
    } catch (e) { return fb; }
  }
  function copyText(t) {
    t = String(t == null ? '' : t);
    var ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t); ok = true;
      }
    } catch (e) {}
    if (!ok) {
      try {
        var ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.top = '-9999px';
        ta.style.left = '0'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand('copy'); } catch (e2) {}
        document.body.removeChild(ta);
      } catch (e3) {}
    }
  }
  function shareText(title, text, cb) {
    text = String(text == null ? '' : text);
    if (navigator.share) {
      navigator.share({ title: title || '', text: text })
        .then(function () { cb && cb(true); })
        .catch(function () { copyText(text); cb && cb(false); });
    } else {
      copyText(text); cb && cb(false);
    }
  }
  function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    if (r < 0) r = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function clip(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function shareImage(canvas, filename, cb) {
    filename = filename || 'jless-share.png';
    function download() {
      try {
        var url = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } catch (e) {}
      cb && cb(false);
    }
    if (!canvas.toBlob) { download(); return; }
    canvas.toBlob(function (blob) {
      if (!blob) { download(); return; }
      var file = new File([blob], filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: filename })
          .then(function () { cb && cb(true); })
          .catch(function () { download(); });
      } else {
        download();
      }
    }, 'image/png');
  }

  /* ---------- Excel / CSV 匯出 ---------- */
  function csvCell(s) {
    s = String(s == null ? '' : s);
    if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function shareCSV(rows, filename, cb) {
    filename = filename || 'jless-export.csv';
    if (!/\.csv$/i.test(filename)) filename += '.csv';
    var csv = '﻿' + rows.map(function (r) {
      return r.map(csvCell).join(',');
    }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var file = new File([blob], filename, { type: 'text/csv' });
    function download() {
      try {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 2000);
      } catch (e) {}
      cb && cb(false);
    }
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: filename })
        .then(function () { cb && cb(true); })
        .catch(function () { download(); });
    } else {
      download();
    }
  }

  /* ---------- 分享方式選單（圖片 / 文字 / Excel） ---------- */
  function ensureSheet() {
    if (document.getElementById('jlShareMask')) return;
    var st = document.createElement('style');
    st.textContent =
      '#jlShareMask{position:fixed;inset:0;background:rgba(0,0,0,.42);z-index:95;opacity:0;pointer-events:none;transition:opacity .2s}' +
      '#jlShareMask.on{opacity:1;pointer-events:auto}' +
      '#jlShareSheet{position:fixed;left:0;right:0;bottom:0;max-width:600px;margin:0 auto;background:var(--bg,#fff);border-radius:20px 20px 0 0;padding:14px 14px calc(18px + env(safe-area-inset-bottom,0px));z-index:96;transform:translateY(115%);transition:transform .26s cubic-bezier(.32,.72,0,1);box-shadow:0 -8px 30px rgba(0,0,0,.15)}' +
      '#jlShareSheet.on{transform:translateY(0)}' +
      '.jl-ss-head{font-size:calc(12.5px*var(--fs,1));font-weight:800;color:var(--muted,#888);text-align:center;margin-bottom:12px;letter-spacing:.3px}' +
      '.jl-ss-list{display:flex;flex-direction:column;gap:8px}' +
      '.jl-ss-item{border:none;border-radius:13px;padding:14px;font-size:calc(15px*var(--fs,1));font-weight:700;cursor:pointer;background:var(--panel,#fff);color:var(--ink,#333);border:1px solid var(--line,#eee);user-select:none;-webkit-user-select:none}' +
      '.jl-ss-item:active{background:var(--line2,#f3f3f3)}' +
      '.jl-ss-cancel{margin-top:8px;background:var(--gray-bg,#f0f0f0);color:var(--ink2,#555)}';
    document.head.appendChild(st);
    var mask = document.createElement('div'); mask.id = 'jlShareMask';
    mask.innerHTML =
      '<div id="jlShareSheet">' +
      '<div class="jl-ss-head">選擇分享方式</div>' +
      '<div class="jl-ss-list"></div>' +
      '<button class="jl-ss-item jl-ss-cancel" onclick="JLessShare._closeSheet()">取消</button>' +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) JLessShare._closeSheet(); });
  }
  function openSheet(opts) {
    opts = opts || {};
    var items = [];
    if (typeof opts.image === 'function') items.push(['🖼️ 分享為圖片', opts.image]);
    if (typeof opts.text === 'function') items.push(['📝 分享為文字', opts.text]);
    if (typeof opts.excel === 'function') items.push(['📊 匯出 Excel (CSV)', opts.excel]);
    if (!items.length) return;
    ensureSheet();
    var mask = document.getElementById('jlShareMask');
    mask.querySelector('.jl-ss-head').textContent = opts.title || '選擇分享方式';
    var list = mask.querySelector('.jl-ss-list');
    list.innerHTML = '';
    items.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'jl-ss-item';
      b.textContent = it[0];
      b.onclick = function () { JLessShare._closeSheet(); try { it[1](); } catch (e) { console.error(e); } };
      list.appendChild(b);
    });
    mask.classList.add('on');
    document.getElementById('jlShareSheet').classList.add('on');
  }
  function closeSheet() {
    var mask = document.getElementById('jlShareMask');
    if (!mask) return;
    mask.classList.remove('on');
    document.getElementById('jlShareSheet').classList.remove('on');
  }

  return {
    getVar: getVar,
    copyText: copyText,
    shareText: shareText,
    roundRect: roundRect,
    clip: clip,
    shareImage: shareImage,
    shareCSV: shareCSV,
    openSheet: openSheet,
    _closeSheet: closeSheet
  };
})();

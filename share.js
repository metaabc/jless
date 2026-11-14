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

  /* ---------- 產生合法 .xlsx（STORE 方式，不需壓縮演算法） ---------- */
  function crc32(buf) {
    var c, table = crc32.table;
    if (!table) {
      table = crc32.table = [];
      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
    }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function buildZip(files) {
    var enc = new TextEncoder();
    var parts = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nameBytes = enc.encode(f.name);
      var dataBytes = enc.encode(f.str);
      var crc = crc32(dataBytes), size = dataBytes.length;
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
      lh.setUint16(26, nameBytes.length, true); lh.setUint16(28, 0, true);
      parts.push({ lh: new Uint8Array(lh.buffer), name: nameBytes, data: dataBytes });
      central.push({ crc: crc, size: size, name: nameBytes, offset: offset });
      offset += 30 + nameBytes.length + size;
    });
    var cdParts = [];
    central.forEach(function (c) {
      var h = new DataView(new ArrayBuffer(46));
      h.setUint32(0, 0x02014b50, true); h.setUint16(4, 20, true); h.setUint16(6, 20, true);
      h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0, true); h.setUint16(14, 0, true);
      h.setUint32(16, c.crc, true); h.setUint32(20, c.size, true); h.setUint32(24, c.size, true);
      h.setUint16(28, c.name.length, true); h.setUint16(30, 0, true); h.setUint16(32, 0, true);
      h.setUint16(34, 0, true); h.setUint16(36, 0, true); h.setUint32(38, 0, true); h.setUint32(42, c.offset, true);
      cdParts.push(new Uint8Array(h.buffer), c.name);
    });
    var cdSize = cdParts.reduce(function (s, b) { return s + b.length; }, 0);
    var eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(4, 0, true); eocd.setUint16(6, 0, true);
    eocd.setUint16(8, central.length, true); eocd.setUint16(10, central.length, true);
    eocd.setUint32(12, cdSize, true); eocd.setUint32(16, offset, true); eocd.setUint16(20, 0, true);
    var total = offset + cdSize + 22;
    var out = new Uint8Array(total), p = 0;
    parts.forEach(function (pt) {
      out.set(pt.lh, p); p += pt.lh.length; out.set(pt.name, p); p += pt.name.length; out.set(pt.data, p); p += pt.data.length;
    });
    cdParts.forEach(function (b) { out.set(b, p); p += b.length; });
    out.set(new Uint8Array(eocd.buffer), p);
    return out;
  }
  function xlCol(n) {
    var s = ''; n = n + 1;
    while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
    return s;
  }
  function xlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }
  function rowsToSheetXML(rows) {
    var sb = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'];
    sb.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>');
    for (var r = 0; r < rows.length; r++) {
      sb.push('<row r="' + (r + 1) + '">');
      var row = rows[r] || [];
      for (var c = 0; c < row.length; c++) {
        var val = row[c];
        var ref = xlCol(c) + (r + 1), isH = (r === 0), s = (val == null ? '' : String(val)).trim();
        if (s === '') { sb.push('<c r="' + ref + '"' + (isH ? ' s="1"' : '') + '/>'); continue; }
        if (/^-?\d+(\.\d+)?$/.test(s) && s.length <= 15) {
          sb.push('<c r="' + ref + '"' + (isH ? ' s="1"' : '') + '><v>' + s + '</v></c>');
        } else {
          sb.push('<c r="' + ref + '"' + (isH ? ' s="1"' : '') + ' t="inlineStr"><is><t xml:space="preserve">' + xlEsc(s) + '</t></is></c>');
        }
      }
      sb.push('</row>');
    }
    sb.push('</sheetData></worksheet>');
    return sb.join('');
  }
  function xlsxParts(rows) {
    var sheet = rowsToSheetXML(rows);
    return [
      { name: '[Content_Types].xml', str: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        '</Types>' },
      { name: '_rels/.rels', str: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>' },
      { name: 'xl/workbook.xml', str: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', str: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>' },
      { name: 'xl/styles.xml', str: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
        '<borders count="1"><border/></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
        '</styleSheet>' },
      { name: 'xl/worksheets/sheet1.xml', str: sheet }
    ];
  }
  function xlsxBlob(rows) {
    return new Blob([buildZip(xlsxParts(rows))],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function shareXLSX(rows, filename, cb) {
    filename = filename || 'jless-export.xlsx';
    if (!/\.xlsx$/i.test(filename)) filename += '.xlsx';
    var blob = xlsxBlob(rows);
    var file = new File([blob], filename, { type: blob.type });
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

  return {
    getVar: getVar,
    copyText: copyText,
    shareText: shareText,
    roundRect: roundRect,
    clip: clip,
    shareImage: shareImage,
    shareCSV: shareCSV,
    shareXLSX: shareXLSX,
    openSheet: openSheet,
    _closeSheet: closeSheet
  };
})();

/* ============================================================
   jless 共用使用說明元件  help.js
   - 集中管理各應用的「精要～常用場景例子」說明
   - 自動在頁面注入一個 ❓ 浮動入口 + 說明彈窗（底部 sheet）
   - 只使用 theme.css 提供的 CSS 變數，自帶 --gray-bg fallback
   - 完全離線、不傳任何資料；點開時可選上報 help_open（若頁面有 gtag）
   用法：在页面 </body> 前加 <script src="help.js"></script> 即可
   ============================================================ */
(function(){
  'use strict';

  /* 目前檔案名稱（file:// / http 皆適用） */
  var file='';
  try{ file=(location.pathname||'').split('/').pop(); }catch(e){}
  if(!file) return;

  /* ---- 各應用說明：標題 + 若干場景（scene / how）---- */
  var DATA={
    'metric.html':{name:'指標',scenes:[
      ['追蹤一個目標','點右下「＋」→ 輸入名稱（如「體重」）、單位（kg）、目標值 →「儲存指標」。'],
      ['每天記一次數值','點該指標卡 → 輸入數值與日期 →「記錄」，卡片即顯示目前值、目標與進度。'],
      ['首頁直接看到','在指標詳情點「📌 設為首頁顯示」，首頁該應用卡便會顯示此指標的數值與目標。'],
      ['看趨勢 / 分享','詳情內有折線／柱狀／面積圖可切換；設定可匯出 PNG 圖片、文字或 CSV。']
    ]},
    'quickbook.html':{name:'記帳',scenes:[
      ['3 秒記一筆','首頁選「支出／收入」→ 點分類 → 輸入金額（可用 + − × ÷）→「儲存」。'],
      ['指定帳戶 / 日期','記帳前在帳戶選擇（如信用卡），或點日期改為其它日子；未選則用設定的預設帳戶。'],
      ['查這個月花多少','「統計」選月份看橫向柱圖；可用帳戶、分類篩選；「明細」可逐筆查看。'],
      ['分享明細','「設定 → 匯出 CSV」把收支傳出試算表；長按清單可調順序、改分類名稱與圖示。']
    ]},
    'consume.html':{name:'消費連環賞',scenes:[
      ['記錄一張券','在對應週次／格位填入面額（a）， bounty 用完時標示「已用」，即可統計總額與未用金額。'],
      ['快速標記','點格位直接輸入金額；「p」代表自訂／待抽，不計入統計。'],
      ['首頁看餘額','首頁卡片會顯示「未用」金額，一眼知道還剩多少消費券。']
    ]},
    'habit.html':{name:'小習慣',scenes:[
      ['建立習慣','設定或「＋」新增習慣，設定每日／每週目標与圖示。'],
      ['每日打卡','在主畫面點該習慣的格位即完成打卡；可補記過去日期。'],
      ['看連續天數','卡片會顯示連續達成天數與完成率，設定可看熱力圖與統計。'],
      ['分享成果','設定可匯出打卡紀錄或圖片，方便自我激勵或回報。']
    ]},
    'bookmark.html':{name:'書籤',scenes:[
      ['快速存一個網址','貼上網址 → 抓取標題／說明／預覽圖 → 選標籤 → 儲存。'],
      ['用關鍵字自動分類','設定 → 標籤管理，為標籤設「配對關鍵字」，抓取時命中即自動建議標籤。'],
      ['找回收藏','用搜尋框按名稱、網址或標籤篩選；點書籤即開新分頁。']
    ]},
    'todo.html':{name:'待辦',scenes:[
      ['加一項待辦','點「＋」輸入內容；可設到期日、提醒與附件。'],
      ['管理多个清單','用頂部清單列切換不同主題（如工作／家庭）；「＋」可新增清單。'],
      ['查看近期','首頁卡片顯示「未來 7 天即將到期」數量，避免漏掉期限。'],
      ['完成與排序','點方塊標記完成；可拖曳調整順序、滑動做更多操作。']
    ]},
    'remember.html':{name:'記憶卡',scenes:[
      ['做一張卡','輸入正面（題目）與背面（答案），可加入雙語或朗讀語音。'],
      ['逐張誦讀','開始誦讀模式，系統依設定語音逐張念出，適合背誦與語言練習。'],
      ['雙面列印','設定版面後匯出 PDF，列印後裁開即成紙本字卡。'],
      ['直接分享','「↗ 分享」可即時產生 PDF 或 Excel 傳到通訊軟體或雲端。']
    ]},
    'note.html':{name:'筆記',scenes:[
      ['寫一則筆記','點「＋」輸入標題與內容，可選顏色分類；支援清單與插入圖片。'],
      ['用清單整理','在筆記內建立核取清單，適合購物、待辦步驟。'],
      ['跨清單管理','頂部可切換不同筆記清單， long press 可拖曳排序。'],
      ['備份','設定可匯出／匯入全部筆記，避免換機遺失。']
    ]},
    'absence.html':{name:'缺勤',scenes:[
      ['記一段病假','新增缺勤，選類型（病假／親屬照料）、開始與結束日期。'],
      ['自動算天數','填了起訖日後會自動計算天數（含首尾），首頁顯示累計缺勤日數。'],
      ['查紀錄','明細列出每筆缺勤，可長期追蹤與統計。']
    ]},
    'ocr.html':{name:'圖文翻譯',scenes:[
      ['拍照辨識','上載或拍攝圖片 → 自動辨識圖中文字。'],
      ['覆蓋譯文','選擇目標語言，辨識後把譯文疊回原圖位置，方便截圖溝通。'],
      ['儲存 / 分享','可存目前結果或分享圖片，出遊看菜單、文件都好用。'],
      ['小提醒','需網路連線使用辨識／翻譯功能。']
    ]},
    'album.html':{name:'相簿',scenes:[
      ['上載相片','到「相簿」點上載（可多張）；預設會自動縮小至 1280px 省空間、開更快。'],
      ['建立相簿','相簿頁頂「＋ 新增」建立多個相簿，上載的相片會放進目前開啟的相簿。'],
      ['選喜愛','點相片右上 ♡ 加入喜愛；首頁只顯示喜愛相片。'],
      ['多選分享','主頁／相簿按「☑️ 選取」，可拖拉連續選取，再一次分享多張。'],
      ['換排版','右上角可切換网格 2/3/4、瀑布流、列表、緊湊等六種佈局。']
    ]},
    'leave.html':{name:'年假',scenes:[
      ['設定額度','先設定年度年假總額，App 會計算剩餘天數。'],
      ['排休','新增假期選日期與狀態（已排／安排中）；月曆可視覺化排休。'],
      ['首頁提醒','首頁卡片顯示下一個「安排中」的假期日期。']
    ]},
    'calc.html':{name:'計算器',scenes:[
      ['租金回報率','輸入每月租金與樓價，一鍵算出租金回報率。'],
      ['定期計算','輸入本金、利率、年期，試算到期本息。'],
      ['一般運算','支援 + − × ÷，可直接當滑鼠計算器用。']
    ]},
    'excel.html':{name:'Excel 表格工具',scenes:[
      ['匯入 CSV','選擇或贴上 CSV 檔，自動解析成表格。'],
      ['篩選統計','依欄位篩選、排序並統計筆數或總和。'],
      ['打標籤','為列加上標籤分類，方便後續群組分析。']
    ]},
    'timer.html':{name:'計時',scenes:[
      ['倒數計時','輸入時間開始倒數，適合烹飪、休息提醒。'],
      ['碼表計時','點開始／暫停記錄經過時間，可分段（lap）。'],
      ['番茄鐘','內建番茄鐘節奏（專注／休息），適合讀書工作。']
    ]},
    'pt.html':{name:'作業佈置',scenes:[
      ['快速佈置','選擇班級／日期，輸入科目與作業內容即可新增一項。'],
      ['補充說明','可補充內容、附件與考量，統一格式。'],
      ['彙整輸出','把多天／多科作業彙成文字，方便貼到群組或列印。']
    ]},
    'voucher.html':{name:'團購券',scenes:[
      ['新增團購券','輸入名稱、面額、有效期與使用條件。'],
      ['追蹤使用','標記已使用／剩餘金額，避免過期浪費。'],
      ['設定說明','右上角設定 →「使用說明」有完整圖文步驟。']
    ]},
    'remember_extra_placeholder':null
  };

  var info=DATA[file];
  if(!info||!info.scenes||!info.scenes.length) return; /* 沒有說明（含 wealth）則不顯示 */

  /* ---- 樣式（independent，使用 theme 變數 + fallback）---- */
  var css=''
    +'.jhelp-fab{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom) + 18px);z-index:60;'
    +'width:42px;height:42px;border-radius:50%;border:1px solid var(--line,#f0e2d8);'
    +'background:var(--panel,#fff);color:var(--accent,#c23b6a);font-size:20px;font-weight:800;'
    +'box-shadow:0 3px 12px rgba(120,60,80,.18);cursor:pointer;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none}'
    +'.jhelp-fab:active{transform:scale(.94)}'
    +'.jhelp-mask{position:fixed;inset:0;background:rgba(40,20,30,.45);z-index:120;display:none;align-items:flex-end;justify-content:center}'
    +'.jhelp-mask.on{display:flex}'
    +'.jhelp-sheet{width:100%;max-width:560px;background:var(--bg,#fffaf3);border-radius:20px 20px 0 0;'
    +'max-height:88vh;overflow:auto;padding:16px 18px calc(env(safe-area-inset-bottom) + 22px);'
    +'box-shadow:0 -8px 30px rgba(40,20,30,.18)}'
    +'.jhelp-head{display:flex;align-items:center;gap:8px;margin:2px 0 12px}'
    +'.jhelp-head h3{margin:0;font-size:calc(16px*var(--fs,1));font-weight:800;color:var(--ink,#3b2530)}'
    +'.jhelp-head .jhelp-x{margin-left:auto;width:32px;height:32px;border-radius:9px;border:1px solid var(--line,#f0e2d8);'
    +'background:var(--panel,#fff);color:var(--muted,#967f89);cursor:pointer;font-size:16px}'
    +'.jhelp-lead{font-size:calc(12px*var(--fs,1));color:var(--muted,#967f89);margin:0 0 12px;line-height:1.6}'
    +'.jhelp-item{background:var(--panel,#fff);border:1px solid var(--line,#f0e2d8);border-radius:13px;'
    +'padding:11px 13px;margin-bottom:9px}'
    +'.jhelp-item b{display:block;font-size:calc(13.5px*var(--fs,1));color:var(--accent,#c23b6a);margin-bottom:4px}'
    +'.jhelp-item p{margin:0;font-size:calc(12.5px*var(--fs,1));color:var(--ink2,#5f4b55);line-height:1.7}'
    +'.jhelp-note{font-size:calc(11px*var(--fs,1));color:var(--muted,#967f89);text-align:center;margin:12px 0 0;line-height:1.6}'
    +'.jhelp-ok{display:block;width:100%;border:none;border-radius:13px;padding:13px;margin-top:6px;'
    +'background:var(--accent,#c23b6a);color:#fff;font-weight:800;font-size:calc(14px*var(--fs,1));cursor:pointer}';

  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  /* ---- 建立 DOM ---- */
  var fab=document.createElement('button');
  fab.className='jhelp-fab';fab.type='button';fab.title='使用說明';fab.setAttribute('aria-label','使用說明');fab.textContent='?';

  var mask=document.createElement('div');mask.className='jhelp-mask';
  var sheet=document.createElement('div');sheet.className='jhelp-sheet';
  var html='<div class="jhelp-head"><h3>使用說明 · '+esc(info.name)+'</h3><button class="jhelp-x" type="button" aria-label="關閉">✕</button></div>'
    +'<p class="jhelp-lead">常用場景快速上手：</p>';
  info.scenes.forEach(function(s){
    if(!s||!s.length)return;
    if(typeof s==='string'){ html+='<p class="jhelp-note">'+esc(s)+'</p>'; return; }
    html+='<div class="jhelp-item"><b>'+esc(s[0])+'</b><p>'+esc(s[1]||'')+'</p></div>';
  });
  html+='<button class="jhelp-ok" type="button">知道了</button>'
    +'<p class="jhelp-note">資料只存於本機瀏覽器 · 僅供參考</p>';
  sheet.innerHTML=html;mask.appendChild(sheet);
  document.body.appendChild(fab);document.body.appendChild(mask);

  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function open(){mask.classList.add('on');try{if(window.gtag)window.gtag('event','help_open',{});}catch(e){}}
  function close(){mask.classList.remove('on');}

  fab.addEventListener('click',open);
  sheet.querySelector('.jhelp-x').addEventListener('click',close);
  sheet.querySelector('.jhelp-ok').addEventListener('click',close);
  mask.addEventListener('click',function(e){if(e.target===mask)close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});

  /* 若頁面已有 #helpBtn / #btnHelp，讓它也開啟本說明（避免重複時行為一致） */
  ['helpBtn','btnHelp'].forEach(function(id){
    var b=document.getElementById(id);
    if(b&&!b.__jhelpBound){ b.addEventListener('click',function(){open();}); b.__jhelpBound=true; }
  });
})();

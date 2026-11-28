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
      ['看趨勢 / 分享','詳情內有折線／柱狀／面積圖可切換；設定可匯出 PNG 圖片、文字或 CSV。'],
      ['提醒與進度','詳情可按「提醒我記錄」設定每日／每週；卡片有圓環進度與「比上次 +X／−X」摘要。'],
    ]},
    'quickbook.html':{name:'記帳',scenes:[
      ['3 秒記一筆','首頁選「支出／收入」→ 點分類 → 輸入金額（可用 + − × ÷）→「儲存」。'],
      ['連續記幾筆','面板勾選「儲存後繼續記下一筆」，儲存後面板不關、金額清空，分類沿用，適合一次補記整天。'],
      ['常用組合','面板上方會出現你用過 2 次以上的「分類＋金額」快捷（如 ☕ 25），點一下即填好，再按儲存。'],
      ['指定帳戶 / 日期','記帳前在帳戶選擇（如信用卡），或點日期改為其它日子；未選則用設定的預設帳戶。'],
      ['查這個月花多少','「統計」選月份看橫向柱圖；可用帳戶、分類篩選；「明細」可逐筆查看。'],
      ['刪錯可復原','刪除明細不再彈確認，底部會出現「復原」，按一下即原位插回。'],
      ['分享明細','「設定 → 匯出 CSV」把收支傳出試算表；長按清單可調順序、改分類名稱與圖示。'],
      ['預算與週期','設定可設月度預算與分類預算；週期交易一鍵套用本月；每筆可附 320px 收據縮圖。'],
    ]},
    'consume.html':{name:'消費連環賞',scenes:[
      ['記錄一張券','在對應週次／格位填入面額（a）， bounty 用完時標示「已用」，即可統計總額與未用金額。'],
      ['快速標記','點格位直接輸入金額；「p」代表自訂／待抽，不計入統計。'],
      ['首頁看餘額','首頁卡片會顯示「未用」金額，一眼知道還剩多少消費券。'],
      ['到期提醒','可設到期提醒（7 日／3 日／當日），頁內會列出即將過期的券。'],
      ['用券自動記帳','設定勾選「用券時自動記入記帳」後，標為「已消」會寫一筆支出；長按還原會一併移除。'],
    ]},
    'member.html':{name:'會員',scenes:[
      ['新增會員','按底部「＋ 新增會員」→ 輸入商店名稱、選擇地區，可即時上載會員證卡圖 →「儲存」。'],
      ['快捷充值','會員詳情按「＋ 充值」，直接點 100／300／500／1000，或輸入自訂金額；有贈送就填「贈送金額」。金額按鈕可在設定改（如 50／200／800）。'],
      ['記錄消費','按「－ 消費」輸入金額，日期預設今天，可改成之前日子補記；餘額即時扣減。'],
      ['出示會員條碼','會員詳情按「▥ 出示會員條碼」放大成條碼卡（編輯會員時填「卡號／條碼」即可，店員掃描用）。'],
      ['低餘額提醒','設定 →「低餘額提醒」設門檻（如 100）；低於門檻的會員卡片會標紅，充值時一眼看到誰要加值。'],
      ['記入記帳','設定可開啟「消費自動記入記帳」，選好對應分類後，每次會員消費同時寫進記帳，不必重複輸入。'],
      ['優惠到期提醒','編輯會員時填「優惠到期日」；詳情會顯示剩幾天，並在到期前 3 日於本頁提醒。'],
      ['看餘額','會員卡片直接顯示目前餘額；詳情頁分開顯示充值本金、贈送與已消費。'],
      ['優惠記錄','編輯會員時可在「優惠」多行輸入滿減、折扣、生日禮遇或到期日；詳情頁會顯示，分享時可一併帶出。'],
      ['地區與佈局','開啟時預設看「默認」地區，之後會記住上次選取的地區；頂部 tab 切換，右上 ▦ 循環切換三種佈局。'],
      ['手動排序','按餘額行右邊「⇅ 排序」，按住 ⋮⋮ 拖動或用 ↑↓ 微調；「回復自動排序」會改回最近使用優先。'],
      ['分享卡圖與餘額','會員詳情右上 ↗ 可分享「卡圖＋餘額」合成圖、只分享會員證卡圖，或純文字餘額（含優惠）；放大卡圖時右上亦可分享。'],
      ['批次分享','右上 ☑ 進入選取，點卡片多選或「全選」，再按「分享」可一次過分享餘額一覽圖、餘額文字或優惠文字。'],
      ['會員卡圖','上載時自動壓縮至 760px、約 60KB 以內，節省儲存空間；詳情頁點卡圖可放大查看。'],
      ['備份','「設定 → 匯出備份」存成 JSON；換機或清理瀏覽器前先匯出。'],
    ]},
    'habit.html':{name:'小習慣',scenes:[
      ['建立習慣','設定或「＋」新增習慣，設定每日／每週目標与圖示。'],
      ['每日打卡','在主畫面點該習慣的格位即完成打卡；可補記過去日期。'],
      ['看連續天數','卡片會顯示連續達成天數與完成率，設定可看熱力圖與統計。'],
      ['分享成果','設定可匯出打卡紀錄或圖片，方便自我激勵或回報。'],
      ['快速補打卡','「補記昨日」與「今日全部打卡」一鍵完成；每個習慣可設每週 N 次目標。'],
      ['只揀特定日子出現','編輯習慣 →「日子」點選週一至週日，未揀嘅日子唔會出現在首頁今日清單；全選即每日。'],
    ]},
    'bookmark.html':{name:'書籤',scenes:[
      ['快速存一個網址','貼上網址 → 抓取標題／說明／預覽圖 → 選標籤 → 儲存。'],
      ['用關鍵字自動分類','設定 → 標籤管理，為標籤設「配對關鍵字」，抓取時命中即自動建議標籤。'],
      ['找回收藏','用搜尋框按名稱、網址或標籤篩選；點書籤即開新分頁。'],
      ['離線筆記','書籤可加離線筆記並納入搜尋；「🔎 檢查」只在使用者點擊時測試連結是否可達。'],
    ]},
    'todo.html':{name:'待辦',scenes:[
      ['加一項待辦','點「＋」輸入內容；可設到期日、提醒與附件。'],
      ['管理多个清單','用頂部清單列切換不同主題（如工作／家庭）；「＋」可新增清單。'],
      ['查看近期','首頁卡片顯示「未來 7 天即將到期」數量，避免漏掉期限。'],
      ['完成與排序','點方塊標記完成；可拖曳調整順序、滑動做更多操作。'],
      ['到期提醒','設定 →「到期提醒」開啟通知後，有到期日的任務會在當天提醒（需保持頁面開啟）。'],
      ['刪錯可復原','刪除任務不再彈確認，底部「復原」可即時插回原本位置。'],
      ['自然輸入','輸入「明天 3點 交作業 #工作」會自動拆出日期、時間與標籤；完成後移到「已完成」，可還原。'],
    ]},
    'remember.html':{name:'記憶卡',scenes:[
      ['做一張卡','輸入正面（題目）與背面（答案），可加入雙語或朗讀語音。'],
      ['逐張誦讀','開始誦讀模式，系統依設定語音逐張念出，適合背誦與語言練習。'],
      ['雙面列印','設定版面後匯出 PDF，列印後裁開即成紙本字卡。'],
      ['直接分享','「↗ 分享」可即時產生 PDF 或 Excel 傳到通訊軟體或雲端。'],
      ['間隔重複','答對升盒（1/3/7/14/30 日），答錯回第 1 盒並記入錯題本；可只看今日到期與調整朗讀語速。'],
    ]},
    'note.html':{name:'筆記',scenes:[
      ['寫一則筆記','點「＋」輸入標題與內容，可選顏色分類；支援清單與插入圖片。'],
      ['用清單整理','在筆記內建立核取清單，適合購物、待辦步驟。'],
      ['跨清單管理','頂部可切換不同筆記清單， long press 可拖曳排序。'],
      ['備份','設定可匯出／匯入全部筆記，避免換機遺失。'],
      ['模板與置頂','新增時可選備課／會議記錄／購物清單模板；重要筆記可置頂。'],
    ]},
    'absence.html':{name:'缺勤',scenes:[
      ['記一段病假','新增缺勤，選類型（病假／親屬照料）、開始與結束日期。'],
      ['自動算天數','填了起訖日後會自動計算天數（含首尾），首頁顯示累計缺勤日數。'],
      ['查紀錄','明細列出每筆缺勤，可長期追蹤與統計。'],
      ['合併日曆','缺勤與年假在同一月曆顯示，天數同時列原日數與工作日（跳週末），並按原因統計。'],
    ]},
    'ocr.html':{name:'圖文翻譯',scenes:[
      ['拍照辨識','上載或拍攝圖片 → 自動辨識圖中文字。'],
      ['覆蓋譯文','選擇目標語言，辨識後把譯文疊回原圖位置，方便截圖溝通。'],
      ['儲存 / 分享','可存目前結果或分享圖片，出遊看菜單、文件都好用。'],
      ['小提醒','需網路連線使用辨識／翻譯功能。']
    ]},
    'album.html':{name:'相簿',scenes:[
      ['上載相片','到「相簿」點上載（可多張）；預設自動縮至 1280px。相片存 IndexedDB，可累積數百張；重複的會自動略過。'],
      ['建立相簿','相簿頁頂「＋ 新增」建立多個相簿，上載的相片會放進目前開啟的相簿；查看器「更多 → 移至相簿」可單張移動。'],
      ['回憶時光','首頁頂部自動精選「去年的今天」舊相片，點一下即回看，是每天回來看看的理由。'],
      ['標籤與搜尋','查看器「更多 → 標籤備註」可加標籤（空白分隔）與備註；搜尋框下會列常用標籤，點一下即篩選。'],
      ['幻燈片與縮放','查看器「更多 → 幻燈片」每 3 秒自動換張；雙指可縮放、拖曳移動，雙擊快速放大。'],
      ['選喜愛','點相片右上 ♡ 加入喜愛；首頁只顯示喜愛相片。'],
      ['多選與分享','右上角按 ☑️ 選取，可拖拉連續選取；底部「📤 分享」可一次分享多張，「全選」再按一次可取消。'],
      ['批量刪除','選取多張後按底部「🗑️ 刪除」，會先確認再一次刪除；刪除後自動離開選取模式。'],
      ['批量移動相簿','選取多張 → 底部「📁 移至」可一次放進現有相簿，或「＋ 新建相簿」邊移動邊建立。'],
      ['時間軸分年份','排版切到「時間軸」時會按「年份 → 月份」分層，年份標題會貼在頂部，長相簿也找得快。'],
      ['清空相簿','選取某個相簿後，搜尋列右邊會出現 🗑，按一下確認即清空該相簿（相簿會保留）；「設定 → 相簿管理」每列亦有 🧹，全局清除在「資料管理」。'],
      ['換排版','右上角按 ▦，一次過切換网格、瀑布流、列表、緊湊、時間軸等七種佈局；設定頁亦可選。'],
      ['私隐與備份','相片永遠不上雲、只有你看得到；到「設定 → 資料管理」可匯出完整備份（含相片）。'],
      ['智能視角','相簿列新增今年／上月／標籤／喜愛快篩；「查看重複」可清完全重複相片；每個相簿自動帶封面。'],
    ]},
    'leave.html':{name:'年假',scenes:[
      ['設定額度','先設定年度年假總額，App 會計算剩餘天數。'],
      ['排休','新增假期選日期與狀態（已排／安排中）；月曆可視覺化排休。'],
      ['首頁提醒','首頁卡片顯示下一個「安排中」的假期日期。'],
      ['工作日與合併','假期同時顯示原日數與工作日（跳週末），頂部有剩餘假期與下個假期倒數；並列顯示缺勤紀錄。'],
    ]},
    'calc.html':{name:'計算器',scenes:[
      ['租金回報率','輸入每月租金與樓價，一鍵算出租金回報率。'],
      ['定期計算','輸入本金、利率、年期，試算到期本息。'],
      ['一般運算','支援 + − × ÷，可直接當滑鼠計算器用。'],
      ['歷史與換算','一般計算保留最近 20 筆可複製或清空；另支援長度／重量／溫度單位換算。'],
    ]},
    'excel.html':{name:'Excel 表格工具',scenes:[
      ['匯入 CSV','選擇或贴上 CSV 檔，自動解析成表格。'],
      ['篩選統計','依欄位篩選、排序並統計筆數或總和。'],
      ['打標籤','為列加上標籤分類，方便後續群組分析。'],
      ['欄位統計','勾選欄位後可按 SUM／AVERAGE／COUNT 即時統計，結果仍可匯出 CSV。'],
    ]},
    'timer.html':{name:'計時',scenes:[
      ['倒數計時','輸入時間開始倒數，適合烹飪、休息提醒。'],
      ['碼表計時','點開始／暫停記錄經過時間，可分段（lap）。'],
      ['番茄鐘','內建番茄鐘節奏（專注／休息），適合讀書工作。'],
      ['多個倒數','可同時開多個計時器，重整後自動還原；完成時有聲音與通知。'],
    ]},
    'pt.html':{name:'作業佈置',scenes:[
      ['快速佈置','選擇班級／日期，輸入科目與作業內容即可新增一項。'],
      ['補充說明','可補充內容、附件與考量，統一格式。'],
      ['彙整輸出','把多天／多科作業彙成文字，方便貼到群組或列印。']
    ]},
    'voucher.html':{name:'團購券',scenes:[
      ['新增團購券','輸入名稱、面額、有效期與使用條件。'],
      ['追蹤使用','標記已使用／剩餘金額，避免過期浪費。'],
      ['設定說明','右上角設定 →「使用說明」有完整圖文步驟。'],
      ['到期提醒','可設 7 日／3 日／當日提醒，頁內亦有即將過期列表。'],
      ['銷券自動記帳','設定勾選「銷券時自動記入記帳」後，核銷會寫一筆支出（用券面金額）；Undo 會一併移除。'],
    ]},
    'remember_extra_placeholder':null
  };

  var info=DATA[file];
  if(!info||!info.scenes||!info.scenes.length) return; /* 沒有說明（含 wealth）則不顯示 */

  /* ---- 樣式（independent，使用 theme 變數 + fallback）---- */
  var css=''
    +'.jhelp-fab{position:fixed;z-index:60;'
    +'width:42px;height:42px;border-radius:50%;border:1px solid var(--line,#f0e2d8);'
    +'background:var(--panel,#fff);color:var(--accent,#c23b6a);font-size:20px;font-weight:800;'
    +'box-shadow:0 3px 12px rgba(120,60,80,.18);cursor:pointer;display:flex;align-items:center;justify-content:center;'
    +'user-select:none;-webkit-user-select:none;touch-action:none}'
    +'.jhelp-fab.drag{opacity:.85;box-shadow:0 6px 20px rgba(120,60,80,.35);cursor:grabbing}'
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

  /* ---- 自動閃避定位：避開畫面上其它固定在底部/角落的可點擊元素 ---- */
  var POS_KEY='jless_help_fab_pos_v1';
  var SIZE=42, EDGE=12, PAD=8;

  function area(r){return r&&r.width>0&&r.height>0?r.width*r.height:0;}
  function overlaps(a,b,pad){
    pad=pad||0;
    return !(a.right+pad<=b.left||b.right+pad<=a.left||a.bottom+pad<=b.top||b.bottom+pad<=a.top);
  }
  /* 收集其它「浮動／底部」元素的矩形：fixed/sticky 定位、或可見的底部列／圓鈕 */
  function obstacles(){
    var list=[], vh=window.innerHeight||document.documentElement.clientHeight;
    var vw=window.innerWidth||document.documentElement.clientWidth;
    var cand=document.querySelectorAll('button,a,[onclick],[role="button"],.bottombar,.bb,.fab,.addbtn,.nav,[class*="float"],[id*="add"],[id*="fab"]');
    for(var i=0;i<cand.length;i++){
      var el=cand[i];
      if(el===fab||mask.contains(el))continue;
      var cs;
      try{cs=getComputedStyle(el);}catch(e){continue;}
      if(!cs||cs.display==='none'||cs.visibility==='hidden')continue;
      var r=el.getBoundingClientRect();
      if(area(r)<=0)continue;
      /* 只排除「覆蓋幾乎整個畫面」的元素（如全屏遮罩）；全寬但很矮的底部列仍須閃避 */
      if(r.width>vw*0.98&&r.height>vh*0.55)continue;
      /* 只關心下半部或左右邊緣的元素（真正會擋到浮動鈕的） */
      if(r.top>vh*0.45||r.left<EDGE+60||r.right>vw-EDGE-60)list.push(r);
    }
    return list;
  }
  /* 候選位置：由右下角往上、再到左下角；回傳第一個不重疊者 */
  function autoPlace(){
    var vh=window.innerHeight||document.documentElement.clientHeight;
    var vw=window.innerWidth||document.documentElement.clientWidth;
    var obs=obstacles();
    var bottomBase=vh-SIZE-EDGE;
    var slots=[];
    /* 右側：底部起，每次上移 (SIZE+PAD) */
    for(var y=bottomBase;y>=vh*0.30;y-=(SIZE+PAD))slots.push({x:vw-SIZE-EDGE,y:y});
    /* 左側：底部起 */
    for(var y2=bottomBase;y2>=vh*0.30;y2-=(SIZE+PAD))slots.push({x:EDGE,y:y2});
    for(var s=0;s<slots.length;s++){
      var r={left:slots[s].x,top:slots[s].y,right:slots[s].x+SIZE,bottom:slots[s].y+SIZE,width:SIZE,height:SIZE};
      var hit=false;
      for(var o=0;o<obs.length;o++){if(overlaps(r,obs[o],PAD)){hit=true;break;}}
      if(!hit)return slots[s];
    }
    return {x:vw-SIZE-EDGE,y:vh*0.30}; /* 全衝突時的後備 */
  }
  function setPos(x,y){
    fab.style.left=x+'px';fab.style.top=y+'px';fab.style.right='auto';fab.style.bottom='auto';
  }
  function rememberPos(x,y){
    try{localStorage.setItem(POS_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y),w:window.innerWidth,h:window.innerHeight}));}catch(e){}
  }
  function applyPos(){
    var saved=null;
    try{saved=JSON.parse(localStorage.getItem(POS_KEY));}catch(e){}
    var vh=window.innerHeight||document.documentElement.clientHeight;
    var vw=window.innerWidth||document.documentElement.clientWidth;
    if(saved&&isFinite(saved.x)&&isFinite(saved.y)&&saved.w&&Math.abs(saved.w-vw)<160){
      /* 用過的位置：橫向依目前寬度靠邊吸附、縱向不超出畫面 */
      var x=saved.x>vw/2?(vw-SIZE-EDGE):EDGE;
      var y=Math.max(8,Math.min(saved.y,vh-SIZE-8));
      setPos(x,y);
    }else{
      var p=autoPlace();setPos(p.x,p.y);
    }
  }
  applyPos();
  /* 版面就緒後再校正一次（部分按鈕由頁面 JS 延遲產生） */
  setTimeout(applyPos,300);
  window.addEventListener('resize',function(){clearTimeout(fab._rt);fab._rt=setTimeout(applyPos,200);});
  window.addEventListener('orientationchange',function(){setTimeout(applyPos,400);});

  /* ---- 任何彈層打開時自動隱藏，避免蓋住輸入面板／詳情內容 ---- */
  function overlayOpen(){
    var vw=window.innerWidth||390, vh=window.innerHeight||800, min=vw*vh*0.45;
    var cand=document.querySelectorAll('[id*="Mask"],[class*="mask"],[class*="sheet"],[class*="modal"],[class*="drawer"]');
    for(var i=0;i<cand.length;i++){
      var el=cand[i];
      if(el===fab||mask.contains(el))continue;
      var cs;try{cs=getComputedStyle(el);}catch(e){continue;}
      if(!cs||cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')continue;
      var r=el.getBoundingClientRect();
      var visW=Math.min(r.right,vw)-Math.max(r.left,0), visH=Math.min(r.bottom,vh)-Math.max(r.top,0);
      if(visW>0&&visH>0&&visW*visH>=min)return true;
    }
    return false;
  }
  var ovLast=null;
  function ovSync(){
    var o=overlayOpen();
    if(o===ovLast)return;
    ovLast=o;
    fab.style.opacity=o?'0':'1';
    fab.style.transform=o?'scale(.86)':'none';
    fab.style.pointerEvents=o?'none':'auto';
  }
  var ovTk=null;
  function ovQueue(){if(ovTk)return;ovTk=setTimeout(function(){ovTk=null;ovSync();},120);}
  try{new MutationObserver(ovQueue).observe(document.body,{attributes:true,subtree:true,attributeFilter:['class','style']});}catch(e){}
  window.setInterval(ovSync,1200);
  ovSync();

  /* ---- 可按住拖曳微調位置 ---- */
  var dragging=false, moved=false, sx=0, sy=0, ox=0, oy=0, longTimer=null;
  fab.addEventListener('pointerdown',function(e){
    if(e.button&&e.button!==0)return;
    dragging=true;moved=false;
    sx=e.clientX;sy=e.clientY;
    var r=fab.getBoundingClientRect();ox=r.left;oy=r.top;
    try{fab.setPointerCapture(e.pointerId);}catch(err){}
    longTimer=setTimeout(function(){if(dragging&&!moved){moved=true;fab.classList.add('drag');}},350);
  });
  fab.addEventListener('pointermove',function(e){
    if(!dragging)return;
    var dx=e.clientX-sx, dy=e.clientY-sy;
    if(!moved&&Math.abs(dx)+Math.abs(dy)>7){moved=true;fab.classList.add('drag');clearTimeout(longTimer);}
    if(!moved)return;
    var vw=window.innerWidth||document.documentElement.clientWidth;
    var vh=window.innerHeight||document.documentElement.clientHeight;
    var x=Math.max(0,Math.min(ox+dx,vw-SIZE));
    var y=Math.max(0,Math.min(oy+dy,vh-SIZE));
    setPos(x,y);
  });
  function endDrag(e){
    if(!dragging)return;
    clearTimeout(longTimer);dragging=false;
    fab.classList.remove('drag');
    if(moved){var r=fab.getBoundingClientRect();rememberPos(r.left,r.top);}
    setTimeout(function(){moved=false;},50); /* 讓 click 事件有機會被抑制 */
    try{fab.releasePointerCapture(e.pointerId);}catch(err){}
  }
  fab.addEventListener('pointerup',endDrag);
  fab.addEventListener('pointercancel',endDrag);

  fab.addEventListener('click',function(e){
    if(moved){e.preventDefault();e.stopPropagation();moved=false;return;}
    open();
  });
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

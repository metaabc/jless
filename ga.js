/* ga.js — Google Analytics 統計（僅首頁與各應用「進入頁」載入）
 * 原則：
 *  1) 不傳送任何個人或敏感資料：不傳送 app 內容（券名、筆記、名單、卡片文字等）。
 *     正式 HTTPS 部署（metaabc.github.io）傳送真實頁面網址，讓 GA 與 Search Console 對得上；
 *     本機 file:// 或用其它來源開啟時，只傳送「中性虛擬網址」＋「檔名」＋「頁面標題」，
 *     避免暴露本機檔案路徑（含使用者名稱）。
 *  2) 如無法連線 GA（離線／防火牆／無網路），完全靜默，不影響使用、不顯示任何錯誤。
 *  3) 尊重瀏覽器「不追蹤」(Do Not Track)。
 */
(function () {
  try {
    // 瀏覽器要求「不追蹤」時不載入（隱私）
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    if (dnt === '1' || dnt === 'yes') return;

    var GA_ID = 'G-G7H3M2VW8T';
    if (!GA_ID) return; // 未設定 ID 時不載入，靜默

    window.dataLayer = window.dataLayer || [];
    function gtag() { try { window.dataLayer.push(arguments); } catch (e) {} }
    window.gtag = gtag;

    // 動態載入 gtag.js；載入失敗靜默（onerror 不拋錯、不告警）
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    s.onerror = function () {}; // 無網路／被封鎖時靜默，不影響離線功能
    (document.head || document.documentElement).appendChild(s);

    // 網址處理：部署在正式 HTTPS 網站時用真實路徑（讓 GA 與 Search Console 數據對得上）；
    // 本機 file:// 或其它來源一律用中性網址，避免把本機檔案路徑（含使用者名稱）傳出去。
    var file = location.pathname ? location.pathname.split('/').pop() : '';
    if (!file || file === '' || file === '/') file = 'index.html';
    var isDeployed = location.protocol === 'https:' && location.hostname === 'metaabc.github.io';
    var pageLocation = isDeployed ? location.href : 'https://jless.local/' + file;
    var pagePath = isDeployed
      ? (location.pathname || '/')
      : '/' + file;

    gtag('js', new Date());
    gtag('config', GA_ID, {
      send_page_view: false,                       // 關閉自動 page_view（手動控制以確保網址乾淨）
      anonymize_ip: true,                          // IP 匿名化
      allow_google_signals: false,                 // 不收集額外信號
      allow_ad_personalization_signals: false,     // 不收集個人化廣告信號
      page_location: pageLocation,                 // 部署用真實網址；本機用中性網址
      page_title: document.title || file
    });

    // 手動發送一次 page_view：打包 SDK 可控的乾淨網址，不含任何 app 內容或個人資料
    gtag('event', 'page_view', {
      page_title: document.title || file,
      page_path: pagePath,
      page_location: pageLocation
    });
  } catch (e) {
    /* 任何異常皆靜默，不影響使用 */
  }
})();

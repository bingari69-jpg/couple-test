/* 같이놀자 — Supabase 공개 데이터 연결
   브라우저에서 사용하는 publishable key만 둔다.
   쓰기 권한은 데이터베이스 RLS에서 차단하고, 화면은 연결 실패 시 로컬 목록을 유지한다. */
(function () {
  "use strict";

  const PROJECT_URL = "https://iqwggvijxptehvmdbmub.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z";
  const API_URL = PROJECT_URL + "/rest/v1";

  async function read(table, query) {
    const response = await fetch(API_URL + "/" + table + "?" + query, {
      headers: {
        apikey: PUBLISHABLE_KEY,
        Accept: "application/json"
      }
    });
    if (!response.ok) throw new Error("Supabase read failed: " + response.status);
    return response.json();
  }

  async function getGameCatalog() {
    return read(
      "game_catalog",
      "select=slug,path,title,content_type,category,relationships,sort_order,summary" +
      "&is_enabled=eq.true&order=sort_order.asc"
    );
  }

  async function getSiteSettings() {
    const rows = await read(
      "site_settings",
      "select=id,site_name,font_family,menu,ads_enabled&id=eq.main&limit=1"
    );
    return rows[0] || null;
  }

  async function getPublishedAppConfig() {
    const response = await fetch(API_URL + "/rpc/get_published_app_config", {
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, Accept: "application/json", "Content-Type": "application/json" },
      body: "{}"
    });
    if (!response.ok) throw new Error("Supabase config read failed: " + response.status);
    return response.json();
  }

  window.SupabaseData = {
    getGameCatalog,
    getSiteSettings,
    getPublishedAppConfig
  };
})();

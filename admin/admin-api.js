(function () {
  'use strict';
  const PROJECT_URL = 'https://iqwggvijxptehvmdbmub.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_D6Iqs7Xovd1ihHV5BYeQrg_xyvHG04Z';
  const SESSION_KEY = 'gatchi_admin_session_v2';
  const LEGACY_SESSION_KEY = 'gatchi_admin_session_v1';

  // 관리자 세션은 탭이 살아 있는 동안만 sessionStorage에 둔다.
  // 예전 버전은 localStorage에 refresh_token까지 영구 보관했는데, 같은 도메인의
  // 공개 게임 페이지에서 XSS가 나면 관리자 세션이 통째로 새어 나갈 수 있어 폐기한다.
  try { localStorage.removeItem(LEGACY_SESSION_KEY); } catch (_) {}

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }
  function saveSession(session) {
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }
  function messageFrom(error) {
    const raw = String(error && (error.message || error.error_description || error.error) || error || '알 수 없는 오류');
    if (/Invalid login credentials/i.test(raw)) return '이메일이나 비밀번호를 확인해 주세요.';
    if (/Email not confirmed/i.test(raw)) return '이메일 확인을 먼저 완료해 주세요.';
    if (/ADMIN_REQUIRED/i.test(raw)) return '이 계정에는 관리자 권한이 없습니다.';
    if (/Failed to fetch|NetworkError/i.test(raw)) return '서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.';
    return raw;
  }
  async function request(path, options) {
    const opts = options || {};
    const headers = Object.assign({ apikey: PUBLISHABLE_KEY }, opts.headers || {});
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.json);
    }
    let session = readSession();
    if (opts.auth) {
      session = await ensureSession(session);
      if (!session) throw new Error('로그인이 필요합니다.');
      headers.Authorization = 'Bearer ' + session.access_token;
    }
    const response = await fetch(PROJECT_URL + path, Object.assign({}, opts, { headers }));
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) throw new Error(messageFrom(data || response.status));
    return data;
  }
  async function ensureSession(session) {
    if (!session || !session.access_token) return null;
    const expiresAt = Number(session.expires_at || 0);
    if (expiresAt && expiresAt > Math.floor(Date.now() / 1000) + 90) return session;
    if (!session.refresh_token) return null;
    try {
      const next = await request('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', json: { refresh_token: session.refresh_token }
      });
      saveSession(next);
      return next;
    } catch (_) {
      saveSession(null);
      return null;
    }
  }
  async function signIn(email, password) {
    const session = await request('/auth/v1/token?grant_type=password', {
      method: 'POST', json: { email: String(email).trim(), password: String(password) }
    });
    saveSession(session);
    return session;
  }
  async function signOut() {
    const session = readSession();
    if (session && session.access_token) {
      try { await request('/auth/v1/logout', { method: 'POST', auth: true }); } catch (_) {}
    }
    saveSession(null);
  }
  async function rpc(name, args, auth) {
    return request('/rest/v1/rpc/' + name, { method: 'POST', json: args || {}, auth: auth !== false });
  }
  async function uploadImage(file, folder) {
    if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다.');
    if (file.size > 2 * 1024 * 1024) throw new Error('이미지는 2MB 이하만 올릴 수 있습니다.');
    const session = await ensureSession(readSession());
    if (!session) throw new Error('로그인이 필요합니다.');
    const ext = ({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];
    const safeFolder = String(folder || 'misc').replace(/[^a-z0-9_-]/gi, '-');
    const path = safeFolder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const response = await fetch(PROJECT_URL + '/storage/v1/object/admin-assets/' + path, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(messageFrom(data));
    return PROJECT_URL + '/storage/v1/object/public/admin-assets/' + path;
  }

  window.AdminAPI = {
    hasSession: () => !!readSession(),
    signIn,
    signOut,
    getState: () => rpc('admin_get_app_state'),
    saveDraft: (config, note) => rpc('admin_save_app_draft', { p_config: config, p_note: note || null }),
    publish: (config, note) => rpc('admin_publish_app_config', { p_config: config, p_note: note || null }),
    restore: (version) => rpc('admin_restore_app_version', { p_version: Number(version), p_note: version + '번 버전 복원' }),
    getStats: days => rpc('admin_get_app_stats', { p_days: Number(days) || 7 }),
    uploadImage,
    messageFrom,
    projectUrl: PROJECT_URL
  };
})();

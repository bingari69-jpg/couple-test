// Setup type definitions for the built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";
import webpush from "npm:web-push@3.6.7";

const titles: Record<string, string> = {
  ten: "10초 맞추기", react: "반응속도 대결", num25: "1에서 25까지", mole: "두더지 잡기",
  ufo: "UFO 요격", tap: "10초 연타", stroop: "색깔 함정", arrow: "화살표 함정",
  stop: "딱 멈춰", rps: "가위바위보", nonsense: "넌센스 퀴즈", delivery: "배달 텔레파시",
  mbti: "MBTI 맞히기", crash: "20분 후 추락합니다", seat: "어디에 앉나요",
  marriage: "결혼 전에 맞춰볼 것들", "mind/fight": "싸우면 어떻게 끝날까",
  memory: "우리의 기억", ranking: "내 취향 맞혀봐", personality: "나와 너의 마음동물",
  tarot: "나와 너의 타로",
};

// 브라우저가 functions.invoke로 부르면 Authorization·Content-Type 헤더 때문에 먼저 OPTIONS(preflight)가 온다.
// withSupabase는 auth:"user"라 토큰 없는 OPTIONS를 거절할 수 있으므로 그 앞에서 직접 응답한다.
const ALLOWED_ORIGINS = new Set([
  "https://noljago.co.kr",
  "https://www.noljago.co.kr",
  "https://bingari69-jpg.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "https://noljago.co.kr";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

const authed = withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, req);

    try {
      const publicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
      const privateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
      const subject = Deno.env.get("VAPID_SUBJECT") || "https://noljago.co.kr/";
      if (!publicKey || !privateKey || !ctx.userClaims?.id) {
        return json({ error: "SERVER_NOT_CONFIGURED" }, 500, req);
      }

      const body = await req.json().catch(() => ({}));
      const code = String(body.code || "").trim().toUpperCase();
      if (!/^[A-Z0-9]{12,24}$/.test(code)) return json({ error: "INVALID_CODE" }, 400, req);

      const admin = ctx.supabaseAdmin;
      const challengeResult = await admin.from("game_challenges")
        .select("id,code,sender_user_id,completed_by_user_id,game_slug,status,result_url,result_summary,notification_sent_at")
        .eq("code", code).maybeSingle();
      if (challengeResult.error) throw challengeResult.error;
      const challenge = challengeResult.data;
      if (!challenge || challenge.status !== "completed") return json({ error: "RESULT_NOT_READY" }, 409, req);
      if (challenge.completed_by_user_id !== ctx.userClaims.id) return json({ error: "FORBIDDEN" }, 403, req);
      if (challenge.notification_sent_at) return json({ ok: true, alreadySent: true }, 200, req);

      const subscriptionsResult = await admin.from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .eq("user_id", challenge.sender_user_id);
      if (subscriptionsResult.error) throw subscriptionsResult.error;
      const subscriptions = subscriptionsResult.data || [];
      if (!subscriptions.length) return json({ ok: true, sent: 0 }, 200, req);

      webpush.setVapidDetails(subject, publicKey, privateKey);
      const payload = JSON.stringify({
        title: `${titles[challenge.game_slug] || "게임·테스트"} 완료!`,
        body: challenge.result_summary || "상대가 최종 결과까지 끝냈어요.",
        url: challenge.result_url,
        tag: `gatchi-result-${challenge.code}`,
        icon: "/og-image.png",
        badge: "/og-image.png",
      });

      let sent = 0;
      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, payload, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (error) {
          const status = Number((error as { statusCode?: number }).statusCode || 0);
          if (status === 404 || status === 410) {
            await admin.from("push_subscriptions").delete().eq("id", subscription.id);
          }
        }
      }

      if (sent > 0) {
        await admin.from("game_challenges")
          .update({ notification_sent_at: new Date().toISOString() })
          .eq("id", challenge.id).is("notification_sent_at", null);
      }
      return json({ ok: true, sent }, 200, req);
    } catch (error) {
      // 내부 오류 문구는 서버 로그에만 남기고 클라이언트에는 코드만 돌려준다.
      console.error("notify failed", error);
      return json({ error: "NOTIFICATION_FAILED" }, 500, req);
    }
  });

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    return authed(req);
  },
};

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(req ? corsHeaders(req) : {}) },
  });
}

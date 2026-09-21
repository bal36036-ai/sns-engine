export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "PUT" && path.startsWith("/upload/")) {
      const auth = request.headers.get("Authorization") || "";
      if (auth !== `Bearer ${env.UPLOAD_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      const key = path.slice("/upload/".length);
      if (!key) {
        return new Response("Missing key", { status: 400 });
      }
      const contentType = request.headers.get("Content-Type") || "application/octet-stream";
      const body = await request.arrayBuffer();
      await env.SNS_MATERIAL_KV.put(key, body);
      await env.SNS_MATERIAL_KV.put(`${key}:meta`, JSON.stringify({ contentType }));
      const publicUrl = `${url.origin}/${key}`;
      return new Response(JSON.stringify({ ok: true, url: publicUrl }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET/HEADどちらも同じ配信ロジックを通す。HEADはBuffer等の外部サービスが
    // 事前にContent-Type/Content-Lengthを確認するために使うため、GETと矛盾する
    // 応答(誤ったフォールバック)を返さないようにする。
    if ((request.method === "GET" || request.method === "HEAD") && path.length > 1 && !path.includes(":meta")) {
      const key = path.slice(1);
      const value = await env.SNS_MATERIAL_KV.get(key, "arrayBuffer");
      if (value === null) {
        return new Response(request.method === "HEAD" ? null : "Not found", { status: 404 });
      }
      const metaRaw = await env.SNS_MATERIAL_KV.get(`${key}:meta`);
      const meta = metaRaw ? JSON.parse(metaRaw) : { contentType: "application/octet-stream" };
      const headers = {
        "Content-Type": meta.contentType,
        "Content-Length": String(value.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      };
      // HEADは本文を返さない(仕様どおり)。ヘッダーはGETと完全に一致させる。
      return new Response(request.method === "HEAD" ? null : value, { status: 200, headers });
    }

    return new Response("sns-material-worker", { status: 200 });
  },
};

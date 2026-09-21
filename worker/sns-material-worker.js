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

    if (request.method === "GET" && path.length > 1 && !path.includes(":meta")) {
      const key = path.slice(1);
      const value = await env.SNS_MATERIAL_KV.get(key, "arrayBuffer");
      if (value === null) {
        return new Response("Not found", { status: 404 });
      }
      const metaRaw = await env.SNS_MATERIAL_KV.get(`${key}:meta`);
      const meta = metaRaw ? JSON.parse(metaRaw) : { contentType: "application/octet-stream" };
      return new Response(value, {
        status: 200,
        headers: {
          "Content-Type": meta.contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new Response("sns-material-worker", { status: 200 });
  },
};

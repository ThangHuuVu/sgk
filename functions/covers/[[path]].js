const CACHE_SECONDS = 31536000;

const contentTypes = new Map([
  ["webp", "image/webp"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
]);

function contentTypeFor(path, object) {
  const storedType = object.httpMetadata?.contentType;
  if (storedType) {
    return storedType;
  }

  const extension = path.split(".").pop()?.toLowerCase();
  return contentTypes.get(extension) ?? "application/octet-stream";
}

function cachedResponse(object, path, request) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", contentTypeFor(path, object));
  headers.set("Content-Length", String(object.size));
  headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}, immutable`);
  headers.set("CDN-Cache-Control", `public, max-age=${CACHE_SECONDS}, immutable`);
  headers.set("Cloudflare-CDN-Cache-Control", `public, max-age=${CACHE_SECONDS}, immutable`);
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(object.body, { headers });
}

export async function onRequest(context) {
  const { env, params, request, waitUntil } = context;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const path = Array.isArray(params.path) ? params.path.join("/") : params.path;
  if (!path || path.includes("..")) {
    return new Response("Not Found", { status: 404 });
  }

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return request.method === "HEAD" ? new Response(null, cached) : cached;
  }

  const object = await env.SGK_COVERS.get(path);
  if (!object) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    });
  }

  const response = cachedResponse(object, path, request);
  if (request.method === "GET") {
    waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ params, context }: LoaderFunctionArgs) {
  const key = params["*"];
  if (!key) throw new Response("Not Found", { status: 404 });

  const bucket = context.cloudflare.env.IMAGES;
  if (!bucket) throw new Response("Not Found", { status: 404 });

  const object = await bucket.get(key);
  if (!object) throw new Response("Not Found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}

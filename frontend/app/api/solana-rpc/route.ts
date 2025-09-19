export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HELIUS_HTTP = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const HEADERS = { "content-type": "application/json" } as const;

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function POST(req: Request) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      return Response.json(
        { error: "Missing HELIUS_API_KEY" },
        { status: 500 },
      );
    }

    const body = await req.text();

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort("timeout"), 20_000);

    const res = await fetch(HELIUS_HTTP, {
      method: "POST",
      headers: HEADERS,
      body,
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(tid));

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...HEADERS, ...cors() },
    });
  } catch (err) {
    console.error("Helius HTTP proxy error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Helius fetch failed", detail: msg },
      { status: 500 },
    );
  }
}

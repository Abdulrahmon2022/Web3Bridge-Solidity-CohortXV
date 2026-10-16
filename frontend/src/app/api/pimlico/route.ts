import { NextResponse } from "next/server";

const allowedMethods = new Set([
  "eth_chainId",
  "eth_estimateUserOperationGas",
  "eth_getUserOperationReceipt",
  "eth_sendUserOperation",
  "eth_supportedEntryPoints",
  "pimlico_getUserOperationGasPrice",
  "pm_getPaymasterData",
  "pm_getPaymasterStubData",
]);

export async function POST(req: Request) {
  const apiKey = process.env.PIMLICO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Pimlico is not configured for this deployment." }, { status: 503 });
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const body = await req.text();
  if (body.length > 64_000) {
    return NextResponse.json({ error: "Pimlico request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON-RPC request." }, { status: 400 });
  }

  const requests = Array.isArray(payload) ? payload : [payload];
  if (!requests.length || requests.some(
    (request) => !request || typeof request !== "object" ||
      !("method" in request) || typeof request.method !== "string" ||
      !allowedMethods.has(request.method),
  )) {
    return NextResponse.json({ error: "Unsupported Pimlico JSON-RPC method." }, { status: 400 });
  }

  const upstreamUrl = new URL("https://api.pimlico.io/v2/sepolia/rpc");
  upstreamUrl.searchParams.set("apikey", apiKey);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Pimlico." }, { status: 502 });
  }
}
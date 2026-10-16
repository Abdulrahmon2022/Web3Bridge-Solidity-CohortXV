import { NextResponse } from "next/server";

// This file runs on OUR SERVER, never in the browser. So the secret PINATA_JWT stays secret.
// Pinata Files API v3: https://docs.pinata.cloud
export async function POST(req: Request) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json({ error: "Uploads are not configured: PINATA_JWT is missing." }, { status: 500 });
  }

  // 1. Take the file the browser sent us
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 2. Send it to Pinata, with our secret key, on the PUBLIC IPFS network
  const body = new FormData();
  body.append("network", "public");
  body.append("file", file, file.name);

  const res = await fetch("https://uploads.pinata.cloud/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body,
  });

  const responseText = await res.text();
  let json: { data?: { cid?: string } } | undefined;
  try {
    json = JSON.parse(responseText);
  } catch {
    // Preserve non-JSON provider errors below.
  }

  if (!res.ok) {
    let details: unknown = responseText;
    try {
      details = JSON.parse(responseText);
    } catch {
      // The provider returned plain text.
    }
    return NextResponse.json({ error: "Pinata upload failed", details }, { status: res.status });
  }

  const cid = json?.data?.cid;
  if (!cid) {
    return NextResponse.json({ error: "Pinata response did not include a CID." }, { status: 502 });
  }

  // 3. Give the browser only what it needs: the CID
  return NextResponse.json({ cid });
}

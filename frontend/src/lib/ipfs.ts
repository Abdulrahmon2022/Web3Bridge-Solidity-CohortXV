// Sends one file to OUR server route (/api/upload), which sends it to Pinata with the secret key.
// Returns the CID: the fingerprint of the file on IPFS.
export async function uploadToIpfs(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const responseText = await res.text();
  let json: { cid?: string; error?: string; details?: unknown };
  try {
    json = JSON.parse(responseText);
  } catch {
    throw new Error(responseText || `Upload failed with status ${res.status}`);
  }

  if (!res.ok) {
    const details = typeof json.details === "string" ? json.details : JSON.stringify(json.details);
    throw new Error([json.error, details].filter(Boolean).join(": ") || `Upload failed with status ${res.status}`);
  }
  if (!json.cid) throw new Error("Upload succeeded but the server did not return a file CID.");
  return json.cid;
}

// Uploads the image, then the metadata JSON that points to it. Returns "ipfs://<metadata CID>".
export async function uploadNft(image: File, name: string, description: string, ethValue: string): Promise<string> {
  const imageCid = await uploadToIpfs(image);
  return uploadNftMetadata(`ipfs://${imageCid}`, name, description, ethValue);
}

export async function uploadNftFromCid(imageCid: string, name: string, description: string, ethValue: string): Promise<string> {
  const cid = imageCid.trim().replace(/^ipfs:\/\//, "");
  if (!/^[a-zA-Z0-9]+$/.test(cid)) throw new Error("Enter a valid IPFS CID");
  return uploadNftMetadata(`ipfs://${cid}`, name, description, ethValue);
}

async function uploadNftMetadata(image: string, name: string, description: string, ethValue: string): Promise<string> {
  const metadata = { name, description, image, ethValue };
  const metadataFile = new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" });
  const metadataCid = await uploadToIpfs(metadataFile);
  return `ipfs://${metadataCid}`;
}

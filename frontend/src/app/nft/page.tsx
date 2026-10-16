"use client";

import { useEffect, useState } from "react";
import { formatUnits, parseEther, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWalletClient, useWriteContract } from "wagmi";
import { sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { ETH_USD_FEED_ADDRESS, ethUsdFeedAbi } from "@/contracts/chainlink";
import { uploadNft } from "@/lib/ipfs";
import { mintTwiceWithSmartAccount } from "@/lib/smartMint";
import { ethValueToUsdCents, formatUsdCents } from "@/lib/pricing";
import { NftGallery } from "@/components/NftGallery";

type Metadata = { name: string; description: string; image: string; ethValue?: string };

export default function NftPage() {
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain(); // ask the wallet to move to Sepolia
  const { refetch: refetchWalletClient } = useWalletClient({ chainId: sepolia.id });
  const { writeContractAsync } = useWriteContract(); // send a transaction (wallet popup)
  const publicClient = usePublicClient({ chainId: sepolia.id }); // read Sepolia
  const { data: feedDecimals } = useReadContract({
    address: ETH_USD_FEED_ADDRESS,
    abi: ethUsdFeedAbi,
    functionName: "decimals",
    chainId: sepolia.id,
  });
  const {
    data: latestRound,
    isLoading: isPriceLoading,
    isError: isPriceError,
  } = useReadContract({
    address: ETH_USD_FEED_ADDRESS,
    abi: ethUsdFeedAbi,
    functionName: "latestRoundData",
    chainId: sepolia.id,
    query: { refetchInterval: 60_000, retry: false },
  });
  const feedPrice = latestRound?.[1];
  const feedUpdatedAt = latestRound?.[3];
  const isPriceFresh = Boolean(
    feedPrice && feedPrice > 0n && feedUpdatedAt && feedUpdatedAt > 0n &&
    Date.now() / 1000 - Number(feedUpdatedAt) <= 3600,
  );

  // ---------- the form ----------
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ethValue, setEthValue] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [localImagePreview, setLocalImagePreview] = useState<string>();
  const [status, setStatus] = useState("");
  const [minted, setMinted] = useState<{ tokenId: string; uri: string; hash: string } | null>(null);
  const [smartMintResult, setSmartMintResult] = useState<Awaited<ReturnType<typeof mintTwiceWithSmartAccount>> | null>(null);
  const [isSmartMinting, setIsSmartMinting] = useState(false);
  const parsedEthValue = (() => {
    try {
      return parseEther(ethValue);
    } catch {
      return 0n;
    }
  })();
  useEffect(() => {
    if (!image) {
      setLocalImagePreview(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(image);
    setLocalImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image]);
  const previewSource = image ? localImagePreview : undefined;

  async function mint() {
    if (!image || parsedEthValue <= 0n) return;
    try {
      setStatus("1/3 Uploading the image and metadata to IPFS…");
      const uri = await uploadNft(image, name, description, ethValue);

      setStatus("2/3 Confirm the mint in your wallet…");
      await switchChainAsync({ chainId: sepolia.id });
      const hash = await writeContractAsync({
        address: NFT_ADDRESS,
        abi: nftAbi,
        functionName: "mint",
        args: [uri],
        chainId: sepolia.id,
      });

      setStatus("3/3 Waiting for the transaction to be in a block…");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      // The contract emitted Minted(to, tokenId, uri). Read the token id from that event.
      const [event] = parseEventLogs({ abi: nftAbi, logs: receipt.logs, eventName: "Minted" });
      setMinted({ tokenId: event.args.tokenId.toString(), uri, hash });
      setViewId(event.args.tokenId.toString());
      setStatus("Done ✅");
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  }

  async function smartMintTwice() {
    if (!image || parsedEthValue <= 0n || isSmartMinting || !publicClient) return;
    setIsSmartMinting(true);
    setSmartMintResult(null);
    try {
      setStatus("1/3 Uploading image and metadata to IPFS…");
      const uri = await uploadNft(image, name, description, ethValue);

      setStatus("2/3 Switch to Sepolia and approve the smart-account signature…");
      await switchChainAsync({ chainId: sepolia.id });
      const { data: owner } = await refetchWalletClient();
      if (!owner) throw new Error("Connect a wallet before using the smart account.");

      setStatus("3/3 Sending two mints in one UserOperation…");
      const result = await mintTwiceWithSmartAccount(publicClient, owner, uri);
      setSmartMintResult(result);
      setStatus("Done: both mints were confirmed in one UserOperation.");
    } catch (e) {
      setStatus(`Smart mint error: ${(e as Error).message}`);
    } finally {
      setIsSmartMinting(false);
    }
  }

  // ---------- view any token ----------
  const [viewId, setViewId] = useState("0");
  const [meta, setMeta] = useState<Metadata | null>(null);

  const { data: tokenUri } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "tokenURI",
    args: [BigInt(viewId || "0")],
    chainId: sepolia.id,
    query: { retry: false },
  });
  const { data: owner } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "ownerOf",
    args: [BigInt(viewId || "0")],
    chainId: sepolia.id,
    query: { retry: false },
  });

  async function loadMetadata() {
    if (!tokenUri) return;
    const res = await fetch(ipfsToHttp(tokenUri)); // follow the link, like a wallet does
    setMeta(await res.json());
  }

  return (
    <div className="studio-page">
      <div className="studio-heading">
        <div>
          <p className="eyebrow">Onchain objects / Sepolia</p>
          <h1 className="page-title">Make something<br />that stays.</h1>
          <p className="page-intro">A small studio for turning images into collectibles. Your artwork lives on IPFS; its reference value updates with Chainlink.</p>
        </div>
        <div className="price-ticker" aria-live="polite">
          <span>Chainlink · ETH / USD</span>
          <strong>{isPriceLoading ? "Loading…" : isPriceError || !feedPrice || feedDecimals === undefined
            ? "Price unavailable"
            : `$${Number(formatUnits(feedPrice, feedDecimals)).toLocaleString("en-US", { maximumFractionDigits: 2 })}`}</strong>
          {feedPrice && !isPriceFresh && <em>Feed data may be stale</em>}
        </div>
      </div>

      <section className="workbench" aria-labelledby="mint-title">
        <div className="mint-form">
          <p className="section-kicker">01 / Create</p>
          <h2 id="mint-title" className="section-title">Prepare your edition</h2>
          <div className="field-stack">
            <label className="field-label">Title
              <input className="field-input" placeholder="Give this piece a name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field-label">Description
              <input className="field-input" placeholder="A note about the work" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="field-label">Reference amount
              <small>Displayed as an estimate only. This is not a mint fee.</small>
          <input
            className="field-input"
            type="number"
            min="0"
            step="any"
            placeholder="0.01 ETH"
            value={ethValue}
            onChange={(e) => setEthValue(e.target.value)}
          />
        </label>
            <label className="field-label">Choose another image
              <input className="file-input" type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        <button
          className="mint-button"
          disabled={!isConnected || !image || !name || parsedEthValue <= 0n}
          onClick={mint}
        >
          <span>Pin metadata & mint</span><span aria-hidden="true">↗</span>
        </button>
        <button
          className="mint-button smart-mint-button"
          disabled={!isConnected || !image || !name || parsedEthValue <= 0n || isSmartMinting}
          onClick={smartMintTwice}
        >
          <span>{isSmartMinting ? "Preparing smart account…" : "Smart account · mint twice"}</span>
          <span aria-hidden="true">×2</span>
        </button>
        {!isConnected && <p className="wallet-hint">Connect a wallet to mint on Sepolia.</p>}
        <p className="status-message" aria-live="polite">{status}</p>
        {smartMintResult && (
          <div className="smart-mint-result">
            <p><b>Smart account:</b> {smartMintResult.accountAddress}</p>
            <p><b>UserOperation:</b> {smartMintResult.userOperationHash}</p>
            <p><b>Gas paid by:</b> {smartMintResult.gasPayer}</p>
            <a href={`https://sepolia.etherscan.io/tx/${smartMintResult.transactionHash}`} target="_blank" rel="noreferrer">
              View bundled transaction on Etherscan ↗
            </a>
          </div>
        )}
        {minted && (
          <div className="minted-result">
            <p><b>Minted token #{minted.tokenId}</b></p>
            <p><b>Metadata:</b> {minted.uri}</p>
            <p>
              <a href={`https://sepolia.etherscan.io/tx/${minted.hash}`} target="_blank" rel="noreferrer">
                View on Etherscan ↗
              </a>
            </p>
          </div>
        )}
        </div>
        <aside className="artwork-panel" aria-label="Artwork preview">
          <div className="artwork-topline"><span>Studio preview</span><span>IPFS / 01</span></div>
          <div className="artwork-image-wrap">
            {previewSource ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="artwork-image" src={previewSource} alt={name ? `Preview of ${name}` : "Preview of supplied IPFS artwork"} />
            ) : (
              <div className="artwork-placeholder"><strong>Your next collectible</strong><span>Choose an image to see a preview.</span></div>
            )}
          </div>
          <div className="artwork-caption">
            <div><strong>{name || "Untitled work"}</strong><span>{description || "An image, made persistent."}</span></div>
            <span>W3B · 2026</span>
          </div>
        </aside>
      </section>

      <NftGallery feedPrice={feedPrice} feedDecimals={feedDecimals} isPriceFresh={isPriceFresh} />

      <section className="gallery-section" aria-labelledby="inspect-title">
        <div className="gallery-heading">
          <div><p className="section-kicker">03 / Inspect</p><h2 id="inspect-title" className="section-title">Find a token</h2></div>
          <p className="gallery-count">BY TOKEN ID</p>
        </div>
        <div className="lookup-form">
          <label className="field-label" htmlFor="token-id">Token ID</label>
          <div className="flex flex-wrap gap-3">
            <input id="token-id" className="field-input" style={{ maxWidth: 180 }} inputMode="numeric" value={viewId} onChange={(e) => setViewId(e.target.value.replace(/[^0-9]/g, ""))} />
            <button className="secondary-button" onClick={loadMetadata}>Load token</button>
          </div>
        </div>
        <p className="gallery-state">Owner: {owner ?? "—"} · {tokenUri ?? "Token metadata URI will appear here"}</p>
        {meta && (
          <div className="lookup-result">
            <p className="ens-primary-name">{meta.name}</p>
            <p>{meta.description}</p>
            {meta.ethValue && feedPrice && feedDecimals !== undefined && isPriceFresh && ethValueToUsdCents(meta.ethValue, feedPrice, feedDecimals) !== null ? (
              <p className="text-sm">Current reference value: {formatUsdCents(ethValueToUsdCents(meta.ethValue, feedPrice, feedDecimals)!)} ({meta.ethValue} ETH)</p>
            ) : (
              <p className="text-sm text-neutral-600">
                {meta.ethValue ? "Current ETH/USD value unavailable" : "No ETH reference value was saved for this NFT."}
              </p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ipfsToHttp(meta.image)} alt={meta.name} className="nft-card-image" style={{ maxWidth: 420 }} />
          </div>
        )}
      </section>
    </div>
  );
}

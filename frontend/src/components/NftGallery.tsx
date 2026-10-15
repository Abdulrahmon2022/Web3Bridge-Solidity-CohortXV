"use client";

import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useEnsName, useReadContract, useReadContracts } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { NFT_ADDRESS, nftAbi, ipfsToHttp } from "@/contracts/nft";
import { ethValueToUsdCents, formatUsdCents } from "@/lib/pricing";

type Metadata = { name?: string; description?: string; image?: string; ethValue?: string };

const PAGE_SIZE = 12;

function NftCard({
  tokenId,
  tokenUri,
  owner,
  feedPrice,
  feedDecimals,
  isPriceFresh,
}: {
  tokenId: bigint;
  tokenUri: string;
  owner: Address;
  feedPrice?: bigint;
  feedDecimals?: number;
  isPriceFresh: boolean;
}) {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metadataError, setMetadataError] = useState(false);
  const { data: ensName } = useEnsName({ address: owner, chainId: mainnet.id });

  useEffect(() => {
    let active = true;
    setMetadata(null);
    setMetadataError(false);

    fetch(ipfsToHttp(tokenUri))
      .then((response) => {
        if (!response.ok) throw new Error("Metadata request failed");
        return response.json();
      })
      .then((result: Metadata) => {
        if (active) setMetadata(result);
      })
      .catch(() => {
        if (active) setMetadataError(true);
      });

    return () => {
      active = false;
    };
  }, [tokenUri]);

  const usdCents = metadata?.ethValue && feedPrice && feedDecimals !== undefined && isPriceFresh
    ? ethValueToUsdCents(metadata.ethValue, feedPrice, feedDecimals)
    : null;

  return (
    <article className="nft-card">
      {metadata?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ipfsToHttp(metadata.image)} alt={metadata.name ?? `NFT ${tokenId}`} className="nft-card-image" />
      ) : (
        <div className="nft-card-placeholder">
          {metadataError ? "Metadata unavailable" : "Loading image…"}
        </div>
      )}
      <div className="nft-card-body">
        <div className="nft-card-title-row">
          <h3 className="nft-card-title">{metadata?.name ?? `Token #${tokenId}`}</h3>
          <span className="token-number">#{tokenId}</span>
        </div>
        <p className="nft-card-description">{metadata?.description ?? (metadataError ? "Metadata could not be loaded from IPFS." : "Loading metadata from IPFS…")}</p>
        <div className="card-rule" />
        <div className="card-meta-row"><span>COLLECTOR</span><strong title={ensName ?? owner}>{ensName ?? `${owner.slice(0, 6)}…${owner.slice(-4)}`}</strong></div>
        <div className="card-value">
          <strong>
            {usdCents !== null
              ? formatUsdCents(usdCents)
              : metadata?.ethValue
                ? "Unavailable"
                : "No estimate"}
          </strong>
          <span>{metadata?.ethValue ? `${metadata.ethValue} ETH` : "REFERENCE VALUE"}</span>
        </div>
      </div>
    </article>
  );
}

export function NftGallery({
  feedPrice,
  feedDecimals,
  isPriceFresh,
}: {
  feedPrice?: bigint;
  feedDecimals?: number;
  isPriceFresh: boolean;
}) {
  const [page, setPage] = useState(0);
  const { data: totalMinted, isLoading: isCountLoading, isError: isCountError } = useReadContract({
    address: NFT_ADDRESS,
    abi: nftAbi,
    functionName: "totalMinted",
    chainId: sepolia.id,
    query: { refetchInterval: 15_000, retry: false },
  });

  const total = totalMinted ?? 0n;
  const pageCount = Math.ceil(Number(total) / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const firstOffset = BigInt(currentPage * PAGE_SIZE);
  const visibleCount = total > firstOffset ? Math.min(PAGE_SIZE, Number(total - firstOffset)) : 0;
  const tokenIds = Array.from({ length: visibleCount }, (_, index) => total - 1n - firstOffset - BigInt(index));

  const { data: tokenData, isLoading: areTokensLoading } = useReadContracts({
    contracts: tokenIds.flatMap((tokenId) => [
      { address: NFT_ADDRESS, abi: nftAbi, functionName: "tokenURI", args: [tokenId], chainId: sepolia.id },
      { address: NFT_ADDRESS, abi: nftAbi, functionName: "ownerOf", args: [tokenId], chainId: sepolia.id },
    ]),
    allowFailure: true,
    query: { enabled: tokenIds.length > 0 },
  });

  return (
    <section className="gallery-section">
      <div className="gallery-heading">
        <div>
          <p className="section-kicker">The collection</p>
          <h2 className="section-title">Recently minted</h2>
        </div>
        <p className="gallery-count">{total.toString()} {total === 1n ? "OBJECT" : "OBJECTS"}</p>
      </div>

      {isCountLoading && <p className="gallery-state">Connecting to the Sepolia collection…</p>}
      {isCountError && <p className="gallery-state">Could not read the collection. Check the Sepolia RPC and NFT address.</p>}
      {!isCountLoading && !isCountError && total === 0n && <p className="gallery-state">The collection is waiting for its first object.</p>}

      {areTokensLoading && <p className="gallery-state">Loading collection records…</p>}
      {tokenIds.length > 0 && (
        <div className="token-grid">
          {tokenIds.map((tokenId, index) => {
            const uriResult = tokenData?.[index * 2];
            const ownerResult = tokenData?.[index * 2 + 1];
            const tokenUri = uriResult?.status === "success" ? String(uriResult.result) : undefined;
            const owner = ownerResult?.status === "success" ? String(ownerResult.result) as Address : undefined;

            if (!tokenUri || !owner) {
              return <p key={tokenId.toString()} className="gallery-state">Token #{tokenId} could not be loaded.</p>;
            }

            return (
              <NftCard
                key={tokenId.toString()}
                tokenId={tokenId}
                tokenUri={tokenUri}
                owner={owner}
                feedPrice={feedPrice}
                feedDecimals={feedDecimals}
                isPriceFresh={isPriceFresh}
              />
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="pager">
          <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
            Newer
          </button>
          <span className="gallery-count">PAGE {currentPage + 1} / {pageCount}</span>
          <button disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
            Older
          </button>
        </div>
      )}
    </section>
  );
}
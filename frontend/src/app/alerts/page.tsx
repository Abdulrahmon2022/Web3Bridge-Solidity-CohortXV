"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPublicClient, http, type Address } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  pollingInterval: 3_000,
});
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC_URL),
});

type MintAlert = {
  key: string;
  tokenId: string;
  recipient: Address;
  ensName?: string | null;
  transactionHash: `0x${string}`;
  receivedAt: Date;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<MintAlert[]>([]);
  const [watchError, setWatchError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const seenLogs = useRef(new Set<string>());

  useEffect(() => {
    setNotificationPermission("Notification" in window ? Notification.permission : "unsupported");

    let active = true;
    const unwatch = sepoliaClient.watchContractEvent({
      address: NFT_ADDRESS,
      abi: nftAbi,
      eventName: "Minted",
      onLogs(logs) {
        for (const log of logs) {
          const { to, tokenId } = log.args;
          if (!to || tokenId === undefined || !log.transactionHash) continue;

          const key = `${log.transactionHash}:${log.logIndex ?? tokenId}`;
          if (seenLogs.current.has(key)) continue;
          seenLogs.current.add(key);

          const alert: MintAlert = {
            key,
            tokenId: tokenId.toString(),
            recipient: to,
            transactionHash: log.transactionHash,
            receivedAt: new Date(),
          };
          setAlerts((current) => [alert, ...current]);

          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`W3B token #${alert.tokenId} minted`, {
              body: `Recipient: ${alert.recipient}`,
              tag: key,
            });
          }

          void mainnetClient.getEnsName({ address: to }).then((ensName) => {
            if (!active) return;
            setAlerts((current) => current.map((item) => item.key === key ? { ...item, ensName } : item));
          }).catch(() => {
            if (!active) return;
            setAlerts((current) => current.map((item) => item.key === key ? { ...item, ensName: null } : item));
          });
        }
      },
      onError(error) {
        if (active) setWatchError(error.message);
      },
    });

    return () => {
      active = false;
      unwatch();
    };
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(await Notification.requestPermission());
  }

  const notificationLabel = {
    default: "Enable browser alerts",
    granted: "Browser alerts enabled",
    denied: "Browser alerts blocked",
    unsupported: "Browser alerts unavailable",
  }[notificationPermission];

  return (
    <div className="alerts-page">
      <div className="alerts-heading">
        <div>
          <p className="eyebrow">Sepolia / ClassNFT</p>
          <h1 className="page-title">Mint alerts.</h1>
          <p className="page-intro">Live events from the deployed contract, resolved to ENS when available.</p>
        </div>
        <div className="alerts-actions">
          <span className={`listener-status${watchError ? " listener-error" : ""}`} aria-live="polite">
            <span aria-hidden="true" />{watchError ? "Connection issue" : "Listening"}
          </span>
          <button
            className="notification-button"
            onClick={enableNotifications}
            disabled={notificationPermission === "granted" || notificationPermission === "unsupported"}
          >
            {notificationLabel}
          </button>
        </div>
      </div>

      {watchError && <p className="alert-error" role="alert">{watchError}</p>}

      <section className="alert-feed" aria-label="Live mint events" aria-live="polite">
        {alerts.length === 0 ? (
          <div className="alert-empty">
            <span className="section-kicker">No events received</span>
            <p>New mints will appear here while this page is open.</p>
            <Link className="text-link" href="/nft">Open the NFT studio ↗</Link>
          </div>
        ) : alerts.map((alert) => (
          <article className="alert-row" key={alert.key}>
            <div className="alert-token"><span>Token</span><strong>#{alert.tokenId}</strong></div>
            <div className="alert-recipient">
              <span>Recipient</span>
              <strong title={alert.recipient}>{alert.ensName === undefined ? "Resolving ENS…" : alert.ensName || `${alert.recipient.slice(0, 6)}…${alert.recipient.slice(-4)}`}</strong>
            </div>
            <time className="alert-time" dateTime={alert.receivedAt.toISOString()}>
              {alert.receivedAt.toLocaleTimeString()}
            </time>
            <a className="alert-transaction" href={`https://sepolia.etherscan.io/tx/${alert.transactionHash}`} target="_blank" rel="noreferrer" aria-label={`View mint of token ${alert.tokenId} on Etherscan`}>
              ↗
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
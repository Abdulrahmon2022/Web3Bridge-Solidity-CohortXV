"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address, isConnected, chain } = useAccount(); // is a wallet connected? which address? which network?
  const { connectors, connect, isPending } = useConnect(); // the list of ways to connect, and the connect action
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button className="wallet-button" onClick={() => disconnect()} title="Disconnect wallet">
        {chain?.name ?? "Unknown network"} · {address?.slice(0, 6)}…{address?.slice(-4)} · Disconnect
      </button>
    );
  }

  return (
    <button
      className="wallet-button"
      disabled={isPending}
      onClick={() => connect({ connector: connectors[0] })}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

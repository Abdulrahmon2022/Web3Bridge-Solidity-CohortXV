"use client";

import { useState } from "react";
import { useAccount, useEnsAddress, useEnsAvatar, useEnsName, useEnsText } from "wagmi";
import { mainnet } from "wagmi/chains";
import { normalize } from "viem/ens";

// normalize() turns "Vitalik.ETH" into "vitalik.eth", and THROWS on an invalid name.
function safeNormalize(input: string) {
  try {
    return input ? normalize(input) : undefined;
  } catch {
    return undefined;
  }
}

export default function EnsPage() {
  const [input, setInput] = useState("vitalik.eth");
  const name = safeNormalize(input);
  const { address } = useAccount();

  // Every hook reads from MAINNET, where the real .eth names live. Reading is free.
  const { data: resolved, isLoading } = useEnsAddress({ name, chainId: mainnet.id }); // name -> address
  const { data: avatar } = useEnsAvatar({ name, chainId: mainnet.id }); // the "avatar" record
  const { data: description } = useEnsText({ name, key: "description", chainId: mainnet.id }); // a text record
  const { data: twitter } = useEnsText({ name, key: "com.twitter", chainId: mainnet.id }); // another text record
  const { data: primaryOfResolved } = useEnsName({ address: resolved ?? undefined, chainId: mainnet.id }); // address -> name
  const { data: myName } = useEnsName({ address, chainId: mainnet.id }); // YOUR primary name, if you have one

  return (
    <div className="ens-page">
      <p className="eyebrow">Ethereum name service / mainnet</p>
      <h1 className="page-title">Names make<br />addresses human.</h1>
      <p className="page-intro">Look up an ENS name and the public records it points to.</p>

      <div className="lookup-layout">
        <section>
          <p className="section-kicker">Resolve a name</p>
          <label className="lookup-form field-label" htmlFor="ens-name">
            ENS name
            <input
              id="ens-name"
              className="field-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="name.eth"
            />
          </label>
          {input && !name && <p className="status-message">That name is not valid ENS.</p>}
          {isLoading && <p className="gallery-state">Resolving on Ethereum mainnet…</p>}
          {name && !isLoading && !resolved && <p className="gallery-state">No address is set for this name.</p>}
        </section>
        {resolved && (
          <section className="lookup-result" aria-live="polite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar && <img src={avatar} alt={`${name} avatar`} className="ens-avatar" />}
            <div><p className="section-kicker">Resolved identity</p><h2 className="ens-primary-name">{name}</h2></div>
            <dl className="data-list">
              <div><dt>Address</dt><dd>{resolved}</dd></div>
              <div><dt>Primary name</dt><dd>{primaryOfResolved ?? "None set"}</dd></div>
              {description && <div><dt>Description</dt><dd>{description}</dd></div>}
              {twitter && <div><dt>Twitter</dt><dd>@{twitter}</dd></div>}
            </dl>
          </section>
        )}
      </div>

      {address && (
        <p className="wallet-hint">Your primary name: <b>{myName ?? "None set"}</b></p>
      )}
    </div>
  );
}

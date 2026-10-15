"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";

const links = [
  ["/", "Home"],
  ["/ens", "ENS"],
  ["/nft", "IPFS NFT"],
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="brand-lockup" aria-label="Web3Bridge studio home">
          <span className="brand-mark">W3</span>
          <span className="brand-copy">WEB3BRIDGE <small>COLLECTORS STUDIO</small></span>
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <ConnectButton />
      </div>
    </header>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <div className="home-page">
      <section className="home-feature">
        <div>
          <p className="eyebrow">A Web3Bridge collectors studio</p>
          <h1 className="page-title">Images become<br />objects become<br />stories.</h1>
          <p className="page-intro">Mint an image to Sepolia, keep its metadata on IPFS, and see who holds it through ENS.</p>
          <Link className="home-cta" href="/nft">Enter the NFT studio <span aria-hidden="true">↗</span></Link>
        </div>
        <aside className="home-side-note">
          <strong>Made to be found.</strong>
          Each token keeps its image on IPFS, its owner address onchain, and an optional live ETH reference alongside the collection.
        </aside>
      </section>
      <section className="gallery-section">
        <div className="gallery-heading">
          <div><p className="section-kicker">Three open systems</p><h2 className="section-title">A little more context</h2></div>
          <Link className="text-link" href="/ens">Explore ENS ↗</Link>
        </div>
        <p className="page-intro">ENS resolves names for collectors. IPFS keeps artwork available by content address. Chainlink supplies the live ETH/USD conversion.</p>
      </section>
    </div>
  );
}

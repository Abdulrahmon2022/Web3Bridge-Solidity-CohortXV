## NFT Studio

This Next.js dApp connects to Sepolia to mint `ClassNFT` tokens, stores image metadata on IPFS through Pinata, resolves gallery owners through mainnet ENS, and reads the Sepolia Chainlink ETH/USD feed.

## Run Locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_NFT_ADDRESS` to the deployed `ClassNFT` address on Sepolia.
3. Set `PINATA_JWT` to a Pinata JWT. This is server-only and must not use a `NEXT_PUBLIC_` prefix.
4. Optionally set `NEXT_PUBLIC_SEPOLIA_RPC_URL` and `NEXT_PUBLIC_MAINNET_RPC_URL` to your RPC endpoints.
5. Run `npm install`, then `npm run dev` and open `http://localhost:3000`.

The two `NEXT_PUBLIC_*_RPC_URL` values and NFT address are included in browser code. Never put a wallet private key or Pinata JWT in a `NEXT_PUBLIC_` variable or commit a populated local env file.

The mint form includes a reference ETH amount in its IPFS metadata. It is not a mint fee or verified market valuation; the NFT contract does not store a price.

## Deploy Online

Create a Vercel project with `frontend/` as its Root Directory. Configure the same required variables in Vercel project settings for Preview and Production, then deploy. The Pinata JWT must be configured as a server-side secret. The upload route uses it to pin files without exposing it to the browser.

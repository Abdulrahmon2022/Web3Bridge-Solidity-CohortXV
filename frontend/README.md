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

## Day 4: Smart Accounts and Live Alerts

The NFT studio's **Smart account · mint twice** action submits two `ClassNFT.mint` calls in one Safe UserOperation through Pimlico on Sepolia. The Pimlico API key is server-only: add `PIMLICO_API_KEY` as a Vercel Secret for Preview and Production, and never expose it with a `NEXT_PUBLIC_` prefix. The alert page at `/alerts` listens for new `Minted` events while open, resolves recipients through ENS, and can show browser notifications after permission is granted.

After completing one smart-account mint, add its bundled Sepolia transaction link here: **UserOperation transaction:** TODO. In the bundled transaction, **From** is the bundler and **To** is the EntryPoint; the UserOperation sender is the Safe smart account, and its inner calls target `ClassNFT`. **Gas payer:** record the actual receipt result shown by the app (Pimlico paymaster if a paymaster address is present; otherwise the smart account).

The alert page only receives live events while it is open and cannot notify a user who has left the page. A production product would run a persistent event indexer or backend subscription, store events, and deliver notifications through push, email, or an in-app inbox. It would also track delivery and let users manage notification preferences.

## Deploy Online

Create a Vercel project with `frontend/` as its Root Directory. Configure the required variables in Vercel project settings for Preview and Production, then deploy. `PINATA_JWT` and `PIMLICO_API_KEY` must be server-side secrets. The upload and Pimlico routes use them without exposing either value to the browser.

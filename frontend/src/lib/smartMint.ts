import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { encodeFunctionData, http, type PublicClient, type WalletClient } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { NFT_ADDRESS, nftAbi } from "@/contracts/nft";

export async function mintTwiceWithSmartAccount(
  publicClient: PublicClient,
  owner: WalletClient,
  uri: string,
) {
  const transport = http(new URL("/api/pimlico", window.location.origin).toString());
  const entryPoint = { address: entryPoint07Address, version: "0.7" as const };
  const pimlicoClient = createPimlicoClient({ chain: sepolia, transport, entryPoint });
  const account = await toSafeSmartAccount({
    client: publicClient,
    owners: [owner],
    version: "1.4.1",
    entryPoint,
  });
  const smartAccountClient = createSmartAccountClient({
    account,
    chain: sepolia,
    client: publicClient,
    bundlerTransport: transport,
    paymaster: {
      getPaymasterData: pimlicoClient.getPaymasterData,
      getPaymasterStubData: pimlicoClient.getPaymasterStubData,
    },
    userOperation: {
      estimateFeesPerGas: async () => (await pimlicoClient.getUserOperationGasPrice()).fast,
    },
  });

  const callData = encodeFunctionData({ abi: nftAbi, functionName: "mint", args: [uri] });
  const userOperationHash = await smartAccountClient.sendUserOperation({
    calls: [
      { to: NFT_ADDRESS, value: 0n, data: callData },
      { to: NFT_ADDRESS, value: 0n, data: callData },
    ],
  });
  const receipt = await smartAccountClient.waitForUserOperationReceipt({
    hash: userOperationHash,
    timeout: 180_000,
  });

  if (!receipt.success) throw new Error(receipt.reason || "The UserOperation reverted.");

  return {
    accountAddress: account.address,
    userOperationHash,
    transactionHash: receipt.receipt.transactionHash,
    gasPayer: receipt.paymaster ? "Pimlico paymaster" : "Smart account",
  };
}
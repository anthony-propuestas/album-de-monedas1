import { keccak256, toHex, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Env } from "~/types/env";

const REWARD_CLAIMER_ADDRESS = "0x0E6d7d06F4C7F06585A0Bc4b66973FaE6dcd4CDe" as const;

const COIN_CLAIMED_ABI = [
  {
    name: "coinClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "coinId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function getCoinIdHash(
  country: string,
  denomination: string,
  name: string,
  year: number
): `0x${string}` {
  const registryKey = `${country}|${denomination}|${name}|${year}`;
  return keccak256(toHex(registryKey));
}

export async function signClaim(
  wallet: `0x${string}`,
  coinIdHash: `0x${string}`,
  env: Env
): Promise<{ signature: `0x${string}`; signerAddress: string; signedWallet: string }> {
  const account = privateKeyToAccount(env.BACKEND_SIGNER_KEY as `0x${string}`);
  const signature = await account.signTypedData({
    domain: {
      name: "RewardClaimer",
      version: "1",
      chainId: 8453,
      verifyingContract: REWARD_CLAIMER_ADDRESS,
    },
    types: {
      Claim: [
        { name: "wallet", type: "address" },
        { name: "coinId", type: "bytes32" },
      ],
    },
    primaryType: "Claim",
    message: { wallet, coinId: coinIdHash },
  });
  return { signature, signerAddress: account.address, signedWallet: wallet };
}

export async function isCoinClaimedOnchain(
  coinIdHash: `0x${string}`
): Promise<boolean> {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });
    return await client.readContract({
      address: REWARD_CLAIMER_ADDRESS,
      abi: COIN_CLAIMED_ABI,
      functionName: "coinClaimed",
      args: [coinIdHash],
    });
  } catch {
    return false;
  }
}

import { keccak256, toHex, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import type { Env } from "~/types/env";

const REWARD_CLAIMER_ADDRESS = "0x50c78a44FA70c765695E2B836474d83d1776F718" as const;

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
): Promise<`0x${string}`> {
  const account = privateKeyToAccount(env.BACKEND_SIGNER_KEY as `0x${string}`);
  return account.signTypedData({
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
}

export async function isCoinClaimedOnchain(
  coinIdHash: `0x${string}`
): Promise<boolean> {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  return client.readContract({
    address: REWARD_CLAIMER_ADDRESS,
    abi: COIN_CLAIMED_ABI,
    functionName: "coinClaimed",
    args: [coinIdHash],
  });
}

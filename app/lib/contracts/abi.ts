export const REWARD_CLAIMER_ABI = [
  {
    name: "claimReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "coinId",    type: "bytes32" },
      { name: "signature", type: "bytes"   },
    ],
    outputs: [],
  },
  {
    name: "coinClaimed",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "coinId", type: "bytes32" }],
    outputs: [{ name: "",       type: "bool"    }],
  },
  {
    name: "lastClaimTime",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "wallet", type: "address" }],
    outputs: [{ name: "",       type: "uint256"  }],
  },
] as const;

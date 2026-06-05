import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { REWARD_CLAIMER_ABI } from "~/lib/contracts/abi";
import { REWARD_CLAIMER_ADDRESS } from "~/lib/contracts/addresses";

type ClaimStatus = "eligible" | "pending" | "approved" | "rejected" | "claimed" | "expired";

interface Props {
  coinId: string;
  registryMatch?: number;
  initialStatus: ClaimStatus;
  initialExpiresAt?: number | null;
  initialCoinIdHash?: string | null;
  initialRejectReason?: string | null;
}

function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "expirado";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export function ClaimButton({
  coinId,
  registryMatch,
  initialStatus,
  initialExpiresAt,
  initialCoinIdHash,
  initialRejectReason,
}: Props) {
  const { address } = useAccount();
  const [status, setStatus] = useState<ClaimStatus>(initialStatus);
  const [expiresAt, setExpiresAt] = useState<number | null>(initialExpiresAt ?? null);
  const [coinIdHash, setCoinIdHash] = useState<string | null>(initialCoinIdHash ?? null);
  const [rejectReason, setRejectReason] = useState<string | null>(initialRejectReason ?? null);
  const [loading, setLoading] = useState(false);
  const [txDone, setTxDone] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash });

  const isExpired = status === "approved" && expiresAt != null && expiresAt < Math.floor(Date.now() / 1000);
  const effectiveStatus: ClaimStatus = isExpired ? "expired" : status;

  useEffect(() => {
    if (txSuccess && hash && !txDone) {
      setTxDone(true);
      setStatus("claimed");
      fetch("/api/rewards/claimed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, txHash: hash }),
      }).catch(() => {});
      // Sugerir añadir el token a MetaMask con imagen personalizada
      (window as Window & { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum
        ?.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: "0xf078c79b0F52ABE81394DD455cBc0a63f76bC059",
              symbol: "AC",
              decimals: 18,
              image: `${window.location.origin}/album-coin-logo.png`,
            },
          },
        })
        .catch(() => {});
    }
  }, [txSuccess, hash, coinId, txDone]);

  if (!registryMatch || !address) return null;

  async function handleRequest() {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch("/api/rewards/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, walletAddress: address }),
      });
      if (res.ok) setStatus("pending");
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    const currentAddress = address;
    if (!currentAddress) return;
    setLoading(true);
    setClaimError(null);
    try {
      const res = await fetch("/api/rewards/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, walletAddress: currentAddress }),
      });
      if (!res.ok) {
        const data = await res.json<{ error?: string }>();
        setClaimError(data.error ?? `Error del servidor (${res.status})`);
        return;
      }
      const { signature, coinIdHash: hash } = await res.json<{ signature: `0x${string}`; coinIdHash: `0x${string}` }>();
      setCoinIdHash(hash);
      writeContract({
        address: REWARD_CLAIMER_ADDRESS,
        abi: REWARD_CLAIMER_ABI,
        functionName: "claimReward",
        args: [hash, signature],
        account: currentAddress,
      });
    } finally {
      setLoading(false);
    }
  }

  const base =
    "mt-1.5 w-full text-[10px] uppercase tracking-widest font-medium py-1.5 rounded-lg border transition-all";

  if (effectiveStatus === "claimed" || txDone) {
    return (
      <span className="mt-1.5 w-full text-[10px] uppercase tracking-widest text-center text-emerald-400/70 py-1.5">
        ✅ Reclamado
      </span>
    );
  }

  if (isConfirming) {
    return (
      <button disabled className={`${base} border-amber-400/20 text-amber-400/50`}>
        ⏳ Confirmando TX...
      </button>
    );
  }

  if (effectiveStatus === "pending") {
    return (
      <button disabled className={`${base} border-[rgba(210,180,130,0.15)] text-[rgba(201,164,106,0.4)]`}>
        ⏳ En revisión
      </button>
    );
  }

  if (effectiveStatus === "rejected") {
    return (
      <button disabled className={`${base} border-red-400/15 text-red-400/40`} title={rejectReason ?? undefined}>
        ❌ {rejectReason ? rejectReason.slice(0, 30) : "Rechazado"}
      </button>
    );
  }

  if (effectiveStatus === "approved" && expiresAt) {
    const errMsg = claimError ?? (writeError ? ((writeError as unknown as { shortMessage?: string }).shortMessage ?? writeError.message) : null);
    return (
      <div className="flex flex-col gap-0.5">
        <button
          onClick={handleClaim}
          disabled={isWritePending || loading}
          className={`${base} border-amber-400/30 text-amber-300 hover:bg-amber-400/10 hover:border-amber-400/50`}
        >
          {isWritePending || loading
            ? "Esperando wallet..."
            : `🎁 Confirmar — ${formatCountdown(expiresAt)}`}
        </button>
        {errMsg && (
          <p className="text-[9px] text-red-400/80 text-center leading-tight break-all">{errMsg}</p>
        )}
      </div>
    );
  }

  // eligible or expired
  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className={`${base} border-[rgba(210,180,130,0.25)] text-[rgba(201,164,106,0.7)] hover:border-[rgba(210,180,130,0.55)] hover:text-[#C9A46A] hover:bg-[rgba(201,164,106,0.08)]`}
    >
      {loading ? "..." : "Reclamar Token"}
    </button>
  );
}

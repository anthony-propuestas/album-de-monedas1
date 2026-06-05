import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(210,180,130,0.25)] bg-[rgba(201,164,106,0.07)] text-[#C9A46A] text-[11px] font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 shrink-0" />
        <span>{truncateAddress(address)}</span>
        <button
          onClick={() => disconnect()}
          className="ml-1 text-[rgba(201,164,106,0.45)] hover:text-red-400/70 transition-colors leading-none"
          aria-label="Desconectar wallet"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="text-[11px] text-[rgba(242,236,224,0.35)] hover:text-[rgba(201,164,106,0.6)] transition-colors"
    >
      Conecta tu wallet para participar de las recompensas onchain
    </button>
  );
}

import { useState } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const WALLETCONNECT_PROJECT_ID = "14787ba0b7b7e79c3ca503e0c4ab6175";

export function Providers({ children }: { children: React.ReactNode }) {
  const [config] = useState(() => {
    const connectors = connectorsForWallets(
      [{ groupName: "Wallets", wallets: [injectedWallet, metaMaskWallet] }],
      { appName: "Album de Monedas", projectId: WALLETCONNECT_PROJECT_ID }
    );
    return createConfig({
      chains: [baseSepolia],
      connectors,
      transports: { [baseSepolia.id]: http() },
    });
  });
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

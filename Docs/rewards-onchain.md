# Sistema de Recompensas Onchain — AC Token

## 1. Visión General

Album de Monedas agrega un sistema de incentivos onchain donde los usuarios que contribuyen con monedas verificadas en el registro oficial reciben **AC (Album Coin)**, un token ERC-20 desplegado en Base (chain ID 8453).

La recompensa **no es automática**: pasa por validación humana (admin) antes de ejecutarse onchain.

---

## 2. Token — AC (Album Coin)

| Propiedad | Valor |
|-----------|-------|
| Nombre | Album Coin |
| Símbolo | AC |
| Red | Base Mainnet (chain ID 8453) |
| Supply | Ilimitado (minteo por contribución) |
| Minter | Solo el smart contract |
| Estándar | ERC-20 |
| Cantidad por claim | 1 AC |

El contrato ERC-20 tiene un único minter autorizado: el contrato de recompensas. Nadie puede mintear AC directamente, solo a través del flujo de claim validado.

---

## 3. Smart Contract — RewardClaimer

### Variables de estado

```solidity
mapping(bytes32 => bool)    public coinClaimed;      // coinId → ya fue reclamada
mapping(address => uint256) public lastClaimTime;    // wallet → timestamp último claim
address public backendSigner;                         // clave del backend (Cloudflare)
AlbumCoin public token;                               // contrato ERC-20
```

### Función principal

```solidity
function claimReward(bytes32 coinId, bytes memory signature) external {
    require(!coinClaimed[coinId], "Moneda ya reclamada");
    require(block.timestamp - lastClaimTime[msg.sender] >= 24h, "Cooldown activo");
    require(isValidSignature(msg.sender, coinId, signature), "Firma inválida");

    coinClaimed[coinId] = true;
    lastClaimTime[msg.sender] = block.timestamp;
    token.mint(msg.sender, 1 ether); // 1 AC con 18 decimales
}
```

### Generación del coinId

```solidity
coinId = keccak256(abi.encodePacked(país, denominación, nombre, año))
// Ejemplo: keccak256("Argentina|1 Peso|Serie 1|1994")
```

---

## 4. Base de Datos — Nuevas Tablas D1

### Tabla `claim_requests`

```sql
CREATE TABLE claim_requests (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,            -- FK users
  coin_id           TEXT NOT NULL,            -- FK coins (D1)
  coin_registry_key TEXT NOT NULL,            -- "Argentina|1 Peso|Serie 1|1994"
  coin_id_hash      TEXT NOT NULL,            -- keccak256 del registry_key
  wallet_address    TEXT NOT NULL,
  status            TEXT DEFAULT 'pending',   -- pending | approved | rejected | claimed | expired
  reject_reason     TEXT,
  created_at        INTEGER NOT NULL,
  reviewed_at       INTEGER,
  approved_at       INTEGER,
  expires_at        INTEGER,                  -- approved_at + 7 días
  claimed_at        INTEGER,
  tx_hash           TEXT                      -- hash de la TX onchain
);
```

### Cambio en tabla `coins` (D1 existente)

```sql
ALTER TABLE coins ADD COLUMN registry_match BOOLEAN DEFAULT FALSE;
-- TRUE si el país+denominación+nombre+año existe en COINS_BY_COUNTRY
```

---

## 5. Flujo Completo — 5 Etapas

### Etapa 1 — Subir moneda

```
Usuario sube moneda en /mycollection
       ↓
Backend verifica si coincide con COINS_BY_COUNTRY
       ↓
Si coincide → registry_match = TRUE en D1
CoinCard muestra botón "Reclamar Token" (estado: eligible)
```

### Etapa 2 — Solicitar recompensa

```
Usuario conecta wallet (RainbowKit/wagmi)
       ↓
Click en "Reclamar Token" en una CoinCard específica
       ↓
Backend valida:
  ✓ La moneda pertenece al usuario (D1)
  ✓ registry_match = TRUE
  ✓ No existe claim_request activo para esta moneda (pending/approved)
  ✓ coinClaimed[coinId] = false (consulta al contrato Base)
       ↓
Crea registro en claim_requests con status = 'pending'
Botón cambia a: "⏳ En revisión"
```

> Si la moneda ya fue `rejected`, el botón muestra el motivo y queda desactivado permanentemente para esa moneda. No puede volver a solicitarse.

### Etapa 3 — Revisión en /admin

```
Admin ve lista de claim_requests con status = 'pending'
Cada fila muestra:
  - Foto(s) de la moneda subida por el usuario
  - Datos: país, denominación, nombre, año
  - Referencia del registro oficial (COINS_BY_COUNTRY)
  - Wallet del usuario
       ↓
Admin compara foto con datos manualmente
       ↓
APROBAR → status = 'approved', expires_at = now + 7 días
RECHAZAR → status = 'rejected', reject_reason = texto del admin
```

### Etapa 4 — Confirmación del usuario

```
Usuario vuelve a /mycollection
       ↓
CoinCard aprobada muestra botón "Confirmar Recompensa 🎁"
(con contador de expiración: "Expira en X días")
       ↓
Click → Backend valida ANTES de firmar:
  ✓ claim_request existe y status = 'approved'
  ✓ expires_at > now (no expiró)
  ✓ coinClaimed[coinId] = false (race condition check)
  ✓ El wallet_address coincide con el conectado
       ↓
Backend firma mensaje EIP-712 con su clave privada (Cloudflare Secret)
Devuelve la firma al frontend
```

### Etapa 5 — Ejecución onchain

```
Frontend recibe firma del backend
       ↓
wagmi ejecuta claimReward(coinId, signature)
Usuario paga gas en Base (ETH)
       ↓
Contrato valida:
  ✓ Firma del backend válida
  ✓ coinClaimed[coinId] = false
  ✓ lastClaimTime[wallet] < now - 24h
       ↓
Mintea 1 AC al wallet
coinClaimed[coinId] = true (permanente)
lastClaimTime[wallet] = now
       ↓
Frontend detecta TX confirmada
Backend actualiza claim_requests: status = 'claimed', tx_hash = "0x..."
CoinCard muestra: "✅ Reclamado — TX: 0x..." (link a basescan)
```

---

## 6. Estados de una CoinCard

### Diagrama de transiciones

```
eligible → pending → approved → claimed
                   ↘ rejected  
                   ↘ expired → (vuelve a eligible para solicitar de nuevo)
```

### Tabla de estados

| Estado | Botón visible |
|--------|---------------|
| `eligible` | "Reclamar Token" (activo) |
| `pending` | "⏳ En revisión" (desactivado) |
| `approved` | "Confirmar Recompensa 🎁 — expira en Xd" (activo) |
| `rejected` | "❌ Rechazado: [motivo]" (desactivado permanente) |
| `expired` | "Reclamar Token" (activo de nuevo) |
| `claimed` | "✅ Reclamado" (desactivado) |

> Para otras wallets/usuarios: Si `coinClaimed[coinId] = true` en el contrato → botón "🔒 Ya reclamada por otro usuario" (desactivado).

---

## 7. Cooldown de 24 h

El límite vive **onchain** (no en D1). Aplica al momento de ejecutar la TX de "Confirmar Recompensa".

- El usuario puede tener 5 monedas `approved` al mismo tiempo
- Solo puede ejecutar **1 TX cada 24 h**
- El frontend consulta `lastClaimTime[wallet]` y muestra: _"Próximo claim disponible en: Xh Xm"_
- Si intenta la segunda TX antes de 24 h → el contrato la revierte

---

## 8. Endpoints Backend (nuevos)

| Método | Ruta | Acción |
|--------|------|--------|
| `POST` | `/api/rewards/request` | Crea claim_request (pendiente) |
| `GET` | `/api/rewards/status/:coinId` | Estado del claim de esa moneda |
| `POST` | `/api/rewards/sign` | Valida y firma EIP-712 para TX |
| `GET` | `/admin/rewards` | Lista pendientes para admin |
| `POST` | `/admin/rewards/:id/approve` | Admin aprueba |
| `POST` | `/admin/rewards/:id/reject` | Admin rechaza con motivo |

---

## 9. Cambios en Frontend

### Nuevas dependencias

```bash
npm install wagmi @rainbow-me/rainbowkit viem --legacy-peer-deps
```

| Paquete | Uso |
|---------|-----|
| `wagmi` | Hooks de wallet y contratos |
| `@rainbow-me/rainbowkit` | UI de conexión de wallet |
| `viem` | Interacción con contratos Base |

### Nuevos componentes

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `WalletConnectButton` | `app/components/` | Botón de conexión en el header |
| `ClaimButton` | `app/components/` | Dentro de CoinCard, reemplaza área vacía |
| `ClaimStatusBadge` | `app/components/` | Muestra estado + countdown de expiración |
| `AdminRewardsPanel` | `app/components/` | Nueva sección en `/admin` |

---

## 10. Viabilidad y Requisitos

### Estado actual del proyecto

El diseño es técnicamente sólido. El patrón "backend signer + contrato validador" es estándar en producción (OpenSea, Zora, Layer3 lo usan). Los riesgos y mitigaciones están cubiertos en la sección 10.

### Lo que falta para que esto funcione

| Componente | Estado | Trabajo estimado |
|------------|--------|-----------------|
| Smart contracts (Solidity) | ❌ No existe | 2–3 días (dev) + 1 semana (audit opcional) |
| Deploy en Base | ❌ No existe | 1 día (Foundry + scripts) |
| Clave privada del signer en Cloudflare | ❌ No configurada | 2 horas |
| Tabla `claim_requests` en D1 | ❌ No existe | 1 hora (migración SQL) |
| Columna `registry_match` en `coins` | ❌ No existe | 1 hora |
| Endpoints `/api/rewards/*` | ❌ No existen | 3–5 días |
| Endpoints `/admin/rewards/*` | ❌ No existen | 1–2 días |
| Componentes frontend (wagmi, RainbowKit) | ❌ No existen | 3–4 días |
| Datos COINS_BY_COUNTRY completos | ⚠️ Parcial (solo Argentina) | Variable |

### Dependencias críticas (bloqueantes)

1. **ETH en wallet de usuario** — el usuario paga su propio gas en Base (~$0.01–0.05 USD por TX). **El proyecto no patrocina gas.** Si el usuario no tiene ETH en Base, no puede reclamar — esto es por diseño y no se cambiará.

2. **Clave privada del backend** — necesita vivir en un Cloudflare Secret (`BACKEND_SIGNER_KEY`). Si se filtra, cualquiera puede generar firmas válidas y mintear AC ilimitado. Protección: el contrato también valida `coinClaimed[coinId]`, lo que limita el daño a una sola moneda por ID.

3. **Dirección del contrato hardcodeada** — el frontend necesita la address del contrato desplegado. Cambiarla requiere redeploy del frontend.

4. **ABI del contrato** — wagmi necesita el ABI compilado para llamar `claimReward`. Debe incluirse en el repo.

---

## 11. Implementación Onchain — Guía Completa

Esta sección explica exactamente cómo se construye, despliega e integra la parte onchain.

### 11.1 Herramientas necesarias

```bash
# Foundry (toolchain Solidity recomendado)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# También necesitas:
# - Node.js (ya tienes)
# - Una wallet con ETH en Base Mainnet (para pagar deploy ~$2–5 USD)
# - Una cuenta en Basescan para verificar el contrato (gratis)
```

### 11.2 Los dos contratos Solidity

**Contrato 1: AlbumCoin.sol** (ERC-20 con minter único)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AlbumCoin is ERC20, Ownable {
    address public minter;

    constructor() ERC20("Album Coin", "AC") Ownable(msg.sender) {}

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Solo el minter puede mintear");
        _mint(to, amount);
    }
}
```

**Contrato 2: RewardClaimer.sol** (valida firma + llama mint)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract RewardClaimer is EIP712 {
    using ECDSA for bytes32;

    AlbumCoin public immutable token;
    address public backendSigner;
    address public owner;

    mapping(bytes32 => bool) public coinClaimed;
    mapping(address => uint256) public lastClaimTime;

    // EIP-712: define el tipo del mensaje que firma el backend
    bytes32 private constant CLAIM_TYPEHASH = keccak256(
        "Claim(address wallet,bytes32 coinId)"
    );

    uint256 private constant COOLDOWN = 24 hours;

    constructor(address _token, address _signer) EIP712("RewardClaimer", "1") {
        token = AlbumCoin(_token);
        backendSigner = _signer;
        owner = msg.sender;
    }

    function claimReward(bytes32 coinId, bytes memory signature) external {
        require(!coinClaimed[coinId], "Moneda ya reclamada");
        require(
            block.timestamp - lastClaimTime[msg.sender] >= COOLDOWN,
            "Cooldown activo"
        );

        // Reconstruye el hash que firmó el backend
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, coinId)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        // Verifica que la firma viene del backend (backendSigner)
        address recovered = digest.recover(signature);
        require(recovered == backendSigner, "Firma invalida");

        coinClaimed[coinId] = true;
        lastClaimTime[msg.sender] = block.timestamp;
        token.mint(msg.sender, 1 ether); // 1 AC = 1e18 unidades mínimas
    }

    function setBackendSigner(address _signer) external {
        require(msg.sender == owner, "Solo owner");
        backendSigner = _signer;
    }
}
```

### 11.3 Deploy con Foundry

```bash
# 1. Crear proyecto Foundry (dentro de /contracts/ en el repo)
forge init contracts
cd contracts
forge install OpenZeppelin/openzeppelin-contracts

# 2. Script de deploy: contracts/script/Deploy.s.sol
```

```solidity
// contracts/script/Deploy.s.sol
pragma solidity ^0.8.20;
import "forge-std/Script.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address backendSigner = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        vm.startBroadcast(deployerKey);

        AlbumCoin token = new AlbumCoin();
        RewardClaimer claimer = new RewardClaimer(address(token), backendSigner);

        // El minter del token es el contrato RewardClaimer
        token.setMinter(address(claimer));

        vm.stopBroadcast();

        console.log("AlbumCoin:", address(token));
        console.log("RewardClaimer:", address(claimer));
    }
}
```

```bash
# 3. Variables de entorno para deploy
# .env (nunca commitear)
DEPLOYER_PRIVATE_KEY=0x...       # tu wallet con ETH en Base
BACKEND_SIGNER_ADDRESS=0x...     # dirección pública derivada de BACKEND_SIGNER_KEY

# 4. Ejecutar deploy en Base Mainnet
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \                     # verifica en Basescan automáticamente
  --etherscan-api-key $BASESCAN_API_KEY

# Output:
# AlbumCoin deployed to: 0xABC...
# RewardClaimer deployed to: 0xDEF...
```

### 11.4 El signer del backend (Cloudflare Worker)

El backend necesita una clave privada para firmar mensajes EIP-712. Esta clave nunca sale del entorno de Cloudflare.

**Generar el par de claves:**
```bash
# Usar viem o ethers.js para generar un wallet desechable
node -e "
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const key = generatePrivateKey();
const account = privateKeyToAccount(key);
console.log('Private key:', key);      // → va a Cloudflare Secret
console.log('Address:', account.address); // → va a BACKEND_SIGNER_ADDRESS
"
```

**Configurar en Cloudflare:**
```bash
wrangler secret put BACKEND_SIGNER_KEY
# Pega la clave privada (0x...) cuando pregunte
```

**Código del endpoint `/api/rewards/sign` en el Worker:**
```typescript
// Dentro del loader/action de Remix (server-side, Cloudflare)
import { privateKeyToAccount } from "viem/accounts";
import { hashTypedData } from "viem";

async function signClaim(
  wallet: `0x${string}`,
  coinId: `0x${string}`,
  env: Env
) {
  const account = privateKeyToAccount(env.BACKEND_SIGNER_KEY as `0x${string}`);

  // Firma el mismo struct que valida el contrato
  const signature = await account.signTypedData({
    domain: {
      name: "RewardClaimer",
      version: "1",
      chainId: 8453, // Base Mainnet
      verifyingContract: "0xDEF..." // address del contrato desplegado
    },
    types: {
      Claim: [
        { name: "wallet", type: "address" },
        { name: "coinId",  type: "bytes32" }
      ]
    },
    primaryType: "Claim",
    message: { wallet, coinId }
  });

  return signature; // "0x..." — va al frontend para ejecutar la TX
}
```

### 11.5 Frontend con wagmi

**Configuración inicial** (una vez, en `app/root.tsx` o un provider wrapper):

```typescript
// app/providers/WagmiProvider.tsx
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "Album de Monedas",
  projectId: "TU_WALLETCONNECT_PROJECT_ID", // gratis en cloud.walletconnect.com
  chains: [base],
  transports: { [base.id]: http() }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <RainbowKitProvider>{children}</RainbowKitProvider>
    </WagmiProvider>
  );
}
```

**El botón de claim en CoinCard:**

```typescript
// app/components/ClaimButton.tsx
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REWARD_CLAIMER_ABI } from "~/lib/contracts/abi";
import { REWARD_CLAIMER_ADDRESS } from "~/lib/contracts/addresses";

export function ClaimButton({ coinId }: { coinId: string }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function handleClaim() {
    // 1. Pedir firma al backend
    const res = await fetch("/api/rewards/sign", {
      method: "POST",
      body: JSON.stringify({ coinId }),
      headers: { "Content-Type": "application/json" }
    });
    const { signature, coinIdHash } = await res.json();

    // 2. Ejecutar TX onchain (usuario firma con su wallet)
    writeContract({
      address: REWARD_CLAIMER_ADDRESS,
      abi: REWARD_CLAIMER_ABI,
      functionName: "claimReward",
      args: [coinIdHash as `0x${string}`, signature as `0x${string}`]
    });
  }

  if (isSuccess) return <span>✅ Reclamado</span>;
  if (isConfirming) return <span>⏳ Confirmando TX...</span>;

  return (
    <button onClick={handleClaim} disabled={isPending}>
      {isPending ? "Esperando wallet..." : "Confirmar Recompensa 🎁"}
    </button>
  );
}
```

### 11.6 ABI necesario para wagmi

Después del deploy, Foundry genera el ABI en `contracts/out/RewardClaimer.sol/RewardClaimer.json`. Solo necesitas el fragmento relevante:

```typescript
// app/lib/contracts/abi.ts
export const REWARD_CLAIMER_ABI = [
  {
    name: "claimReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "coinId",    type: "bytes32" },
      { name: "signature", type: "bytes"   }
    ],
    outputs: []
  },
  {
    name: "coinClaimed",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "coinId", type: "bytes32" }],
    outputs: [{ name: "",       type: "bool"    }]
  },
  {
    name: "lastClaimTime",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "wallet", type: "address" }],
    outputs: [{ name: "",       type: "uint256"  }]
  }
] as const;
```

### 11.7 Generar el coinId en el backend

El `coinId` que usa el contrato es un `bytes32 = keccak256(registryKey)`. Cloudflare Workers no tiene la función `keccak256` nativa, se usa `viem`:

```typescript
import { keccak256, toHex, encodePacked } from "viem";

function getCoinIdHash(country: string, denomination: string, name: string, year: number): `0x${string}` {
  const registryKey = `${country}|${denomination}|${name}|${year}`;
  // keccak256 de la string UTF-8 codificada
  return keccak256(toHex(registryKey));
}

// Ejemplo: getCoinIdHash("Argentina", "1 Peso", "Serie 1", 1994)
// → "0x7f3a..." (bytes32 único para esa moneda)
```

### 11.8 Orden de pasos para implementar

```
1. Escribir y testear contratos con Foundry (forge test)
2. Deploy en Base Sepolia (testnet) para pruebas
3. Configurar BACKEND_SIGNER_KEY en Cloudflare (wrangler secret)
4. Migrar D1: crear claim_requests + ALTER coins ADD registry_match
5. Implementar endpoints /api/rewards/* en Remix actions/loaders
6. Implementar endpoints /admin/rewards/* 
7. Instalar wagmi + RainbowKit (npm install --legacy-peer-deps)
8. Crear WagmiProvider y wrapear app/root.tsx
9. Implementar ClaimButton en CoinCard
10. Probar flujo completo en testnet
11. Deploy en Base Mainnet
12. Actualizar addresses en frontend y redeploy
```

---

## 10. Seguridad y Anti-abuso

| Riesgo | Protección |
|--------|-----------|
| Foto falsa con datos reales | Revisión manual admin |
| Doble claim de misma moneda | `coinClaimed[coinId]` permanente onchain |
| Spam de requests | Un solo `pending`/`approved` activo por moneda |
| Farm con múltiples wallets | Cada `coinId` solo se reclama una vez (globalmente) |
| Firma robada/replay | EIP-712 incluye `wallet + coinId + chainId` |
| Race condition | Backend verifica contrato justo antes de firmar |
| Expiración ignorada | Backend valida `expires_at` antes de firmar |

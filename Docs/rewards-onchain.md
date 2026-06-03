# Plan de Implementación — Sistema de Recompensas Onchain (AC Token)

Objetivo: los usuarios que suben monedas verificadas reciben **1 AC (Album Coin)**, un token ERC-20 en Base Mainnet, tras revisión manual del admin y confirmación onchain con su wallet.

## Estado actual

| Componente | Estado |
|------------|--------|
| Smart contracts (Solidity) | ❌ No existe |
| Deploy en Base | ❌ No existe |
| Tabla `claim_requests` en D1 | ❌ No existe |
| Columna `registry_match` en `coins` | ❌ No existe |
| `BACKEND_SIGNER_KEY` en Cloudflare | ❌ No configurada |
| Endpoints `/api/rewards/*` | ❌ No existen |
| Endpoints `/admin/rewards/*` | ❌ No existen |
| Componentes frontend (wagmi, RainbowKit) | ❌ No existen |
| Datos `COINS_BY_COUNTRY` completos | ⚠️ Solo Argentina |

---

## Fase 0 — Prerrequisitos

Hacer esto antes de escribir una sola línea de código.

### 0.1 Instalar Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version   # debe mostrar versión
```

### 0.2 Generar par de claves del backend signer

Esta clave privada es la que firma los mensajes EIP-712 en el backend. Se genera una sola vez y nunca se commitea.

```bash
node -e "
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const key = generatePrivateKey();
const account = privateKeyToAccount(key);
console.log('Private key:', key);       // → Cloudflare Secret
console.log('Address:', account.address); // → BACKEND_SIGNER_ADDRESS en deploy
"
```

Guarda ambos valores en un lugar seguro. La dirección pública va al script de deploy; la clave privada va al paso 3.

### 0.3 Registrar proyecto en WalletConnect Cloud

Ir a [cloud.walletconnect.com](https://cloud.walletconnect.com), crear proyecto gratuito, copiar el `projectId`. Se usa en el paso 6.

### 0.4 Crear cuenta en Basescan

Registrarse en [basescan.org](https://basescan.org) y obtener un API key gratuito. Se necesita para verificar los contratos en el paso 2.

---

## Paso 1 — Contratos Solidity

**Qué:** crear la carpeta `contracts/` en la raíz del repo con dos contratos: el token ERC-20 y el contrato que valida firmas y mintea.

**Por qué:** el token necesita un minter único (el contrato RewardClaimer) para que nadie pueda mintear AC directamente.

### 1.1 Inicializar proyecto Foundry

```bash
forge init contracts
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### 1.2 Crear `contracts/src/AlbumCoin.sol`

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

### 1.3 Crear `contracts/src/RewardClaimer.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "./AlbumCoin.sol";

contract RewardClaimer is EIP712 {
    using ECDSA for bytes32;

    AlbumCoin public immutable token;
    address public backendSigner;
    address public owner;

    mapping(bytes32 => bool) public coinClaimed;
    mapping(address => uint256) public lastClaimTime;

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

        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, coinId)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
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

### 1.4 Crear `contracts/script/Deploy.s.sol`

```solidity
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/AlbumCoin.sol";
import "../src/RewardClaimer.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address backendSigner = vm.envAddress("BACKEND_SIGNER_ADDRESS");
        vm.startBroadcast(deployerKey);

        AlbumCoin token = new AlbumCoin();
        RewardClaimer claimer = new RewardClaimer(address(token), backendSigner);
        token.setMinter(address(claimer));

        vm.stopBroadcast();

        console.log("AlbumCoin:", address(token));
        console.log("RewardClaimer:", address(claimer));
    }
}
```

### ✅ Verificar paso 1

```bash
cd contracts
forge test   # debe compilar y pasar (aunque no haya tests aún, al menos debe compilar)
```

---

## Paso 2 — Deploy en Testnet (Base Sepolia)

**Qué:** desplegar los contratos en Base Sepolia para probar el flujo completo antes de tocar mainnet.

**Por qué:** los errores en testnet son gratuitos; en mainnet cuestan gas real.

### 2.1 Crear `.env` en `contracts/` (nunca commitear)

```bash
DEPLOYER_PRIVATE_KEY=0x...    # wallet con ETH en Base Sepolia (faucet gratuito)
BACKEND_SIGNER_ADDRESS=0x...  # dirección pública del par generado en paso 0.2
BASESCAN_API_KEY=...           # del paso 0.4
```

### 2.2 Ejecutar deploy

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

### ✅ Verificar paso 2

- El output muestra `AlbumCoin: 0xABC...` y `RewardClaimer: 0xDEF...`
- Ambas addresses aparecen verificadas en [sepolia.basescan.org](https://sepolia.basescan.org)
- Anotar las addresses; se necesitan en pasos 5 y 6

---

## Paso 3 — Configurar Signer en Cloudflare

**Qué:** subir la clave privada del backend (paso 0.2) como secret de Wrangler. Esta clave firma los mensajes EIP-712 que autoriza al usuario a ejecutar la TX onchain.

**Por qué:** si la clave viviera en el frontend o en una variable de entorno normal, cualquiera podría robarla y mintear AC libremente.

```bash
wrangler secret put BACKEND_SIGNER_KEY
# Pegar la private key (0x...) cuando pregunte
```

### ✅ Verificar paso 3

```bash
wrangler secret list
# Debe aparecer BACKEND_SIGNER_KEY en la lista
```

---

## Paso 4 — Migración de Base de Datos (D1)

**Qué:** agregar la tabla `claim_requests` y la columna `registry_match` a la tabla `coins` existente.

### 4.1 Nueva tabla `claim_requests`

```sql
CREATE TABLE claim_requests (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  coin_id           TEXT NOT NULL,
  coin_registry_key TEXT NOT NULL,     -- "Argentina|1 Peso|Serie 1|1994"
  coin_id_hash      TEXT NOT NULL,     -- keccak256 del registry_key (bytes32 hex)
  wallet_address    TEXT NOT NULL,
  status            TEXT DEFAULT 'pending',  -- pending | approved | rejected | claimed | expired
  reject_reason     TEXT,
  created_at        INTEGER NOT NULL,
  reviewed_at       INTEGER,
  approved_at       INTEGER,
  expires_at        INTEGER,           -- approved_at + 7 días (en segundos Unix)
  claimed_at        INTEGER,
  tx_hash           TEXT
);
```

### 4.2 Columna nueva en `coins`

```sql
ALTER TABLE coins ADD COLUMN registry_match BOOLEAN DEFAULT FALSE;
-- TRUE si el país+denominación+nombre+año existe en COINS_BY_COUNTRY
```

### 4.3 Ejecutar en D1

```bash
# Local
wrangler d1 execute album-monedas-db --local --command "CREATE TABLE ..."
# Producción
wrangler d1 execute album-monedas-db --command "CREATE TABLE ..."
```

### ✅ Verificar paso 4

```bash
wrangler d1 execute album-monedas-db --command "SELECT * FROM claim_requests LIMIT 1"
# Debe retornar sin error (tabla vacía)
wrangler d1 execute album-monedas-db --command "SELECT registry_match FROM coins LIMIT 1"
# Debe retornar sin error
```

---

## Paso 5 — Endpoints Backend `/api/rewards/*`

**Qué:** 6 rutas Remix nuevas que manejan todo el ciclo de vida del claim en el servidor.

### Tabla de endpoints

| Método | Ruta | Acción |
|--------|------|--------|
| `POST` | `/api/rewards/request` | Usuario solicita recompensa para una moneda |
| `GET` | `/api/rewards/status/:coinId` | Retorna el estado del claim de esa moneda |
| `POST` | `/api/rewards/sign` | Valida aprobación y firma EIP-712 para la TX |
| `GET` | `/admin/rewards` | Lista claims pendientes para el admin |
| `POST` | `/admin/rewards/:id/approve` | Admin aprueba (status → approved, sets expires_at) |
| `POST` | `/admin/rewards/:id/reject` | Admin rechaza con motivo de texto |

### Lógica de `/api/rewards/request`

Validaciones antes de crear el registro:
1. La moneda pertenece al usuario autenticado (D1)
2. `registry_match = TRUE` en esa moneda
3. No existe un `claim_request` con `status IN ('pending', 'approved')` para esa moneda
4. `coinClaimed[coinIdHash]` es `false` en el contrato (llamada a Base Sepolia/Mainnet)

Si pasa: crear registro en `claim_requests` con `status = 'pending'`.

### Lógica de `/api/rewards/sign`

Validaciones antes de firmar:
1. Existe el `claim_request` y `status = 'approved'`
2. `expires_at > now` (no expirado)
3. `coinClaimed[coinIdHash]` es `false` en el contrato (race condition check)
4. `wallet_address` coincide con la wallet conectada en el request

Si pasa: firmar EIP-712 con la clave del backend y retornar la firma.

### Función de firma (en el Worker)

```typescript
import { privateKeyToAccount } from "viem/accounts";

async function signClaim(
  wallet: `0x${string}`,
  coinId: `0x${string}`,
  env: Env
) {
  const account = privateKeyToAccount(env.BACKEND_SIGNER_KEY as `0x${string}`);
  return account.signTypedData({
    domain: {
      name: "RewardClaimer",
      version: "1",
      chainId: 8453,
      verifyingContract: "0xDEF..." // address del contrato (mainnet o testnet según env)
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
}
```

### Función para generar el coinId

```typescript
import { keccak256, toHex } from "viem";

function getCoinIdHash(country: string, denomination: string, name: string, year: number): `0x${string}` {
  const registryKey = `${country}|${denomination}|${name}|${year}`;
  return keccak256(toHex(registryKey));
}
// Ejemplo: getCoinIdHash("Argentina", "1 Peso", "Serie 1", 1994) → "0x7f3a..."
```

### ✅ Verificar paso 5

```bash
# Solicitar claim (con sesión activa)
curl -X POST http://localhost:5173/api/rewards/request \
  -H "Content-Type: application/json" \
  -d '{"coinId": "uuid-de-la-moneda", "walletAddress": "0x..."}'

# Debe retornar { claimRequestId: "...", status: "pending" }
```

---

## Paso 6 — Integración Frontend: Provider wagmi + RainbowKit

**Qué:** instalar las dependencias onchain y wrapear la app para que los componentes puedan usar hooks de wallet.

### 6.1 Instalar dependencias

```bash
npm install wagmi @rainbow-me/rainbowkit viem --legacy-peer-deps
```

### 6.2 Crear `app/providers/WagmiProvider.tsx`

```typescript
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "Album de Monedas",
  projectId: "TU_WALLETCONNECT_PROJECT_ID", // del paso 0.3
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

### 6.3 Wrapear `app/root.tsx`

Envolver el `<Outlet />` (o el layout completo) con `<Providers>`.

### 6.4 Crear `app/lib/contracts/addresses.ts`

```typescript
export const REWARD_CLAIMER_ADDRESS = "0xDEF..." as const; // del paso 2
export const ALBUM_COIN_ADDRESS     = "0xABC..." as const;
```

### ✅ Verificar paso 6

Abrir `npm run dev` → el botón "Connect Wallet" debe aparecer en el header sin errores en consola.

---

## Paso 7 — Componente ClaimButton en CoinCard

**Qué:** botón dentro de cada `CoinCard` que refleja el estado del claim y permite ejecutar la TX onchain.

### Estados del botón

| Estado | Botón |
|--------|-------|
| `eligible` | "Reclamar Token" (activo) |
| `pending` | "⏳ En revisión" (desactivado) |
| `approved` | "Confirmar Recompensa 🎁 — expira en Xd" (activo) |
| `rejected` | "❌ Rechazado: [motivo]" (desactivado permanente) |
| `expired` | "Reclamar Token" (activo de nuevo) |
| `claimed` | "✅ Reclamado" (desactivado) |
| `claimed_by_other` | "🔒 Ya reclamada por otro usuario" (desactivado) |

### Implementación `app/components/ClaimButton.tsx`

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REWARD_CLAIMER_ABI } from "~/lib/contracts/abi";
import { REWARD_CLAIMER_ADDRESS } from "~/lib/contracts/addresses";

export function ClaimButton({ coinId, claimStatus }: {
  coinId: string;
  claimStatus: "eligible" | "pending" | "approved" | "rejected" | "claimed" | "expired";
}) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function handleClaim() {
    const res = await fetch("/api/rewards/sign", {
      method: "POST",
      body: JSON.stringify({ coinId }),
      headers: { "Content-Type": "application/json" }
    });
    const { signature, coinIdHash } = await res.json();

    writeContract({
      address: REWARD_CLAIMER_ADDRESS,
      abi: REWARD_CLAIMER_ABI,
      functionName: "claimReward",
      args: [coinIdHash as `0x${string}`, signature as `0x${string}`]
    });
  }

  if (isSuccess || claimStatus === "claimed") return <span>✅ Reclamado</span>;
  if (isConfirming)                           return <span>⏳ Confirmando TX...</span>;
  if (claimStatus === "pending")              return <button disabled>⏳ En revisión</button>;
  if (claimStatus === "rejected")             return <button disabled>❌ Rechazado</button>;
  if (claimStatus === "approved") {
    return <button onClick={handleClaim} disabled={isPending}>
      {isPending ? "Esperando wallet..." : "Confirmar Recompensa 🎁"}
    </button>;
  }

  // eligible o expired: botón para solicitar
  async function handleRequest() {
    await fetch("/api/rewards/request", {
      method: "POST",
      body: JSON.stringify({ coinId }),
      headers: { "Content-Type": "application/json" }
    });
    // revalidar la página para que el estado cambie a pending
  }

  return <button onClick={handleRequest}>Reclamar Token</button>;
}
```

### ABI necesario — `app/lib/contracts/abi.ts`

```typescript
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

### ✅ Verificar paso 7

Con contratos en testnet: ejecutar el flujo `eligible → request → pending`. El botón debe cambiar de estado correctamente tras recargar la página.

---

## Paso 8 — Panel Admin `/admin/rewards`

**Qué:** sección en la ruta `/admin` para que el admin vea los claims pendientes, compare la foto con los datos y apruebe o rechace.

### Datos que muestra cada fila

- Foto(s) de la moneda subida por el usuario
- País, denominación, nombre, año de la moneda
- Referencia en `COINS_BY_COUNTRY` (los datos del registro oficial)
- Wallet del usuario solicitante
- Fecha de solicitud

### Crear `app/components/AdminRewardsPanel.tsx`

El componente usa el loader de `/admin` para obtener la lista de `claim_requests` con `status = 'pending'` y llama a las actions `/admin/rewards/:id/approve` y `/admin/rewards/:id/reject`.

La action de rechazar debe pedir un `reject_reason` (campo de texto libre antes de confirmar).

La action de aprobar setea `expires_at = now + 7 días` y cambia `status = 'approved'`.

### ✅ Verificar paso 8

1. El admin ve la lista de pendientes en `/admin`
2. Aprueba un claim → el usuario en `/mycollection` ve el botón "Confirmar Recompensa 🎁"
3. El usuario rechazado ve el motivo y el botón permanece desactivado

---

## Paso 9 — Deploy en Base Mainnet

**Qué:** repetir el deploy del paso 2, ahora apuntando a mainnet. Requiere ETH real en la wallet del deployer (~$2–5 USD en gas).

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY
```

Después del deploy:
1. Actualizar `app/lib/contracts/addresses.ts` con las addresses de mainnet
2. Actualizar la address del contrato en la función `signClaim` del Worker
3. Redeploy del frontend: `npm run deploy`

---

## Paso 10 — Prueba del Flujo Completo en Mainnet

Checklist de aceptación final:

- [ ] Usuario sube una moneda que existe en `COINS_BY_COUNTRY` → `registry_match = TRUE`
- [ ] `CoinCard` muestra botón "Reclamar Token"
- [ ] Usuario conecta wallet (RainbowKit) y hace click → claim queda en `pending`
- [ ] Admin ve el claim en `/admin/rewards`, compara foto con datos, aprueba
- [ ] Usuario vuelve a `/mycollection` → botón "Confirmar Recompensa 🎁" con countdown
- [ ] Usuario confirma → wallet pide firma → TX ejecutada en Base Mainnet
- [ ] TX visible en [basescan.org](https://basescan.org) con estado "Success"
- [ ] `CoinCard` muestra "✅ Reclamado — TX: 0x..." (link a Basescan)
- [ ] Si otro usuario intenta la misma moneda → "🔒 Ya reclamada por otro usuario"
- [ ] Segundo claim del mismo usuario antes de 24h → contrato revierte con "Cooldown activo"

---

## Apéndice A — Diagrama de Estados

```
eligible → pending → approved → claimed
                   ↘ rejected   (permanente)
                   ↘ expired  → eligible (puede volver a solicitar)
```

## Apéndice B — Cooldown de 24 h

El límite vive **onchain**, no en D1. El usuario puede tener múltiples claims `approved` al mismo tiempo, pero solo puede ejecutar **1 TX cada 24 h**. El frontend consulta `lastClaimTime[wallet]` y muestra: _"Próximo claim disponible en: Xh Xm"_. Si intenta antes, el contrato revierte.

## Apéndice C — Seguridad y Anti-abuso

| Riesgo | Protección |
|--------|-----------|
| Foto falsa con datos reales | Revisión manual admin |
| Doble claim de misma moneda | `coinClaimed[coinId]` permanente onchain |
| Spam de requests | Un solo `pending`/`approved` activo por moneda |
| Farm con múltiples wallets | Cada `coinId` solo se reclama una vez (globalmente) |
| Firma robada / replay | EIP-712 incluye `wallet + coinId + chainId + verifyingContract` |
| Race condition | Backend verifica contrato justo antes de firmar |
| Expiración ignorada | Backend valida `expires_at` antes de firmar |
| Clave signer filtrada | Daño limitado: `coinClaimed` bloquea doble mint por moneda |

## Apéndice D — Propiedades del Token AC

| Propiedad | Valor |
|-----------|-------|
| Nombre | Album Coin |
| Símbolo | AC |
| Red | Base Mainnet (chain ID 8453) |
| Supply | Ilimitado (minteo por contribución verificada) |
| Minter | Solo el contrato RewardClaimer |
| Estándar | ERC-20 |
| Cantidad por claim | 1 AC (1e18 unidades mínimas) |
| Gas por TX | ~$0.01–0.05 USD (pagado por el usuario) |

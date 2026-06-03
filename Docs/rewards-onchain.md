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

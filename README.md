# CommissionChain PH

A Stellar-powered commission settlement platform that allows Philippine SMEs to pre-fund referral commissions, verify completed sales, and release transparent payouts to the rightful referral agent through Soroban smart contracts.

**Stellar Builder Program — Level 4 Submission**

## Problem

Freelance sales agents and referral partners in the Philippines often rely on spreadsheets, chat messages, and manual records to track referrals and commissions. This creates disputes over referral ownership, duplicate claims, delayed payouts, unclear commission status, fraudulent approvals, and uncertainty about whether approved commissions will actually be paid.

## Solution

CommissionChain PH connects off-chain sales verification with on-chain commission settlement. A business creates a commission campaign and pre-funds the required commission balance. An agent submits a referral, and the system records referral ownership. The business verifies whether the referred client completed the required sale. If the referral is valid and not disputed, Soroban validates the referral ownership, business authorization, payout status, and available escrow balance before releasing the pre-funded commission to the agent's Stellar wallet.

The system does not claim that a smart contract can independently know whether an off-chain sale happened. Instead, the authorized business acts as the verifier of the real-world sale, while Soroban controls the financial rules and prevents unauthorized or duplicate payouts.

## Features

- **Pre-Funded Escrow**: Businesses deposit commission funds upfront into Soroban contracts, guaranteeing payout availability
- **On-Chain Referral Ownership**: First valid agent to submit a referral receives ownership, recorded immutably on-chain
- **Business Sale Verification**: Authorized business confirms completed off-chain sales through the application
- **Dispute Protection**: Referrals can be disputed before payout, preventing fraudulent claims
- **Duplicate Claim Prevention**: Strict state machine prevents duplicate registrations and multiple payouts
- **Stellar Payouts**: Commission payments settle directly to agent Stellar wallets via USDC
- **Mobile-Responsive UI**: Production-quality interface accessible from any device
- **Real-Time Dashboard**: Track campaigns, referrals, and transactions with live status updates

## User Roles

| Role | Description |
|------|-------------|
| **Agent** | Submits referrals and claims commissions via Freighter wallet |
| **Business** | Creates campaigns, funds escrow, and verifies completed sales |
| **Admin** | Resolves disputes and manages platform governance |

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│   Supabase   │────▶│  PostgreSQL  │
│   Frontend   │     │   Backend    │     │   Database   │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │ Freighter          │ Service Role
       │ Wallet             │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│   Stellar    │◀───▶│   Soroban    │
│   Testnet    │     │   Contract   │
└──────────────┘     └──────────────┘
```

## Data Flow

```
Business creates campaign
        ↓
Business pre-funds commission escrow (Stellar TX via Freighter)
        ↓
Agent connects Freighter Wallet
        ↓
Agent submits referral (hashed client ID)
        ↓
Soroban records referral ownership
        ↓
Business verifies completed sale
        ↓
Referral may be disputed before payout
        ↓
Soroban validates payout conditions:
  - Referral ownership ✓
  - Business authorization ✓
  - Verification status ✓
  - Dispute status ✓
  - Available escrow ✓
  - Not previously paid ✓
        ↓
Pre-funded commission is released
        ↓
Agent receives Stellar asset (USDC)
        ↓
Transaction displayed in dashboard
```

## Smart Contract

The `CommissionEscrow` Soroban contract manages the on-chain state for campaigns and referrals.

### Functions

| Function | Auth | Description |
|----------|------|-------------|
| `create_campaign` | Business | Creates a new commission campaign |
| `fund_campaign` | Business | Deposits tokens to escrow, activates campaign |
| `submit_referral` | Agent | Registers referral ownership on-chain |
| `verify_referral` | Business | Confirms off-chain sale completion |
| `open_dispute` | Anyone | Disputes a referral, locking payout |
| `resolve_dispute` | Admin | Resolves dispute in favor of agent or business |
| `claim_commission` | Agent | Validates conditions and releases payout |
| `get_campaign` | — | Reads campaign state |
| `get_referral` | — | Reads referral state |
| `get_campaign_count` | — | Returns total campaigns |

### Contract Events

- `campaign_created`, `campaign_funded`
- `referral_submitted`, `referral_verified`
- `dispute_opened`, `dispute_resolved`
- `commission_paid`

## Escrow Model

```
Commission per sale: 100 USDC
Campaign capacity: 10 sales
Required escrow: 1,000 USDC

Business deposits 1,000 USDC → Campaign activates
Each verified referral: 100 USDC released to agent
Campaign escrow decreases accordingly
```

The campaign must not accept referrals if escrow is insufficient for the commission amount.

## Referral Ownership

- First valid agent to submit a referral receives ownership
- Referral is identified by a SHA-256 hashed client identifier
- Same client cannot be registered twice for the same campaign
- Ownership is recorded on-chain and cannot be silently reassigned

## Sale Verification

- The business that created the campaign is the authorized verifier
- Business confirms the completed sale through the application
- The verification record includes referral ID, status, timestamp, and authorized wallet
- Business approval is an attestation of the real-world sale

## Dispute Handling

- A referral can be disputed before payout
- Disputed referrals cannot be paid
- An admin resolves disputes with three outcomes:
  - **Favor agent**: Referral reconfirmed, payout eligible
  - **Reject**: Referral rejected, no payout
  - **Under review**: Remains disputed

## Duplicate Claim Prevention

Strict state machine: `PENDING → VERIFIED → PAID`

- Duplicate referral registration is rejected
- Multiple commission claims are rejected
- Paid referrals cannot be disputed
- All state transitions are validated on-chain

## Fraud Prevention

- Only the campaign's business wallet can approve referrals
- Business cannot approve referrals from other campaigns
- All actions recorded with wallet addresses and timestamps
- Insufficient escrow prevents payout even if verified
- Disputed referrals are locked until resolved

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | Freighter API v6 |
| Backend | Supabase (PostgreSQL, Auth, Realtime) |
| Blockchain | Stellar Testnet, Soroban SDK v25 |
| Token | USDC on Stellar Testnet |
| Package Manager | Bun |

## Project Structure

```
project/
├── contract/                         # Soroban smart contract
│   ├── Cargo.toml                    # Workspace root
│   └── contracts/contract/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs                # Contract logic
│           └── test.rs               # Comprehensive tests
├── client/                           # Next.js frontend
│   ├── src/
│   │   ├── app/                      # Pages and API routes
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── layout.tsx            # Root layout
│   │   │   ├── dashboard/page.tsx    # Dashboard
│   │   │   ├── campaigns/            # Campaign pages
│   │   │   ├── referrals/page.tsx    # Referrals
│   │   │   ├── commissions/page.tsx  # Transaction history
│   │   │   ├── feedback/page.tsx     # User feedback
│   │   │   └── api/                  # API routes
│   │   ├── components/               # UI components
│   │   ├── hooks/                    # React hooks (wallet, contract, toast)
│   │   └── lib/                      # Libraries (supabase, stellar, freighter, analytics)
│   ├── supabase/migrations/          # Database migrations
│   ├── package.json
│   └── .env.example
└── README.md
```

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Bun](https://bun.sh/) 1.0+
- [Rust](https://rustup.rs/) (for smart contract)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools) (for contract deployment)
- [Freighter Browser Extension](https://freighter.app/) (for wallet)
- [Supabase Account](https://supabase.com/) (for backend)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_STELLAR_NETWORK=Test SDF Network ; September 2015
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor
3. Run the migration file at `supabase/migrations/001_initial_schema.sql`
4. Copy your project URL and keys to `.env.local`
5. Enable RLS policies as defined in the migration

## Local Development

```bash
# Install dependencies
cd client && bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
bun run dev
```

## Smart Contract Build

```bash
cd contract
cargo test                    # Run tests
stellar contract build        # Build WASM
```

## Smart Contract Tests

```bash
cd contract
cargo test
```

Tests cover:
1. Happy path (create → fund → submit → verify → claim)
2. Unauthorized business approval
3. Duplicate referral registration
4. Disputed referral cannot be paid
5. Duplicate payout prevention
6. Insufficient escrow
7. Dispute resolution (favor agent / reject)
8. Campaign counter

## Testnet Deployment

```bash
# 1. Generate a key pair
stellar keys generate deployer --network testnet --fund

# 2. Build the contract
cd contract && stellar contract build

# 3. Deploy
stellar contract deploy \
  --wasm target/wasm32v1-none/release/commission_escrow.wasm \
  --source-account deployer \
  --network testnet

# 4. Record the contract address (C...) and add to .env.local
```

## Frontend Deployment

```bash
# Deploy to Vercel
cd client
vercel --prod

# Or build and deploy manually
bun run build
bun run start
```

## Monitoring and Analytics

### Tracked Events
- `wallet_connected` — User connected Freighter
- `wallet_authentication_success` — Wallet verified
- `wallet_authentication_failed` — Auth failure
- `campaign_created` — New campaign created
- `campaign_funded` — Escrow funded
- `referral_submitted` — Agent submitted referral
- `referral_verified` — Business verified sale
- `dispute_opened` / `dispute_resolved` — Dispute lifecycle
- `commission_paid` — Commission released
- `feedback_submitted` — User feedback

### How to Inspect
- Supabase Table Editor → `analytics_events` table
- Filter by `event_name` or `wallet_address`
- SQL: `SELECT event_name, COUNT(*) FROM analytics_events GROUP BY event_name`

## User Onboarding

1. User visits the production application
2. User connects a Freighter Wallet
3. User signs/verifies their wallet (nonce-based auth)
4. User performs at least one Stellar Testnet wallet interaction
5. User participates in the MVP flow (submit referral, fund campaign, etc.)
6. Interaction evidence recorded in `analytics_events` and `transactions` tables

## Feedback Collection

Implemented via `/feedback` page. Collects:
- Star rating (1-5)
- Category (wallet onboarding, referral submission, business verification, commission tracking, mobile usability, general)
- Free-text feedback

Stored in `feedback` table with user association.

## Demo Flow

1. Business connects wallet → Dashboard shows empty state
2. Business creates campaign → Enters title, commission amount, max referrals
3. Business funds escrow → Campaign becomes active
4. Agent connects wallet → Switches to agent view
5. Agent submits referral → Enters client identifier, selects campaign
6. Business views referral → Pending status shown
7. Business verifies sale → Status changes to verified
8. Agent claims commission → Transaction submitted via Freighter
9. Stellar TX confirmed → Status changes to paid, hash displayed
10. Transaction history shows all activity

## Contract Deployment Address

> _Deploy on Testnet and paste address here_

```
C______________________________
```

## Demo Video Link

> _Record and paste video link here_

## Screenshots Checklist

- [ ] Landing page (desktop)
- [ ] Landing page (mobile)
- [ ] Wallet connection flow
- [ ] Dashboard (business view)
- [ ] Dashboard (agent view)
- [ ] Campaign creation form
- [ ] Campaign list with escrow status
- [ ] Referral submission form
- [ ] Referral list with status badges
- [ ] Business verification flow
- [ ] Commission claim flow
- [ ] Transaction history table
- [ ] Dispute workflow
- [ ] Feedback form
- [ ] Mobile responsive views

## Level 4 Submission Checklist

- [x] Production-ready frontend (Next.js + TypeScript + Tailwind)
- [x] Soroban smart contract with comprehensive tests (9/9 passing)
- [x] Supabase PostgreSQL with migrations, RLS, indexes
- [x] Wallet-based authentication (Freighter + nonce verification)
- [x] Complete MVP workflow (create → fund → submit → verify → claim → paid)
- [x] Escrow model with balance validation
- [x] Referral ownership with duplicate prevention
- [x] Dispute handling with admin resolution
- [x] Transaction tracking and history
- [x] Analytics event tracking
- [x] User feedback collection
- [x] Mobile-responsive UI
- [ ] Deploy to Vercel + Testnet
- [ ] Onboard 10+ real users
- [ ] Record demo video
- [ ] Create public GitHub repository
- [ ] 15+ meaningful commits

## Roadmap

### Level 4 MVP
Complete the pre-funded commission workflow with Stellar Testnet deployment.

### Future User Acquisition
- Independent sales agents
- Real estate referral agents
- Insurance agents
- Recruitment agencies
- Digital marketing agencies
- Philippine SMEs

### Mainnet Vision
- Stellar anchor integrations for PHP cash-out
- Cross-border commission payments
- Multi-currency settlement
- Independent sale verification providers
- Multi-signature business approval
- Dispute arbitration with reputation scores
- CRM integrations
- Referral marketplace
- Recurring commission payments

## License

MIT

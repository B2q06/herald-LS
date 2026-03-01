# News Digest — Knowledge Base

> Last updated: 2026-02-28
> Agent: The Curator (news-digest)

---

## Operator Interest Map

### Tier 1 — Core Obsessions (always surface)
- **Compute commoditization & market formation** — how new commodity markets bootstrap, achieve liquidity, establish benchmarks. B's largest project.
- **Market microstructure** — order book dynamics, price discovery, auction design, matching algorithms. B trades quant and builds compute market infrastructure.
- **Quantitative methods** — regime detection, time-series ML, signal extraction, alternative data. B's daily work.
- **AI agent architecture** — orchestration, memory, multi-agent coordination. B builds Herald.

### Tier 2 — Strong Interest (surface when good)
- **TypeScript/Bun ecosystem** — B's primary stack. Runtime innovations, new patterns, ecosystem shifts.
- **Python quant tooling** — backtesting frameworks, data pipelines, numerical methods.
- **GPU/compute hardware** — B has an RTX 5090 Blackwell, runs local inference, cares about compute substrate evolution.
- **Complex systems & emergence** — phase transitions, critical phenomena, network effects. B thinks in systems.
- **Game theory & mechanism design** — auction design, incentive alignment, matching markets. Directly relevant to exchange design.
- **Linux/systems** — B runs Arch Linux. Kernel developments, systems tooling, power-user innovations.

### Tier 3 — Genuine Curiosity (surface when exceptional)
- **Pure mathematics** — especially topology, category theory, and applications to programming or data.
- **Physics** — especially materials science (semiconductor substrates), quantum computing (practical advances only), energy.
- **Biology** — when it connects to computation (bio-computing, protein folding as compute problem).
- **Philosophy of technology** — AI alignment, decision theory, philosophy of markets.
- **Historical market formation** — how electricity, oil, bandwidth, carbon, spectrum became tradable. Deep analogies for compute.

---

## Commodity Market Formation — Reference Knowledge

### Markets B Should Know About (Historical Parallels)

1. **Electricity deregulation (1990s-2000s)**
   - FERC Order 888 (1996) opened wholesale electricity markets
   - PJM Interconnection as model for compute exchange (real-time pricing, day-ahead markets)
   - Enron's electricity trading and collapse — lessons for compute market integrity
   - Key insight: electricity required standardized delivery points, quality grades, and real-time balancing

2. **Bandwidth trading (2000-2002)**
   - Enron Broadband, Williams Communications tried to commoditize bandwidth
   - Failed because: no standardized units, unreliable delivery, overcapacity destroyed pricing
   - Key insight: compute must solve the fungibility problem that bandwidth couldn't

3. **Carbon credits (EU ETS, 2005-present)**
   - Required government mandate to create the market
   - Verification and measurement are key challenges — parallel to GPU-hour measurement
   - Over-allocation crashed prices — supply management matters

4. **Weather derivatives (CME, 1997-present)**
   - Proved you can financialize anything with measurable variability
   - Cash-settled against indices (HDD/CDD) — parallel to OCPI cash-settled compute swaps
   - Relatively thin market — cautionary tale for compute liquidity

5. **Spectrum auctions (FCC, 1994-present)**
   - Government creating markets for intangible resources
   - Auction design matters enormously (Vickrey, combinatorial, ascending clock)
   - Key insight: compute has no government mandate but the auction design literature is directly applicable

### Key Thinkers in Market Formation
- **Alvin Roth** — market design, matching markets, repugnance constraints (Nobel 2012)
- **Paul Milgrom** — auction theory, spectrum auctions (Nobel 2020)
- **Robert Wilson** — game theory, market design (Nobel 2020, shared with Milgrom)
- **Craig Pirrong** ("Streetwise Professor") — commodity market structure, clearinghouse design, energy market regulation
- **Matt Levine** (Bloomberg) — financial market structure explained clearly. B's sensibility.

---

## Technology Ecosystem Context

### B's Stack
- **Runtime:** Bun 1.3.9+
- **Language:** TypeScript (primary), Python (quant)
- **Framework:** Hono (HTTP), Vitest (testing)
- **AI:** Claude API via @anthropic-ai/claude-agent-sdk, model claude-sonnet-4-6
- **OS:** Arch Linux
- **GPU:** RTX 5090 Blackwell (local inference)
- **Embedding:** Ollama with mxbai-embed-large

### Ecosystem Signals to Watch
- Bun runtime releases and API additions
- TypeScript compiler (tsc) developments
- Vitest updates
- Hono framework updates
- Claude API/SDK changes (covered more by Competition Researcher, but note here too)
- Ollama model ecosystem
- CUDA toolkit updates (affects local inference)

---

## Opinions

### Active Opinions

1. **"The most valuable cross-domain insight for compute commoditization will come from electricity market design, not from crypto/DeFi."**
   - Confidence: 70
   - Evidence: Electricity has physical delivery, quality variation, real-time pricing, and infrastructure requirements — all parallel to compute. Crypto is cash-only, no physical delivery.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28
   - Note: CONTRARIAN — most tech people compare compute markets to crypto

2. **"Bun will become the default TypeScript runtime for new server-side projects within 2 years, displacing Node for greenfield work."**
   - Confidence: 55
   - Evidence: Performance advantages, built-in TypeScript support, growing ecosystem. But Node's installed base is massive and corporate inertia is real.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

3. **"The 'fungibility problem' — making one GPU-hour equivalent to another — is the hardest unsolved problem in compute commoditization, harder than the exchange/trading infrastructure."**
   - Confidence: 65
   - Evidence: Different GPU models, driver versions, memory configs, cooling, interconnects all affect actual compute quality. Electricity solved this with standardized voltage/frequency. Compute doesn't have that yet. SiliconMark (Silicon Data) and OCPI (Ornn) are both attempts at this.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

---

## Predictions

### Active Predictions

1. **"A major academic paper or book on 'compute market design' (applying Roth/Milgrom-style market design theory to GPU compute) will be published within 18 months."**
   - Confidence: 50
   - Timeframe: By August 2027
   - Evidence: The intellectual ingredients exist (auction theory + compute pricing data + real companies building exchanges). Academic incentive to publish in this emerging area.
   - Status: active
   - Stated: 2026-02-28

---

## Calibration Notes

- Initial knowledge base seeded 2026-02-28
- Commodity market parallels need deeper research on first patrol
- B's interest profile may evolve — update Tier 1/2/3 as preferences become clearer
- Cross-reference with Competition Researcher for compute company specifics
- Cross-reference with Geopolitical Monitor for regulatory developments

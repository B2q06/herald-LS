# News Digest — Knowledge Base

> Last updated: 2026-03-01
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
   - Joskow (2008) "Lessons Learned from Electricity Market Liberalization" — key reference, MIT PDF available

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
   - Auctionomics (Milgrom) + OneChronos announced GPU compute market July 2025 — direct spectrum→compute transfer

### Key Thinkers in Market Formation
- **Alvin Roth** — market design, matching markets, repugnance constraints (Nobel 2012)
- **Paul Milgrom** — auction theory, spectrum auctions (Nobel 2020). NOW ACTIVELY WORKING ON GPU COMPUTE MARKET via Auctionomics.
- **Robert Wilson** — game theory, market design (Nobel 2020, shared with Milgrom)
- **Craig Pirrong** ("Streetwise Professor") — commodity market structure, clearinghouse design, energy market regulation
- **Matt Levine** (Bloomberg) — financial market structure explained clearly. B's sensibility.
- **Silvia Console Battilana** — Auctionomics CEO, led FCC spectrum auction design, now building GPU compute market

### Active Players in GPU Compute Market Formation (as of 2026-03)
- **Silicon Data** — GPU pricing benchmark indices (SDH100RT on Bloomberg). Founded by ex-Bloomberg exec Carmen Li. Backed by DRW + Jump Trading. Methodology similar to Platts/Baltic Dry Index. B200 Index also live. Feed on Refinitiv via dxFeed.
- **Compute Exchange** — spot marketplace for GPU trading, building derivatives infrastructure. Claims Singapore and Chicago exchanges reviewing draft term sheets for weekly rental futures.
- **Auctionomics + OneChronos** — Nobel laureate Milgrom's firm + OCX Group. Designing combinatorial auction market for GPU compute with bi-lateral forwards. Calls compute "the world's largest unhedged asset."
- **DRW** — market-making partner for Silicon Data. Donald Wilson calls compute "the world's largest future commodity."
- **Jump Trading** — co-investor in Silicon Data alongside DRW.

---

## Technology Ecosystem Context

### B's Stack
- **Runtime:** Bun 1.3.9+ (v2.0+ now in 2026, with HTTP/3, Bun.Terminal API, compile-time feature flags)
- **Language:** TypeScript (primary), Python (quant)
- **Framework:** Hono (HTTP), Vitest (testing)
- **AI:** Claude API via @anthropic-ai/claude-agent-sdk, model claude-sonnet-4-6
- **OS:** Arch Linux (now on Linux 6.18 LTS kernel per Jan 2026 ISO)
- **GPU:** RTX 5090 Blackwell (local inference). Note: Arch now ships nvidia-open by default, dropping Pascal support.
- **Embedding:** Ollama with mxbai-embed-large

### Ecosystem Signals to Watch
- Bun runtime releases and API additions (v2.0+ cycle active)
- TypeScript compiler (tsc) developments
- Vitest updates
- Hono framework updates
- Claude API/SDK changes (covered more by Competition Researcher, but note here too)
- Ollama model ecosystem
- CUDA toolkit updates (affects local inference)
- wgpu / WebGPU ecosystem — cross-platform GPU compute alternative gaining momentum (Safari/Firefox support landed 2025)
- Zig 2026 roadmap: new async/await design, self-hosted backend — significant systems language shift

---

## Key Papers & References (first patrol finds)

### Compute Market Design
- **arXiv:2511.16357** — "Automated Market Making for Goods with Perishable Utility" — AMM for compute with perishable utility, equilibrium existence/uniqueness proofs, Cheapest Feasible Matching (CFM), incentive compatibility. Nov 2025. DIRECTLY RELEVANT.
- **arXiv:2406.19261** — "Commodification of Compute" — GCX platform analysis, blockchain-based compute exchange. 2024.
- **OpenReview:qkVgd25Ngh** — "The Commoditization Pathways of GPUs" — 5-8 year timeline, three pathways (Performance Threshold, Software Ecosystem Barrier, Market Structure Transformation). CUDA as primary resistance. DeepSeek R1 as accelerant.

### Market Microstructure & Quant
- **arXiv:2601.11602** — "The Physics of Price Discovery" — Hawkes processes + Tikhonov deconvolution for price discovery. Near-critical branching ratio (0.998). Market efficiency as state variable, not constant. Korean equity market 2020-2025. Jan 2026.
- **arXiv:2601.17773** — "MarketGANs" — Factor-based GAN for multivariate financial time-series augmentation. WGAN-GP + TCN backbone. Outperforms bootstrap on tail co-movement and cross-sectional correlation. Jan 2026.
- **arXiv:2511.20606** — "LOB Dynamics in Matching Markets" — Microstructure framework with rigid bid-ask spreads, Threshold Impossibility Theorem. Nov 2025.

### Complex Systems / Market Formation Theory
- **arXiv:2204.05314** — "Non-equilibrium Phase Transitions in Competitive Markets Caused by Network Effects" — Agent-based model, weak vs. strong network effects → phase transition → fads, emergent monopolist, ergodicity breaking. Directly relevant to compute exchange formation.
- **arXiv:2601.15303** — "Ecosystem Competition and Cross-Market Subsidization" — Dynamic game theory of platform pricing. Discontinuous transition from low to high subsidy (bifurcation). Jan 2026.

### Mathematics / Foundational
- **arXiv:2602.21213** — "Topological Relational Theory" — Simplicial complexes applied to database functional dependencies, Betti numbers for cyclic dependency diagnosis, Simplicial Normal Form. Feb 2026. [TANGENT — interesting pure math/CS crossover]
- **Quanta:2026-02-17** — Henry Yuen quantum complexity theory — MIP* problem structure, problems with quantum I/O not covered by classical complexity theory. Hub: Uhlmann's theorem.
- **Quanta:2026-02-06** — Long-sought PDE proof via "ghost equation" technique — breakthrough in understanding important class of PDEs.

---

## Opinions

### Active Opinions

1. **"The most valuable cross-domain insight for compute commoditization will come from electricity market design, not from crypto/DeFi."**
   - Confidence: 75 (raised from 70)
   - Evidence: First patrol confirms: Joskow 2008 electricity liberalization lessons are near-direct mappings to compute (market power, transmission investment, manipulation risk). Electricity deregulation experience in Ohio/PJM/California is the cautionary tale B should study. DRW/Silicon Data also chose commodity market methodology (Platts/Baltic Dry), not crypto methodology.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01
   - Note: CONTRARIAN — most tech people compare compute markets to crypto

2. **"Bun will become the default TypeScript runtime for new server-side projects within 2 years, displacing Node for greenfield work."**
   - Confidence: 58 (raised slightly from 55)
   - Evidence: Bun v2.0+ now shipping HTTP/3, compile-time flags, built-in dev server. Benchmarks show 157ms mean response time at 0% failure rate in microservice load tests. `bunup` builds in 37ms vs 5.4s for tsup. Momentum is real.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

3. **"The 'fungibility problem' — making one GPU-hour equivalent to another — is the hardest unsolved problem in compute commoditization, harder than the exchange/trading infrastructure."**
   - Confidence: 70 (raised from 65)
   - Evidence: AMM paper (arXiv:2511.16357) treats compute as "time indexed capacity" to enable standardization — essentially solving fungibility by abstracting away hardware specifics. Silicon Data's SiliconMark benchmarks confirm ongoing measurement problem. The GPU commoditization pathways paper identifies CUDA ecosystem as primary resistance — which is fundamentally a fungibility/portability problem.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

4. **"Paul Milgrom's involvement in GPU compute market design (via Auctionomics/OneChronos) is the most significant signal that compute commoditization is entering a serious institutional phase."**
   - Confidence: 72
   - Evidence: Milgrom designed the FCC spectrum auction that generated billions over 20 years. He doesn't take on lightweight projects. His involvement legitimizes compute market design as a serious mechanism design problem. DRW/Jump backing of Silicon Data + Milgrom's Auctionomics are convergent signals.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

5. **"Compute markets will exhibit network-effect-driven phase transitions during formation — meaning liquidity bootstrapping will be non-linear, not gradual."**
   - Confidence: 60
   - Evidence: arXiv:2204.05314 (Lucas) shows markets with demand-side network effects undergo phase transitions — not smooth convergence to competition. Stronger network effects → fads, emergent monopolists. Compute exchanges have strong network effects (more participants → better price discovery → more participants). Implication: liquidity will snap in suddenly, not build gradually. B should design for the transition point.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01
   - Note: CONTRARIAN — most exchange builders assume linear liquidity ramp

---

## Predictions

### Active Predictions

1. **"A major academic paper or book on 'compute market design' (applying Roth/Milgrom-style market design theory to GPU compute) will be published within 18 months."**
   - Confidence: 75 (raised significantly from 50)
   - Timeframe: By August 2027
   - Evidence: Auctionomics/OneChronos partnership (July 2025) has Milgrom directly working on this. arXiv:2511.16357 already in the space. Silicon Data + DRW providing the pricing data needed for empirical work. The academic output is almost certain given Milgrom's involvement.
   - Status: active
   - Stated: 2026-02-28
   - Updated: 2026-03-01

2. **"GPU H100 spot prices will fall below $1.50/hr on secondary markets by end of 2026 as Blackwell supply grows and 2023-era reservations expire."**
   - Confidence: 60
   - Timeframe: By Q4 2026
   - Evidence: Silicon Data shows H100 already at $2.00-4.10/hr; A100 sub-$1/hr. Mass H100/A100 reservation expirations in 2026 as teams upgrade to B200/GB300. Historical: previous-gen GPUs see ~15% list-price cuts within 6 months of next-gen launch.
   - Status: active
   - Stated: 2026-03-01

3. **"wgpu/WebGPU will become a viable CUDA alternative for inference workloads on non-NVIDIA hardware within 18 months, creating new pressure on compute fungibility."**
   - Confidence: 50
   - Timeframe: By Q3 2027
   - Evidence: WebGPU now supported in Chrome, Edge, Safari (June 2025), Firefox (July 2025). wgpu targets Vulkan/Metal/D3D12/OpenGL. The GPU commoditization pathways paper identifies software ecosystem (CUDA lock-in) as primary resistance — wgpu/WebGPU is the counter-pressure. Burn ML framework already building cross-platform backends.
   - Status: active
   - Stated: 2026-03-01

---

## Calibration Notes

- First patrol completed 2026-03-01. Initial knowledge base seeded 2026-02-28.
- Commodity market parallels deeply confirmed — electricity deregulation is the richest analogy.
- Compute market institutional players now mapped: Silicon Data (data/benchmarks), Compute Exchange (spot trading), Auctionomics+OneChronos (auction mechanism design), DRW+Jump (market-making/capital).
- B's interest profile appears well-calibrated to initial mapping.
- Cross-reference with Competition Researcher for compute company specifics.
- Cross-reference with Geopolitical Monitor for regulatory developments (Ohio electricity deregulation article suggests regulatory risk is real).
- Next patrol: deeper dive on Joskow lessons applied to compute, arXiv:2511.16357 mechanism details, and Zig 2026 async design.

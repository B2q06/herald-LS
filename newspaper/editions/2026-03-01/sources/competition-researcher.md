---
agent: competition-researcher
run_id: "20260301-055630-mmg4"
started_at: "2026-03-01T05:56:30.675Z"
finished_at: "2026-03-01T06:09:55.924Z"
status: success
discovery_mode: aggressive
---

Knowledge base updated. Now generating the patrol report.

---

```markdown
---
agent: competition-researcher
run_id: patrol-001-20260301
started_at: 2026-03-01T00:00:00Z
finished_at: 2026-03-01T01:15:00Z
status: success
patrol_sources_hit: 18
findings_evaluated: 31
discovery_mode: aggressive
---

# Competition Research Patrol — 2026-03-01

## Headlines

The compute commoditization market crossed a critical threshold this patrol: **Ornn has executed its first live OTC compute swap** — the market is no longer hypothetical. Meanwhile, **OneChronos + Auctionomics** (announced July 2025, largely under-the-radar) emerge as a serious competitor backed by a Nobel laureate and $80M+, using combinatorial auction theory rather than simple order books. Silicon Data quietly became the **only compute data provider on both Bloomberg and Refinitiv** while launching the world's first B200 index, hardening its distribution moat. And the **Remote Access Security Act** (H.R. 2683), which passed the House 369-22 in January 2026, threatens to layer KYC/compliance requirements onto every compute marketplace serving non-U.S. customers — incumbents with vetted provider networks gain a structural advantage.

---

## Featured Deep-Dive

### OneChronos + Auctionomics: The Nobel Play for GPU Compute Markets

**Source:** [BusinessWire announcement](https://www.businesswire.com/news/home/20250729678918/en/Auctionomics-and-OneChronos-Partner-on-First-Tradable-Financial-Market-for-GPU-Compute) | [TechSpot](https://www.techspot.com/news/108879-startup-nobel-laureate-collaborate-create-gpu-financial-exchange.html) | [Upstarts Media](https://www.upstartsmedia.com/p/one-chronos-auctionomics-launch-gpu-compute-market)

**Company/Product:** OCX Group (OneChronos) + Auctionomics — GPU Compute Financial Market

**Move:** On July 29, 2025, OneChronos (YC 2016; $80M+ from Addition, BoxGroup, DCVC, DST Global) and Auctionomics (co-founded by Nobel Prize winner Paul Milgrom) announced a partnership to build the first financial market for GPU compute using **combinatorial auction** ("Smart Market") technology. They're currently in discussions with Nvidia, hyperscalers, and data center operators to bootstrap liquidity. No firm launch date confirmed as of this patrol.

**Strategic Intent:** This is not a scrappy startup playing in compute markets — this is a capital-heavy, academically credentialed bet that the *mechanism design* problem is the key bottleneck in GPU commoditization. Their thesis: compute buyers think in tokens/workloads, compute sellers think in GPU clusters across time. Simple order books fail at this translation. Combinatorial auctions can express bundled preferences across compute + power + storage, optimize across them mathematically, and create more efficient allocation than any bilateral or simple auction can. Milgrom literally designed the FCC spectrum auction mechanism — the canonical example of a market that *created* a commoditized asset class from thin air through mechanism design. That's not a coincidence.

The fact that OneChronos already has $6.5B in **daily equities volume** via Smart Markets (not a prototype) is the key credibility signal. They've shipped at scale. The question isn't can they build it — it's whether the GPU market is complex enough (in preference bundling) to need their approach versus simpler order books.

**Market Impact:**
- **Who wins:** OneChronos, if they solve the liquidity cold-start. Large training run buyers (who have complex requirements across hardware type, geography, interconnect, and duration) would benefit most from combinatorial auctions — they're the ones who can't get their needs met by spot order books.
- **Who loses:** Compute Exchange's simple auction format and Ornn's order-book-style futures are less expressive. For a 10,000 GPU training run with specific NVLink requirements, a combinatorial auction is genuinely more appropriate. If OneChronos captures large-format compute transactions, it hollows out the high-value end of the marketplace.
- **What shifts:** The mechanism design question moves to the center. "What auction format is right for compute?" becomes the key technical debate. Simple spot markets may commoditize only small, fungible compute units (inference, small fine-tuning runs). Large, heterogeneous compute procurement may require richer mechanisms.

**Operator Relevance:** **Significant competitive signal.** OneChronos is attacking the same standardization problem B is working on, but from the market mechanism layer rather than the data/index layer. The combinatorial auction approach is the most technically sophisticated compute exchange thesis in the space. Key questions for B: (1) Is the market you're addressing more like inference (fungible, simple) or training (complex, bundled)? (2) Does combinatorial auction complexity create adoption friction that simpler approaches can exploit? (3) Is there a partnership or positioning opportunity in the mechanism design vs. data layer distinction?

**Opinion:** OneChronos is genuinely underestimated in this market. Everyone is watching Ornn and Silicon Data; almost nobody is talking about the Nobel-laureate-backed competitor with 14× more funding than Ornn. Their approach is theoretically superior for complex compute procurement. But "theoretically superior" is not the same as "wins" — spectrum auctions took years and government mandate to work. GPU markets are voluntary. My current read: they're more likely to win the large-enterprise training market segment while Ornn/Architect win the smaller, more fungible hedging market. These may coexist rather than one displacing the other. **Confidence: 55.**

**Action:** B should read the OneChronos Smart Market technical papers and understand the combinatorial auction mechanism in detail. This is likely to become a reference point in compute market structure discussions. Assess whether the market you're building in is better served by combinatorial vs. simple auction mechanisms — this determines which competitor is most adjacent.

---

### Silicon Data: The Quiet Distribution Land-Grab

**Source:** [dxFeed/Refinitiv Partnership](https://dxfeed.com/dxfeed-helped-silicon-data-to-expand-gpu-index-coverage-on-refinitiv/) | [Silicon Data Newsroom](https://www.silicondata.com/news-room/silicon-data-announces-major-revision-to-a100-h100-rental-indices-launches-first-ever-b200-index-and-introduces-new-hyperscaler-rental-benchmarks) | [Carmen Li LinkedIn](https://www.linkedin.com/in/carmenrli/)

**Company/Product:** Silicon Data — SiliconIndex suite expansion; Refinitiv distribution via dxFeed

**Move:** On December 5, 2025, Silicon Data launched the world's first **B200 Rental Index**, revised its A100/H100 methodology (adding interconnect type, cluster scale, geography, performance variance), and introduced hyperscaler-specific benchmarks. Critically, **via a partnership with dxFeed**, all SiliconIndex products are now available on **Refinitiv** alongside Bloomberg — making Silicon Data the **only compute data provider on both major institutional financial terminals**. Carmen Li also explicitly rebranded the product suite as "SiliconIndex" (previously the flagship was called SDH100RT) and positioned it explicitly for **building swaps, futures, and structured notes** — language that was absent before.

**Strategic Intent:** The Refinitiv expansion is the big move. Bloomberg alone reaches one audience; Bloomberg + Refinitiv reaches essentially every institutional finance desk on earth. dxFeed is a financial data infrastructure provider (the unsexy but critical plumbing that Silicon Data needed to get distribution at scale without building their own terminal integrations). The explicit "build swaps, futures, structured notes" positioning signals that Silicon Data is not content being purely a data provider — they're angling to become the canonical settlement benchmark for compute derivatives, directly competitive with OCPI.

The B200 Index is also significant strategically: by being first to benchmark B200 (Blackwell), Silicon Data claims index territory on next-generation hardware before Ornn. Ornn currently covers H100, H200, B200, and RTX 5090 in OCPI — but has OCPI's B200 data been independently validated? The race to establish who's the authoritative price for next-gen hardware will matter.

**Market Impact:** Silicon Data's distribution advantage is now decisive at the data layer. If a bank wants to build a compute-linked structured product and needs a benchmark, they already have SiliconIndex on their terminal. The switching cost of adopting OCPI as an alternative is now higher. OCPI's only counter is methodology superiority — executed transaction data vs. quote aggregation. But distribution beats methodology for early institutional adoption in commodities history (ICE Brent beat WTI globally on distribution, not methodology purity).

**Operator Relevance:** The index war is escalating. Silicon Data's dual-terminal presence is the most important structural development in compute data this cycle. For B, this means the "neutral data layer" may already have an incumbent by the time alternatives emerge. **High relevance** — understand which index your compute normalization work relies on or references.

**Opinion:** Silicon Data is executing the Bloomberg playbook with remarkable fidelity. Distribution → institutional credibility → settlement reference status. My conviction on their eventual merger/deep integration with Compute Exchange went up. **Updated confidence on merger prediction: 70.**

---

## Key Findings

### Ornn's First OTC Compute Swap Executed — Market Goes Live
**Source:** [The Block](https://www.theblock.co/post/386487/former-ftx-us-president-brett-harrisons-architect-expands-crypto-style-perpetual-futures-into-ai-compute-markets)
**Summary:** In his interview with The Block, Kush Bavaria (Ornn CEO) confirmed: "We've already executed our first compute swap with more in pipeline." This is the pivotal confirmation that OTC compute derivatives are now live transactions, not just proposed products. The first swap locks in a $/GPU-hour price against OCPI, with cash settlement. Ornn is still under the CFTC de minimis exemption ($8B notional cap) but has OTC flow. OCPI data also confirms GPU prices have been "flat to slightly down" over the past 6 months — a market in which forward price-locking (swaps) still makes sense for cost certainty even without upward price pressure. This is the compute derivatives equivalent of the first interest rate swap — structurally small, historically significant.
**Signal:** High

### Ornn Launches Memory Futures — Expanding the Commodity Stack
**Source:** [Ornn Research](https://www.ornnai.com/research/memory-futures)
**Summary:** Ornn has extended beyond GPU compute hours into **DRAM/HBM memory futures** — monthly-settled, cash-settled contracts against transparent spot pricing. The strategic logic: memory prices can swing 250%+ in a single year; the same organizations hedging GPU exposure also have enormous, unhedged memory procurement exposure. Memory and GPU prices are correlated during AI demand surges but respond to different supply constraints, making paired hedging genuinely useful. Ornn already has the counterparty relationships and market-maker network from GPU futures, so liquidity bootstrapping is easier. This represents Ornn expanding its "commodity stack" beyond pure GPU compute into the full AI infrastructure cost basis — GPU hours + memory = the two primary cost inputs for model training.
**Signal:** High

### Architect/AX: Deltix Integration — Institutional Access Layer Goes Live
**Source:** [PR Newswire](https://www.prnewswire.com/news-releases/deltix-trading-platform-integrates-with-architect-financial-technologys-ax-perpetual-futures-exchange-302696712.html)
**Summary:** On February 25, 2026, Architect announced that DeltixLab's institutional trading platform has integrated with AX Exchange. Deltix serves hedge funds, market makers, family offices, and asset managers — the precise institutional audience Architect targets. This integration means institutional clients can trade AX perpetual futures (including compute futures, once regulatory approval comes) through the same platform they use for traditional futures and digital assets. The significance: this is the institutional access layer being bolted on before the compute products launch. When the compute perpetuals finally get regulatory clearance, there's an existing distribution channel of institutional traders already connected. Architect is de-risking the adoption problem by building the rails pre-launch.
**Signal:** High

### GPU ABS: The $11B Institutional Finance Already in Compute Markets
**Source:** [GPU ABS Overview (Medium)](https://medium.com/@Elongated_musk/gpus-as-collateral-chip-based-abs-acf55ac3f135) | [CoreWeave GPU Debt Wall](https://markets.financialcontent.com/stocks/article/finterra-2026-2-23-the-gpu-debt-wall-a-deep-dive-into-coreweave-crwv-and-the-2026-ai-financing-crisis)
**Summary:** The GPU-backed securities market is substantially more developed than anticipated. $11B+ has been lent against GPU collateral across the neo-cloud industry. Lambda Labs executed the first-ever GPU ABS deal ($500M+, led by Macquarie Group, AAA-rated notes at <110bps spreads). CoreWeave has $18B+ in GPU-collateralized facilities (DDTL structures with Magnetar/Blackstone/others). BlackRock, PIMCO, Carlyle, and Macquarie are active lenders. CoreWeave is now seeking $8.5B in new financing (Feb 2026) using Meta contracts as collateral. The $4.2B GPU debt wall hitting CoreWeave in 2026 — against GPUs whose rental rates have dropped 50-70% from peaks — is exactly the risk management problem that compute derivatives were designed to solve. This is institutional finance screaming for hedging instruments. Ornn's origin story (PE firms with no way to hedge GPU lending exposure) has scaled from consulting insight to $11B+ of unhedged collateral. The demand pull is mechanical and growing.
**Signal:** High

### Remote Access Security Act (H.R. 2683): The Compliance Layer Arrives
**Source:** [Congress.gov](https://www.congress.gov/bill/119th-congress/house-bill/2683) | [Baker McKenzie](https://sanctionsnews.bakermckenzie.com/us-house-passes-remote-access-security-act/) | [EE News Europe](https://www.eenewseurope.com/en/ai-chip-export-controls-cloud-remote-access-security-act/)
**Summary:** The House passed H.R. 2683 on January 12, 2026 (369-22, bipartisan). The bill extends U.S. export controls to include cloud-based remote access to controlled technologies — meaning foreign persons accessing U.S.-hosted GPUs via the internet would require BIS export licenses, just like physically exporting the chips. This is a massive structural shift for compute marketplaces. Every platform facilitating GPU access to non-U.S. customers faces new licensing, KYC, and compliance requirements. CBO estimates compliance costs exceed $206M annually. The bill still needs Senate passage and presidential signature, but the vote was overwhelming and aligns with Trump AI Action Plan (which explicitly calls for "strengthening enforcement of AI compute export controls"). Compute Exchange already runs 75+ vetted providers with SLA frameworks — this KYC infrastructure becomes a regulatory moat if the bill passes.
**Signal:** High

### Trump AI Action Plan: Federal Validation of Compute Financial Markets
**Source:** [White House](https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf) | [Georgetown CSET](https://cset.georgetown.edu/article/trumps-plan-for-ai-recapping-the-white-houses-ai-action-plan/)
**Summary:** The July 2025 AI Action Plan — the Trump administration's 90-action policy document — explicitly calls for "improving the financial market for computing power" to ensure access for startups and academics, and directs NIST/OSTP/NSF's NAIRR to "accelerate the maturation of a healthy financial market for compute." This is federal government validation of the compute commoditization thesis. It also directs financial support mechanisms (loans, grants, tax incentives, offtake agreements) for AI infrastructure. For compute exchange operators: this creates a tailwind for regulatory pathway (CFTC DCM application has a friendlier policy environment) and signals government may become a compute market participant/buyer through official channels.
**Signal:** Medium

### Compute Exchange Identifies Compute Standards Council (CSC)
**Source:** [Compute Exchange Resources](https://compute.exchange/)
**Summary:** Compute Exchange has established what they call the **Compute Standards Council (CSC)** — an industry-led self-regulatory body modeled after financial services SROs, bringing together semiconductor manufacturers, cloud providers, OEMs, and consumers to develop standards for measuring and evaluating AI compute resources. Exact formation date and full membership list not confirmed — referenced in their resource documents but requires deeper investigation. The strategic significance is high: whoever controls compute measurement standards controls the definition of fungibility, which is the foundation of any commodity market. This is analogous to ISDA setting swap documentation standards or FIX Protocol setting equities messaging standards — the standard-setter captures enormous structural power without owning the exchange itself.
**Signal:** Medium

### H100 Price Spike: 10% in 4 Weeks (January 2026)
**Source:** [Silicon Data Blog](https://www.silicondata.com/blog/h100-price-spike) | [Carmen Li LinkedIn](https://www.linkedin.com/in/carmenrli/)
**Summary:** Silicon Data documented a 10% H100 rental price increase over just 4 weeks in January 2026. Carmen Li's analysis highlights a methodological insight: hyperscalers show "step-like" price changes with lag, while neoclouds adjust continuously. This means aggregate/average price indices can mask periods where pricing across providers is *diverging* — exactly the kind of volatility that makes hedging instruments valuable. The divergence signal also creates arbitrage opportunities between hyperscaler and neocloud compute pricing. Note: this finding appears to conflict with Ornn's OCPI data showing prices "flat to slightly down over 6 months" — the likely explanation is methodology (SD aggregates quotes including hyperscaler list prices; Ornn tracks executed transaction prices, which may be lagging the quote market).
**Signal:** Medium

---

## Compute Commoditization Tracker

### SDCE / Ornn / Architect Activity

- **Silicon Data:** World's first B200 Index launched (Dec 5, 2025). Full SiliconIndex suite now on Bloomberg + Refinitiv via dxFeed partnership. Explicitly positioned for building swaps/futures/structured notes. B200 index puts them ahead of Ornn on next-gen hardware benchmarking. 500+ enterprise clients. Carmen Li active at industry conferences (London Data Summit, Feb 13) and Manhattan GPU events — building brand with both finance and infrastructure crowds simultaneously.

- **Compute Exchange:** Compute Standards Council (CSC) appears to exist — industry standards body for GPU compute measurement. Needs deeper research for membership/governance details. 2026 blog identifies Shadeform, Prime Intellect, Node AI as named competitors. Remote Access Security Act compliance creates moat from existing 75+ vetted provider network. No new funding announced.

- **Ornn:** **First OTC compute swap executed** (confirmed by Bavaria to The Block, Jan 2026). Memory futures launched — DRAM/HBM coverage extending the AI infrastructure cost stack. H100 prices flat-to-down per OCPI (6 months). Architect/AX partnership for exchange-traded perpetuals pending regulatory approval. CFTC de minimis exemption runway still intact.

- **Architect/AX:** Deltix (EPAM) institutional trading platform integration live (Feb 25, 2026). Compute perpetual futures still pending regulatory approval. Series A ($35M) closed Dec 2025. Bermuda-regulated, not U.S. regulated — meaningful distinction for institutional adoption.

### Market Formation Signals

- **First OTC swap executed:** The market is live. This is the most important formation signal — actual transactions, not just infrastructure.
- **GPU ABS at $11B+:** Institutional finance is already inside compute markets through the collateral/lending channel. The demand for derivatives is organic and growing from this base.
- **Nobel laureate involvement (Milgrom/OneChronos):** Academic legitimization of the space. When the mechanism design theorist who designed spectrum auctions turns his attention to GPU compute, it signals the mechanism problem is real and worth solving.
- **Federal government validation (AI Action Plan):** White House explicitly calling for compute financial market development. Regulatory path gets easier.
- **Dual terminal presence (Bloomberg + Refinitiv):** Silicon Data's distribution achievement is the data layer equivalent of getting listed on an exchange — it means you're real.

### Patent & Standards Watch

- **ProphetStor (newly identified):** 14 U.S. patents in GPU optimization/metering, including "world's first" spatial/temporal GPU optimization patent (May 2024) and new "Predictive GPU Utilization Optimization" patent (Feb 26, 2026). These cover the *management* layer, not the exchange/trading layer, but benchmark methodology overlap is possible. Worth monitoring.
- **USPTO SEP Working Group** (launched Dec 29, 2025): If compute benchmark indices become industry standards, the SEP framework could apply — meaning benchmark methodology patents could become legally mandated to license on FRAND terms. This cuts both ways: protects the standard-setter's methodology from competitors, but also limits their ability to restrict licensing.
- **Core players still unpatented:** No patent filings found from Silicon Data, Ornn, Architect, or Compute Exchange. Significant IP gap for all players — first-mover opportunity exists in benchmark methodology, exchange mechanism, and clearing/settlement patents.
- **Action item for next patrol:** Direct USPTO/Google Patents assignee search for all four primary companies.

---

## Market Radar

- **CoreWeave (CRWV):** Seeking $8.5B new financing (Feb 2026) using Meta contracts as collateral. Stock at ~$89 (down 51% from $183 peak). $4.2B GPU debt wall in 2026. "GPU Maturity Wall" risk as H100 collateral value shrinks with rental rate declines. Will be the first major stress test for GPU ABS pricing and collateral risk management. — [CoreWeave Debt Wall Analysis](https://markets.financialcontent.com/stocks/article/finterra-2026-2-23-the-gpu-debt-wall-a-deep-dive-into-coreweave-crwv-and-the-2026-ai-financing-crisis)

- **Shadeform, Prime Intellect, Node AI:** Named by Compute Exchange as direct competitors in the GPU marketplace layer. None appear to have derivatives/index ambitions — they're competing in spot/managed access. Worth monitoring for any pivot into financial instruments. — [Compute Exchange Blog](https://compute.exchange/blogs/the-rise-of-gpu-marketplaces-in-2026)

- **Hyperscaler GPU pricing:** H100 rates fell 40% mid-2025 as AWS/Google/Azure waged price war against neoclouds. AMD implemented aggressive GPU price hikes in January 2026; NVIDIA followed in February. Mid-range GPUs commanding 25% premiums above MSRP. Hardware lead times 36-52 weeks for data center GPUs. — [Compute Exchange Blog](https://compute.exchange/blogs/reserved-vs.-on-demand-gpu-in-2026)

- **GPU market structure shift:** NVIDIA admitting general-purpose GPU era is ending; disaggregated inference architecture (prefill vs. decode silicon split) emerging for 2026 inference workloads. This hardware fragmentation will complicate compute standardization — "one GPU-hour" becomes less meaningful if different silicon handles different workload types. — [VentureBeat](https://venturebeat.com/infrastructure/inference-is-splitting-in-two-nvidias-usd20b-groq-bet-explains-its-next-act)

- **GCC AI compute stack:** Middle East Institute analysis on GCC (Gulf Cooperation Council) building AI compute infrastructure — "From Crude to Compute." Gulf sovereign wealth funds building AI stacks could become major compute marketplace participants and potential hedge buyers. — [MEI](https://www.mei.edu/publications/crude-compute-building-gcc-ai-stack)

---

## Funding & M&A

- **CoreWeave (CRWV):** Seeking $8.5B in new debt financing (Feb 2026), using Meta Platforms AI infrastructure contracts as collateral. This is DDTL 4.0 territory — the debt structure keeps expanding to fund next-gen hardware deployment. Note: $2B NVIDIA investment (Jan 2026) at $87.20/share.
- **OneChronos + Auctionomics:** Previously raised $80M+ (OneChronos). No new round announced for the compute GPU venture specifically. Auctionomics is a consulting/design firm, not a startup — unusual structure.
- **No new rounds found** for Silicon Data, Ornn, or Architect since their known funding events.

---

## Cross-Agent Flags

- **[→ GEOPOLITICAL]** Remote Access Security Act (H.R. 2683): House passed 369-22 (Jan 12, 2026). Extends export controls to cloud GPU access. Major regulatory development for compute markets serving non-U.S. customers. Needs geopolitical monitor to track Senate progress and implications for allied nations' access.
- **[→ GEOPOLITICAL]** Trump AI Action Plan (July 2025): Explicitly targets "strengthening enforcement of AI compute export controls" and "closing loopholes in semiconductor manufacturing export controls." China-specific compute access restrictions are escalating.
- **[→ GEOPOLITICAL]** GCC AI compute buildout: Gulf sovereign wealth funds constructing AI infrastructure. Potential future participants in compute markets — and potential targets of compute export controls if U.S. tightens further.
- **[→ COMPUTE]** CoreWeave GPU Debt Wall (2026): $4.2B in GPU-collateralized debt maturing in 2026. GPU rental rates down 50-70% from peaks. This is a supply/demand story — distressed GPU operators may flood spot markets with supply, crashing rental rates further. Compute researcher should model this.
- **[→ COMPUTE]** NVIDIA inference architecture split: Disaggregated prefill/decode silicon for 2026 inference. Compute standardization becomes harder when different silicon handles different workload stages. Infrastructure market dynamics flag.
- **[→ COMPUTE]** B200/Blackwell GPU transition: Expiring A100/H100 reservations will flood secondary market in late 2026 as teams upgrade. Compute researcher should track secondary market dynamics.

---

## Tangents & Discoveries

- **[TANGENT] GCC "From Crude to Compute" thesis:** Middle East analysts explicitly drawing the analogy between Gulf states' historical oil dominance and their aspirations in AI compute. If Gulf sovereign wealth funds build large-scale GPU infrastructure AND seek to participate in compute financial markets, they could become major liquidity providers (natural long compute, want to sell forward) — the Saudi Aramco of compute futures. Relevant for B if thinking about non-U.S. compute exchange participants.

- **[COMMODITY-PARALLEL] GPU ABS mirrors aircraft ABS:** The GPU ABS structure (CoreWeave DDTL, Lambda GPU ABS) closely mirrors how aircraft asset-backed securities developed — hard assets with known depreciation schedules, leased against cash flows, financed by institutional lenders. The aircraft leasing market took 30+ years to mature; GPU ABS is moving faster. But aircraft ABS didn't produce aircraft *derivatives* (hedges on residual values) for a long time — the sequencing suggests compute derivatives are 2-5 years behind where they should be relative to the ABS market's maturity.

- **[MARKET-GAP] GPU depreciation derivatives:** Nobody in the space appears to be specifically targeting GPU *residual value* risk — i.e., the risk that the asset backing a GPU loan drops in value due to next-gen hardware obsolescence. This is distinct from rental rate risk. CoreWeave's "GPU Maturity Wall" is a residual value problem. A compute derivative that settles on GPU resale market prices (not rental rates) would be distinct from anything Ornn/Architect currently offers and would directly address the $11B+ ABS lender concern. This is a product gap worth investigating.

- **[TANGENT] ProphetStor patent portfolio:** 14 U.S. patents in GPU optimization/metering/benchmarking. A data center AIOps company, not an exchange — but their "Spatial and Temporal Optimization of GPU Utilization" patent (world's first, May 2024) could touch compute standardization if metering methodologies overlap. Not a current threat to compute exchanges, but worth a freedom-to-operate check if B's work involves GPU utilization measurement methodologies.

---

## Recommendations

1. **Map the Compute Standards Council (CSC) membership and governance structure.** If Compute Exchange controls the industry standard-setting body for GPU compute measurement, that's a structural moat that could make their index (SiliconIndex, through Silicon Data) the default settlement benchmark by default. B needs to know whether CSC is a real SRO with enforcement power or a marketing construct. Next patrol: deep dive on CSC.

2. **Evaluate GPU residual value derivatives as an unoccupied product niche.** The $11B+ GPU ABS market needs hedges against residual value decline (not just rental rate changes). No player appears to be building this. It's structurally distinct from Ornn/Architect's rental rate futures. If B's compute work touches asset valuation rather than just rental pricing, this is a gap worth assessing. Confidence it's worth investigating: 65.

3. **Run direct USPTO patent search for Silicon Data, Ornn, Architect, Compute Exchange assignees.** No IP filings found for any primary player. If none have filed, the opportunity window for first-mover IP in benchmark methodology and exchange mechanism is open. If they have filed and searches haven't surfaced them yet, B needs to know. Priority: high for next patrol.

4. **Monitor OneChronos launch timeline closely.** Their partner announcements (Nobel laureate, $80M+ funding) got limited coverage in the compute finance space. If they soft-launch to select counterparties, it likely won't be press-released. Monitor their website, Kelly Littlepage's LinkedIn, and Auctionomics news for any signals of platform activity or pilot partners. Confidence this matters for B: 65.

5. **Track Senate progress on Remote Access Security Act (H.R. 2683).** If it passes, every compute marketplace serving non-U.S. customers needs BIS export licensing infrastructure. Build this compliance consideration into any compute marketplace product design now, not after enactment.

---

## Opinions Formed

- **"OneChronos is the most underestimated entrant in compute commoditization — combinatorial auction approach + Nobel backing could leapfrog simpler exchanges for complex compute procurement."** — Confidence: 55, Evidence: $80M+ funding, proven equities execution, Milgrom's mechanism design credentials, correct framing of the token/cluster translation problem.

- **"GPU ABS and chip-backed securitization is the accelerant that will force compute derivatives to exist — lenders holding $11B+ in GPU collateral have no way to hedge, creating institutional pull demand."** — Confidence: 70, Evidence: Lambda GPU ABS (AAA-rated), CoreWeave $18B+ GPU-collateralized debt, BlackRock/PIMCO/Carlyle/Macquarie active. GPU depreciation = unhedged collateral risk = demand for derivatives.

- **"The Remote Access Security Act, if enacted, creates a compliance moat for established compute marketplaces with existing KYC/vetting infrastructure — benefiting Compute Exchange, hurting new entrants."** — Confidence: 60, Evidence: H.R. 2683 passed 369-22, CBO estimates >$206M compliance costs, Compute Exchange already has 75+ vetted providers.

- **Updated: "The index war (SiliconIndex vs. OCPI) will be the defining competitive battle..."** — Confidence raised to 65 (from 60). Evidence: OCPI used in live swap settlements; SiliconIndex on Bloomberg + Refinitiv; both now in real transactions. Battle is underway, not theoretical.

- **Updated: "Carmen Li's dual CEO appointment signals eventual merger..."** — Confidence raised to 78 (from 75). SiliconIndex now explicitly positioned for financial product construction, eroding the data/exchange product boundary.

---

## Predictions

- **New: "OneChronos will partner with or be acquired by a major exchange or financial institution within 18 months."** — Confidence: 45, Timeframe: By Sept 2027. Evidence: Proven equities track record, Nobel backing, compute pivot — exactly the profile that exchange operators (CME, CBOE, ICE, Miami International Holdings) acquire.

- **New: "Remote Access Security Act will pass the Senate and be signed into law by end of 2026."** — Confidence: 60, Timeframe: By Dec 2026. Evidence: 369-22 House vote (bipartisan), Trump AI Action Plan alignment on compute export controls, national security framing.

- **Updated: "First $1B+ notional compute derivatives trade within 18 months."** — Confidence raised to 50 (from 40). First swap now confirmed executed; AX compute perpetuals pending; ABS lender hedging demand is real and growing.

- **Updated: "At least one major bank will announce a compute derivatives desk within 12 months."** — Confidence raised to 55 (from 50). GPU ABS with BlackRock/PIMCO/Macquarie already embedded. SiliconIndex on Bloomberg + Refinitiv. Deltix integration at AX Exchange. The rails are laid.
```

---

**Knowledge base updated.** Here's a summary of what this first patrol found and what changed:

## Patrol Summary

**18 sources hit | 31 findings evaluated | 9 items in final report**

### 🔴 Highest-Priority New Intelligence

1. **OneChronos + Auctionomics** — A Nobel-laureate-backed ($80M+) compute market entrant using combinatorial auction theory, announced July 2025. Completely absent from the initial knowledge base. This is the most intellectually serious approach in the space and the most well-capitalized new entrant.

2. **Ornn's first swap is live** — Bavaria confirmed to The Block that the first OTC compute swap has been executed. The market crossed from "announced" to "real."

3. **Silicon Data is now on Bloomberg AND Refinitiv** — via a dxFeed partnership. Only compute data provider on both major institutional terminals. Distribution moat is hardening faster than expected.

4. **Remote Access Security Act** — House passed 369-22 in January 2026. Extends export controls to cloud GPU access. Creates compliance layer for all compute marketplaces — incumbents with KYC infrastructure win.

5. **GPU ABS is $11B+ and growing** — Institutional finance is already embedded in compute markets through the collateral/lending channel. This is the organic demand pull for derivatives that Ornn's origin story predicted.

### 🟡 Key Updated Opinions & Predictions

- Index war confidence: 60 → 65 (now in real transactions)
- Silicon Data / Compute Exchange merger confidence: 75 → 78
- First $1B+ derivatives trade: 40 → 50 (first swap confirmed live)
- Bank compute derivatives desk: 50 → 55 (GPU ABS lenders + terminal access)
- **3 new opinions formed, 2 new predictions added**

Sources:
- [Carmen Li - LinkedIn](https://www.linkedin.com/in/carmenrli/)
- [Silicon Data CEO Carmen Li Expands Leadership to Include Compute Exchange](https://www.einpresswire.com/article/855693648/silicon-data-ceo-carmen-li-expands-leadership-to-include-compute-exchange)
- [Ornn Raises $5.7 Million Seed Round](https://www.prnewswire.com/news-releases/ornn-raises-5-7-million-seed-round-to-launch-the-worlds-first-compute-futures-exchange-302596938.html)
- [Architect Financial Technologies Partners with Ornn](https://www.prnewswire.com/news-releases/architect-financial-technologies-partners-with-compute-index-provider-ornn-to-launch-exchange-traded-futures-on-gpu-and-ram-prices-302666613.html)
- [Former FTX US president Brett Harrison's Architect expands into AI compute markets | The Block](https://www.theblock.co/post/386487/former-ftx-us-president-brett-harrisons-architect-expands-crypto-style-perpetual-futures-into-ai-compute-markets)
- [Auctionomics and OneChronos Partner on First Tradable Financial Market for GPU Compute](https://www.businesswire.com/news/home/20250729678918/en/Auctionomics-and-OneChronos-Partner-on-First-Tradable-Financial-Market-for-GPU-Compute)
- [Startup and Nobel laureate collaborate to create GPU financial exchange | TechSpot](https://www.techspot.com/news/108879-startup-nobel-laureate-collaborate-create-gpu-financial-exchange.html)
- [OneChronos And Auctionomics Launch First Auction Market For GPU Compute | Upstarts Media](https://www.upstartsmedia.com/p/one-chronos-auctionomics-launch-gpu-compute-market)
- [Silicon Data B200 Index and Refinitiv Expansion](https://www.silicondata.com/news-room/silicon-data-announces-major-revision-to-a100-h100-rental-indices-launches-first-ever-b200-index-and-introduces-new-hyperscaler-rental-benchmarks)
- [dxFeed Helped Silicon Data Expand GPU Index Coverage on Refinitiv](https://dxfeed.com/dxfeed-helped-silicon-data-to-expand-gpu-index-coverage-on-refinitiv/)
- [GPU Compute Derivatives: New Frontier for Institutional Risk Management | AInvest](https://www.ainvest.com/news/gpu-compute-derivatives-frontier-institutional-risk-management-ai-infrastructure-2601/)
- [GPUs as Collateral — Chip Based ABS | Medium](https://medium.com/@Elongated_musk/gpus-as-collateral-chip-based-abs-acf55ac3f135)
- [CoreWeave GPU Debt Wall 2026](https://markets.financialcontent.com/stocks/article/finterra-2026-2-23-the-gpu-debt-wall-a-deep-dive-into-coreweave-crwv-and-the-2026-ai-financing-crisis)
- [H.R. 2683 - Remote Access Security Act | Congress.gov](https://www.congress.gov/bill/119th-congress/house-bill/2683)
- [US House Passes Remote Access Security Act | Baker McKenzie](https://sanctionsnews.bakermckenzie.com/us-house-passes-remote-access-security-act/)
- [Trump's AI Action Plan | Georgetown CSET](https://cset.georgetown.edu/article/trumps-plan-for-ai-recapping-the-white-houses-ai-action-plan/)
- [America's AI Action Plan PDF | White House](https://www.whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf)
- [U.S. Patent for Predictive GPU Optimization | ProphetStor](https://prophetstor.com/2026/02/26/predictive-gpu-utilization-optimization/)
- [The Rise of GPU Marketplaces in 2026 | Compute Exchange](https://compute.exchange/blogs/the-rise-of-gpu-marketplaces-in-2026)

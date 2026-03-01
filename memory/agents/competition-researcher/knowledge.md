# Competition Researcher — Knowledge Base

> Last updated: 2026-03-01
> Agent: The Scout (competition-researcher)

---

## Company Profiles

### Silicon Data
- **Full name:** Silicon Data
- **Tagline:** "The Bloomberg of Compute"
- **Founded:** April 2024
- **HQ:** New York, NY
- **Employees:** ~6 (as of late 2025)
- **Website:** silicondata.com
- **CEO:** Carmen Li (PhD Mathematical Physics, Edinburgh; former Bloomberg global data integration lead; former DRW, Citi, AmEx)
- **LinkedIn:** linkedin.com/in/carmenrli
- **Twitter/X:** @carmenli
- **Board:** Donald Wilson (DRW founder/CEO)
- **Funding:** $4.7M seed (March 2025), co-led by DRW and Jump Trading. Other investors: Woodside AI, Wintermute Ventures, Sancus Ventures, SoGal Ventures. Angels: Max Kolysh, Joel Gantcher, Leo de Luna, Andrew Tan
- **Bloomberg coverage:** May 2025 (SDH100RT launch)
- **TSMC:** Official Open Innovation Partner
- **Distribution:** Bloomberg Terminal + Refinitiv (via dxFeed partnership, expanded Dec 2025). Only compute data provider on both major financial terminals.
- **Clients:** 500+ enterprise, financial, and semiconductor organizations worldwide

#### Products
1. **SiliconIndex™** — Suite of GPU rental benchmark indices. Includes A100, H100, Hyperscaler A100/H100, and B200 (world's first B200 rental index, launched Dec 5, 2025). Live on Bloomberg Terminal and Refinitiv. Processes 3.5M data points/day from 30+ global sources. Explicitly positioned for building swaps, futures, and structured notes tied to GPU markets. Historical data up to 8 years.
   - Previously called SDH100RT (the flagship H100 index); now branded under the SiliconIndex suite umbrella.
2. **SiliconNavigator™** — Institutional GPU pricing/market intelligence dashboard. Free tier + paid API + enterprise. Real-time GPU market monitoring across clouds, brokers, and vendors.
3. **SiliconMark™** — GPU performance & longevity benchmarking. Paper accepted to GPGPU Conference 2026: "Did You Win the GPU Cloud Lottery? Benchmarking from TFLOPS to Tokens/$" — 3,500 GPUs benchmarked across 11 cloud providers, found 38% performance variation and 1.77× difference in tokens/dollar within identical GPU models. Vendor-neutral framework.
4. **SiliconPriceIQ™** — AI-powered dynamic GPU pricing optimization with forecasts and competitive benchmarking.
5. **SiliconCarbon™** — AI sustainability and carbon footprint tracking by workload/region.

#### Key Technology
- **T-Guard:** Proprietary autonomous data pipeline (named after T-cells). Handles ingestion, monitoring, anomaly detection, normalization. ML anomaly detection + human QA layer.

#### Key Methodology Developments (Dec 5, 2025)
- A100/H100 indices revised to incorporate interconnect type, cluster scale, geography, and performance variance
- B200 Index tracks early pricing signals from neo clouds/marketplaces, adjusts for GPU configurations, monitors supply-demand dynamics
- Hyperscaler-specific benchmarks isolate pricing from major cloud operators vs. neocloud/marketplace trends (available exclusively via Silicon Data Portal)

#### Key Carmen Li Activity (Feb 2026)
- Published H100 Price Spike analysis: H100 prices jumped 10% in 4 weeks in January 2026. Hyperscalers show "step-like" price changes with lag; neoclouds adjust more frequently. "Aggregated or average prices can mask periods where pricing across providers is diverging."
- Spoke at London Data Summit (Feb 13)
- Panelist on monetizing data as an investable asset (Feb 6)
- Hosted GPU After Hours event in Manhattan for funded AI startups managing sustained H100/H200 workloads

#### Key Quote
Carmen Li: "Compute is going to be bigger than oil someday. But right now, it doesn't have the basic financial tools."

---

### Compute Exchange
- **Full name:** Compute Exchange
- **Founded:** 2024
- **HQ:** Palo Alto, CA
- **Employees:** 2-10
- **Website:** compute.exchange
- **Relationship to Silicon Data:** Separate entity, now sharing CEO (Carmen Li appointed Oct 2025). Silicon Data provides data infrastructure powering the exchange.

#### Co-Founders
- **Simeon Bochev** — original CEO (ex-Apple AI/ML Strategy, ex-Lambda Labs VP Strategy)
- **Don Wilson** — co-founder & strategic advisor (DRW founder/CEO). Concept originated from a dinner with Wilson.
- **Suna Said** — co-founder, Head of Woodside AI (early Palantir, Anduril, Instacart investor). Handles investor relations, sustainability, institutional growth.

#### Key Milestones
- **Jan 28, 2025:** Official launch — auction-based marketplace with visible order books
- **Feb 25, 2025:** First post-launch auction
- **Apr 2025:** $1B+ in compute supply facilitated
- **Oct 6, 2025:** Carmen Li appointed CEO (dual role with Silicon Data)
- **Oct 2025:** RFQ Hub launched, powered by Silicon Data benchmark data
- **Oct 2025:** Partnership & Referral Program launched

#### How It Works
- Auction-based marketplace connecting GPU buyers and sellers
- Real-time price discovery via visible order books
- Standardized contracts (hourly to annual)
- Resell unused compute capability
- 75+ vetted providers, one SLA worldwide
- Partners: Gcore, Nebius, Voltage Park

#### Named Competitors (from own blog)
Shadeform, Prime Intellect, Node AI, AWS/Azure/GCP, Lambda Labs

#### Compute Standards Council (CSC)
- **What:** Industry-led standards body modeled after self-regulatory organizations in financial services. Established by Compute Exchange.
- **Members:** Semiconductor manufacturers, cloud providers, OEMs, and consumers
- **Purpose:** Develop comprehensive standards for measuring and evaluating AI compute resources
- **Status:** Referenced in Compute Exchange resource documents — exact formation date unclear, further research needed
- **Strategic significance:** If CSC's standards become industry baseline, Compute Exchange gains regulatory moat similar to ISDA in derivatives

---

### Ornn
- **Full name:** Ornn AI Inc. (also Ornn Data LLC)
- **Founded:** 2025
- **HQ:** Menlo Park, CA (team in Cambridge, MA)
- **Website:** ornnai.com / ornn.trade
- **Mission:** World's first institutional-grade compute futures exchange
- **Funding:** $5.7M seed (October 2025), led by Crucible Ventures and Vine Ventures. Participation: Link Ventures, BoxGroup, Fortified Ventures. Angels from finance, cloud, and AI.

#### Team (All MIT alumni)
- **Kush Bavaria** — Co-Founder & CEO. Ex-Link Ventures investor, MIT CSAIL ML researcher. X: @bavaria_kush
- **Wayne Nelms** — Co-Founder & CTO. Ex-SIG equity options trader, ex-Google engineer. MIT Math+CS.
- **Jack Minor** — COO. Ex-BCG, Harvard Business School.
- **Andrew Kessler** — Ex-Optiver quant (won Optiver Nasdaq prediction competition, 4,000+ teams).

#### Origin Story
Bavaria and Nelms were consulting for PE firms lending to data centers. PE firms extending credit to GPU infrastructure companies had NO way to hedge their exposure. That gap inspired the company.

#### Products
1. **OCPI (Ornn Compute Price Index)** — Tracks live executed spot prices (not quotes) for H100, H200, B200, RTX 5090+. 10+ data partners. Regional weighting. Asian-style settlement (arithmetic average over contract tenor, not terminal price).
2. **Cash-settled futures** on GPU compute hours (H100, H200, B200, RTX 5090+)
3. **Cash-settled swaps** — lock $/GPU-hour, settle against OCPI benchmark. **First swap already executed** as of Jan 2026 per Bavaria.
4. **Memory futures** — standardized futures on DRAM/HBM prices. Monthly settlements, cash-settled against transparent spot pricing. Launched to serve same organizations managing GPU + memory exposure. Memory prices can swing 250%+ in a single year.
5. **Perpetual futures** (via Architect partnership, pending regulatory approval)

#### OCPI Market Data (as of Jan 2026)
- H100/GPU compute prices: flat to slightly down over the past 6 months
- H100 price spike noted (Silicon Data): +10% in January 2026

#### Regulatory Status
- Operating under **CFTC de minimis exemption** as swap dealer (up to $8B notional volume)
- Actively pursuing **Designated Contract Market (DCM) license** for full U.S. exchange regulation
- Designing systems under CFTC-aligned standards: USD cash collateral, transparent reporting, central clearing

#### Key Partnerships
- **Architect/AX** (Jan 2026) — first exchange-traded perpetual futures on compute (pending regulatory approval)
- **HydraHost** (Oct 2025) — 30K+ GPUs, Founders Fund-backed, largest OCPI data contributor

#### Key Quotes
- Bavaria: "We don't think of this as an engineering problem. Every new market is a behavioral problem."
- Bavaria: "Compute is rapidly becoming the defining commodity of the AI era, yet until now there has been no transparent, tradeable benchmark for its price."
- Bavaria to The Block: "AI labs and GPU-heavy companies need price certainty instead of GPU market swings. We've already executed our first compute swap with more in pipeline."

---

### Architect Financial Technologies / AX Exchange
- **Founded:** 2023
- **Website:** architect.co / architect.exchange
- **Exchange name:** AX
- **Regulation:** Licensed under Bermuda Monetary Authority; Architect Financial Derivatives LLC is NFA-registered Independent Introducing Broker for CFTC-regulated derivatives
- **Valuation:** ~$187M post-money (Dec 2025)

#### Leadership
- **Brett Harrison** — Founder & CEO. Former President of FTX US (departed before collapse).
- **Eric Stokes** — CTO. Former Jane Street (core trading infra, managed London/HK tech groups).

#### Funding ($52M total)
- Pre-seed: $5M (2023)
- Seed: $12M (early 2024)
- Series A: $35M (Dec 2025) — led by Miami International Holdings + Tioga Capital. Galaxy Ventures, ARK Invest, VanEck, Geneva Trading, Coinbase Ventures, Circle Ventures, SALT Fund.

#### Product: AX Exchange
- Launched November 2025 (equities, FX, rates, metals, commodities)
- Perpetual futures (non-expiring) — crypto-style contracts applied to traditional real-world assets
- 24/7 trading, margin trading with USD or stablecoin collateral
- Built with Connamara Technologies
- **Compute expansion via Ornn** (announced Jan 21, 2026): first exchange-traded compute futures, pending regulatory approval. Will track GPU rental prices + DRAM prices via OCPI.
- **Deltix (EPAM) integration** (Feb 25, 2026): institutional trading platform access — Deltix clients can trade AX perpetual futures alongside traditional futures and digital assets

#### Target Customers
Hedge funds, market makers, family offices, asset managers, insurance/reinsurance, lenders

---

### OneChronos + Auctionomics (NEW — added 2026-03-01)
- **Full name:** OCX Group Inc (parent of OneChronos) + Auctionomics
- **Partnership announced:** July 29, 2025
- **OneChronos website:** (YC 2016 alum)
- **Auctionomics founders:** Paul Milgrom (Nobel Prize in Economics 2020, auction theory) and Dr. Silvia Console Battilana (Emmy-winning FCC spectrum auction design)

#### Funding & Track Record
- OneChronos: $80M+ total funding (from Addition, BoxGroup, DCVC, DST Global, and others). Previously achieved $6.5B+ in daily equities trading volume via Smart Market technology.
- Auctionomics: Led design of FCC spectrum auction enabling television streaming (Emmy-winning)

#### Product: GPU Compute Financial Market
- **Approach:** Combinatorial auctions using mathematical optimization to match counterparties based on complex, multi-asset preferences. Allows bidding on bundles of compute capacity, power capacity, energy storage, and upstream resources.
- **Differentiation:** Can express nuanced trading goals across portfolios; optimizes across interdependencies between different resource types. Not a simple order book.
- **Settlement mechanism:** Buyers think in tokens; sellers think in GPU clusters. The core innovation is standardization that bridges this translation gap.
- **Status:** In discussions with stakeholders across industry (chip makers, cloud giants, data center providers). No specific launch date confirmed.
- **Chicken-and-egg challenge:** Noted explicitly — needs broad participation from Nvidia, hyperscalers, and emerging data centers.

#### Why This Matters
- Paul Milgrom literally designed the auction mechanism theory that underlies U.S. spectrum markets. Applying this to compute is the most academically credentialed approach in the space.
- OneChronos has proven execution in equities (Smart Markets at scale). This is not a pure theory play.
- Combinatorial auctions could handle the complexity of bundled compute resources better than simple spot markets — relevant for large training runs with specific hardware/geography/connectivity requirements.
- $80M+ in funding dwarfs Ornn ($5.7M) and Compute Exchange's known funding. This is a well-capitalized entrant.

---

### CoreWeave (Context — GPU Supply Chain / Financial Infrastructure)
- **Status:** Public company (CRWV), IPO March 28, 2025 at $40/share
- **Peak:** ~$183 (June 2025). Current (Feb 2026): ~$89
- **Revenue:** $1.92B (2024), guided $5B+ (2025), projected $12B+ (2026)
- **Scale:** 250,000+ GPUs, 32 data centers, 1.3GW contracted power
- **Key customers:** OpenAI ($22.4B contract), Meta ($14.2B contract)
- **Debt:** $18B+ in debt/equity financing. DDTL 3.0: $2.6B facility. Feb 2026: seeking $8.5B new financing using Meta contracts as collateral.
- **NVIDIA relationship:** $2B investment from NVIDIA (Jan 2026). First to deploy Rubin architecture (late 2026).
- **GPU Debt Wall risk:** $4.2B due in 2026. GPU rental rates fallen 50-70% from peaks. Collateral value shrinking.
- **Significance for compute commoditization:** CoreWeave's debt structure essentially created the first GPU ABS market. Its financial distress creates demand for hedging instruments. Its price/volume data is a key signal for OCPI and SiliconIndex.

---

## Market Structure Map

### The Compute Commodity Stack

| Layer | Company | Function |
|-------|---------|----------|
| **Data & Intelligence** | Silicon Data | Benchmark indices (SiliconIndex suite), pricing data, Bloomberg + Refinitiv distribution |
| **Spot Marketplace** | Compute Exchange | Auction-based spot trading, order books, RFQ, Compute Standards Council |
| **Combinatorial Auction** | OneChronos + Auctionomics | Nobel-backed smart markets for bundled compute resources |
| **Index & OTC Derivatives** | Ornn | OCPI index, OTC swaps (live), cash-settled futures, memory futures |
| **Regulated Exchange** | Architect/AX | Listed perpetual futures (compute pending approval), Bermuda regulated |

### Key Relationships
- Silicon Data provides data → Compute Exchange uses for marketplace pricing
- Carmen Li is CEO of both Silicon Data and Compute Exchange (dual role since Oct 2025)
- Ornn provides indices → Architect lists futures products based on OCPI
- HydraHost (Founders Fund-backed, 30K GPUs) is Ornn's largest data contributor
- DRW: co-founded Compute Exchange, co-led Silicon Data seed, Don Wilson on board — connective tissue across data/exchange layer
- Jump Trading: co-led Silicon Data seed
- dxFeed: technical partner enabling Silicon Data's Refinitiv distribution

### Competitive Dynamics
- Silicon Data/Compute Exchange vs. Ornn: **two competing index providers** (SiliconIndex vs. OCPI). Different methodologies — SD aggregates from 30+ sources (quote data), Ornn uses executed transaction data. SD has distribution advantage (Bloomberg + Refinitiv). Ornn has methodology advantage (executed prices more reliable for settlement).
- Silicon Data explicitly positions SiliconIndex for building swaps/futures — encroaching on Ornn's territory.
- Exchange layer: Compute Exchange (spot auctions), Architect/AX (perpetual futures), OneChronos (combinatorial auctions) — three distinct approaches.
- OneChronos ($80M+) is a significant new entrant with Nobel-laureate backing. Announced July 2025, not widely tracked.
- Regulatory: Ornn pursuing CFTC DCM license (U.S. regulation). Architect licensed under Bermuda Monetary Authority. Different jurisdictional strategies.
- Remote Access Security Act (H.R. 2683): House passed Jan 12, 2026. Extends export controls to cloud GPU access. Awaiting Senate + President. Creates compliance layer for all compute marketplaces serving non-U.S. customers.

### GPU Financial Infrastructure (Adjacent)
- GPU ABS: Lambda Labs first GPU ABS deal ($500M+). CoreWeave pioneered GPU collateralized lending ($18B+ total). BlackRock, PIMCO, Carlyle, Macquarie Group active lenders.
- Chip-backed securitization now AAA-rated. GPU depreciation is the core risk management problem — exactly what compute derivatives address.
- $11B+ lent against GPU collateral across neo-cloud industry.

---

## Regulatory Landscape

### Remote Access Security Act (H.R. 2683)
- **Passed House:** January 12, 2026 (369-22, bipartisan)
- **Status:** Awaiting Senate + Presidential signature
- **What it does:** Extends U.S. export controls to include cloud-based remote access to controlled technologies (GPUs). BIS would have authority to require licenses for foreign persons accessing controlled chips via cloud/internet.
- **Impact on compute markets:** All compute marketplaces serving non-U.S. customers face new compliance requirements. Customer vetting and Know-Your-Customer processes become mandatory at the marketplace layer. Creates barrier to entry for new exchanges. Incumbents with KYC infrastructure (Compute Exchange's 75+ vetted providers) have advantage.
- **Cross-agent flag:** [→ GEOPOLITICAL]

### Trump AI Action Plan (July 23, 2025)
- Explicitly calls for "improving the financial market for computing power" to ensure access for startups and academics.
- Federal validation of compute commoditization as a policy goal.
- NIST role: expanding AI standards activity, AI Risk Management Framework revision, new SEP Working Group (Dec 2025).
- Compute financial markets now have White House backing — significant for regulatory pathway.

### CFTC Compute Classification
- Ornn operating under swap dealer de minimis exemption ($8B notional cap)
- Pursuing DCM license — no decision yet
- Architect using Bermuda jurisdiction — offshore approach
- No CFTC guidance yet on classify of compute as commodity vs. other instrument

---

## Opinions

### Active Opinions

1. **"The compute commodity market will bifurcate into a data/analytics layer and an exchange/derivatives layer, similar to how Bloomberg and CME coexist in traditional markets."**
   - Confidence: 75 (+5)
   - Evidence: Silicon Data positioning as "Bloomberg of Compute" while Ornn/Architect build the exchange. The analogy is explicit and the teams are acting on it. Silicon Data now on both Bloomberg + Refinitiv, further cementing the data layer position. SiliconIndex explicitly positioned for building financial products.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

2. **"DRW's involvement in both Silicon Data and Compute Exchange gives that ecosystem a significant structural advantage — they understand market-making, regulatory navigation, and liquidity bootstrapping better than any other backer in this space."**
   - Confidence: 75
   - Evidence: Don Wilson (DRW founder) co-founded Compute Exchange, sits on Silicon Data board, DRW co-led seed. DRW is one of the largest proprietary trading firms. Jump Trading co-led alongside. No change.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

3. **"Ornn's CFTC DCM license pursuit is the most important regulatory development in this space — if granted, it creates the first U.S.-regulated compute futures exchange and sets the regulatory precedent."**
   - Confidence: 65
   - Evidence: Ornn actively pursuing DCM, currently operating under de minimis exemption ($8B cap). Architect took the offshore route (Bermuda). Whoever gets U.S. regulatory clarity first has a major advantage for institutional adoption. No material update — still waiting.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

4. **"The index war (SiliconIndex vs. OCPI) will be the defining competitive battle — whichever index becomes the settlement benchmark for futures contracts captures enormous value, similar to how ICE Brent became the global oil benchmark."**
   - Confidence: 65 (+5)
   - Evidence: Silicon Data expanded to Refinitiv and launched B200 index — aggressively building distribution moat. OCPI is used as settlement reference for live OTC swaps (first swap executed). Both indices are live and referenced in real transactions. The battle is now actually underway, not hypothetical.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

5. **"Carmen Li's dual CEO appointment (Silicon Data + Compute Exchange, Oct 2025) signals an eventual merger or deep integration of the data and spot marketplace layers."**
   - Confidence: 78 (+3)
   - Evidence: Same CEO, shared data infrastructure (RFQ Hub powered by SD benchmarks), same key backers (DRW, Wilson). Operational integration already happening. Silicon Data now explicitly positions SiliconIndex for financial product construction — blurring the data/exchange boundary further.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

6. **"OneChronos is the most underestimated entrant in compute commoditization — their combinatorial auction approach and Nobel-laureate backing could leapfrog simpler order-book exchanges for complex, bundled compute procurement."** [NEW]
   - Confidence: 55
   - Evidence: $80M+ funded (dwarfs Ornn/Compute Exchange seed rounds). Paul Milgrom's auction theory literally designed the mechanism used in U.S. spectrum auctions. OneChronos has proven equities execution at scale ($6.5B daily volume). Announced July 2025 — largely under-the-radar in this space. Core technical insight (compute buyers think in tokens, sellers think in clusters — need a translator) is the right framing of the standardization problem.
   - Counterargument: Still building, no confirmed launch. Chicken-and-egg liquidity problem. Combinatorial auctions are computationally complex and unfamiliar to GPU buyers.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

7. **"GPU ABS and chip-backed securitization is the accelerant that will force compute derivatives to exist — lenders holding $11B+ in GPU collateral have no way to hedge, creating institutional pull demand for Ornn/Architect products."** [NEW]
   - Confidence: 70
   - Evidence: $11B+ lent against GPU collateral. Lambda Labs $500M+ GPU ABS deal (first-ever). CoreWeave $18B+ in GPU-collateralized debt. Macquarie Group, BlackRock, PIMCO active. GPU depreciation = unhedged collateral risk. Ornn's origin story is exactly this (PE firms lending to data centers with no hedge). The pipeline from ABS issuance to derivatives hedging demand is mechanical — lenders will want it.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

8. **"The Remote Access Security Act (H.R. 2683), if enacted, creates a compliance moat for established compute marketplaces with existing KYC/vetting infrastructure — benefiting Compute Exchange, hurting new entrants."** [NEW]
   - Confidence: 60
   - Evidence: H.R. 2683 passed House 369-22 (Jan 12, 2026). Requires licensing for foreign access to controlled compute. Compute Exchange already has 75+ vetted providers. New compute marketplaces serving international customers face new KYC infrastructure build requirements. Compliance costs are estimated to exceed $206M threshold under UMRA.
   - Risk: Bill still needs Senate + Presidential signature.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

---

## Predictions

### Active Predictions

1. **"Silicon Data and Compute Exchange will formally merge or announce a unified brand within 12 months."**
   - Confidence: 70 (+5)
   - Timeframe: By March 2027
   - Evidence: Shared CEO, shared investors, integrated products. SiliconIndex now explicitly positioned for financial product construction — eroding the data/exchange product boundary. Maintaining two entities adds overhead for a ~6-person team.
   - Status: active
   - Stated: 2026-02-28
   - Updated: 2026-03-01

2. **"Ornn will receive CFTC DCM approval or a no-action letter within 18 months."**
   - Confidence: 45
   - Timeframe: By August 2027
   - Evidence: Actively pursuing, designing to CFTC standards, $8B de minimis runway gives them time. But CFTC moves slowly and compute is a novel asset class. Trump AI Action Plan is tailwind (government wants compute markets). No material change.
   - Status: active
   - Stated: 2026-02-28

3. **"At least one major bank (top 10 global) will publicly announce a compute derivatives desk or compute trading capability within 12 months."**
   - Confidence: 55 (+5)
   - Timeframe: By March 2027
   - Evidence: Carmen Li's Bloomberg background + SiliconIndex on Bloomberg + Refinitiv = institutional visibility. GPU ABS already has BlackRock, PIMCO, Macquarie Group active. Banks follow where risk management tools exist — and GPU collateral risk management tools now exist. Deltix integration with AX Exchange brings institutional platform access. Trump AI Action Plan explicitly supports compute financial markets.
   - Status: active
   - Stated: 2026-02-28
   - Updated: 2026-03-01

4. **"The first $1B+ notional compute derivatives trade will occur within 18 months."**
   - Confidence: 50 (+10)
   - Timeframe: By August 2027
   - Evidence: Ornn has already executed first OTC swap. AX compute perpetuals pending regulatory approval. $8B CFTC de minimis cap gives room to grow. CoreWeave's $8.5B Feb 2026 financing using AI contracts as collateral shows institutional appetite. GPU ABS ecosystem creates natural hedging demand. Revised upward given first swap confirmed live.
   - Status: active
   - Stated: 2026-02-28
   - Updated: 2026-03-01

5. **"OneChronos will partner with or be acquired by a major exchange or financial institution within 18 months."** [NEW]
   - Confidence: 45
   - Timeframe: By September 2027
   - Evidence: OneChronos has equities track record (Smart Markets, $6.5B daily volume), Nobel-laureate backing, $80M+ funding, and now GPU compute focus. Traditional exchanges (CME, CBOE, ICE) regularly acquire technology providers with novel market mechanisms. Miami International Holdings (Architect backer) is an exchange operator — this type of player acquires execution technology.
   - Status: active
   - Stated: 2026-03-01

6. **"The Remote Access Security Act will pass the Senate and be signed into law, creating the first KYC/compliance regime for compute marketplace operators."** [NEW]
   - Confidence: 60
   - Timeframe: By December 2026
   - Evidence: Passed House 369-22 (bipartisan). Trump administration is pro-export control on AI compute (AI Action Plan explicitly mentions "strengthening enforcement of AI compute export controls"). National security framing makes Senate passage likely. CBO compliance cost estimate confirms impact is real.
   - Status: active
   - Stated: 2026-03-01

---

## Patent & Standards Watch

### Known Activity
- **ProphetStor** (Milpitas, CA): 14 U.S. patents granted, 10+ pending in GPU optimization/metering:
  - "Spatial and Temporal Optimization of GPU Utilization" (May 2024) — world's first patent in this domain
  - "Predictive GPU Utilization Optimization" (granted Feb 26, 2026) — predictive demand forecasting using time-series + correlation analysis
  - "Predictive, Self-Driving Autoscaling" (Aug 2025) — operational cost + overhead cost balancing for GPU scaling
  - These patents are in GPU *management/optimization*, not exchange/trading. Not directly blocking compute exchange operations, but could be relevant if metering methodology overlaps.
- **No specific patent filings identified** from Silicon Data, Ornn, Architect, or Compute Exchange as of 2026-03-01
- **USPTO AI Eligibility Guidance Reset** (Nov 28, 2025): New framework treats AI systems as tools only; no separate eligibility standard for AI-assisted inventions. Could affect patentability of AI-driven benchmark methodologies (T-Guard, OCPI's ML components).
- **USPTO Standard-Essential Patent (SEP) Working Group** launched (Dec 29, 2025): Reports directly to USPTO Director. Potentially relevant if compute benchmark indices become standard-essential.

### Areas to Monitor
- Compute unit standardization (what makes GPU-hours fungible) — no filings found yet, significant IP gap
- Benchmark methodology patents — Silicon Data's T-Guard and Ornn's OCPI methodology could be patentable; neither appears to have filed
- Exchange mechanism patents — Compute Exchange's auction mechanics, OneChronos' combinatorial auction
- Clearing/settlement infrastructure patents
- **Action item:** Run direct USPTO/Google Patents search for assignees: "Silicon Data", "Ornn", "Compute Exchange", "Architect Financial" in next patrol

### Compute Standards Council (CSC)
- Established by Compute Exchange — industry-led self-regulatory body for GPU compute measurement standards
- Members: semiconductor manufacturers, cloud providers, OEMs, consumers
- **Strategic significance HIGH:** If CSC's standards become the baseline for compute fungibility, Compute Exchange has first-mover advantage as the standards-setter — analogous to ISDA in derivatives or FIX protocol in equities
- Formation date/membership list: not confirmed — needs deeper research

---

## Source Links for Future Patrols

### Carmen Li / Silicon Data
- LinkedIn: linkedin.com/in/carmenrli
- Medium: medium.com/@cli_87015
- Frontlines podcast: frontlines.io/podcasts/carmen-li/
- MarketsWiki: marketswiki.com/wiki/Silicon_Data
- Bloomberg coverage (May 2025): bloomberg.com/news/articles/2025-05-27/silicon-data-creates-first-of-its-kind-index-for-ai-chips
- dxFeed partnership: dxfeed.com/dxfeed-helped-silicon-data-to-expand-gpu-index-coverage-on-refinitiv/
- Silicon Data newsroom: silicondata.com/news-room
- GPU Pricing Trends 2026 blog: silicondata.com/blog/gpu-pricing-trends-2026-what-to-expect-in-the-year-ahead

### Ornn
- Website: ornn.trade
- Research hub: ornn.trade/research
- Memory futures: ornn.trade/research/memory-futures
- Compute futures: ornn.trade/research/compute-futures
- Kush Bavaria X: @bavaria_kush
- PitchBook: pitchbook.com/profiles/company/1084467-79
- Paragraph blog: paragraph.com/@moyed/ornn
- The Block coverage: theblock.co/post/386487/former-ftx-us-president-brett-harrisons-architect-expands-crypto-style-perpetual-futures-into-ai-compute-markets (includes Bavaria interview)

### Architect
- Website: architect.co
- Brett Harrison LinkedIn: linkedin.com/in/brettaharrison
- Brett Harrison Wikipedia: en.wikipedia.org/wiki/Brett_Harrison
- Deltix integration PR: prnewswire.com/news-releases/deltix-trading-platform-integrates-with-architect-financial-technologys-ax-perpetual-futures-exchange-302696712.html

### Compute Exchange
- Website: compute.exchange
- MarketsWiki: marketswiki.com/wiki/Compute_Exchange
- CSC resource: compute.exchange/resources/compute-exchange-building-the-foundation-for-gpu-markets
- $5T opportunity piece: compute.exchange/resources/the-5-trillion-dollar-opportunity-a-compute-futures-market

### OneChronos + Auctionomics (NEW)
- Launch announcement: businesswire.com/news/home/20250729678918/en/Auctionomics-and-OneChronos-Partner-on-First-Tradable-Financial-Market-for-GPU-Compute
- TechSpot coverage: techspot.com/news/108879-startup-nobel-laureate-collaborate-create-gpu-financial-exchange.html
- Upstarts Media analysis: upstartsmedia.com/p/one-chronos-auctionomics-launch-gpu-compute-market
- Auctionomics: auctionomics.com

### Regulatory
- Remote Access Security Act: congress.gov/bill/119th-congress/house-bill/2683
- Trump AI Action Plan: whitehouse.gov/wp-content/uploads/2025/07/Americas-AI-Action-Plan.pdf
- CFTC de minimis exemption context: Ornn seed round PR

### GPU ABS / Compute Finance
- GPU ABS overview: medium.com/@Elongated_musk/gpus-as-collateral-chip-based-abs-acf55ac3f135
- Silicon to Securities (ABS): medium.com/@Elongated_musk/silicon-to-securities-how-gpus-became-aaa-rated-abs-assets-c0e75199327a
- CoreWeave GPU debt wall: markets.financialcontent.com/stocks/article/finterra-2026-2-23-the-gpu-debt-wall-a-deep-dive-into-coreweave-crwv-and-the-2026-ai-financing-crisis
- CoreWeave financing: davefriedman.substack.com/p/how-coreweave-actually-finances-its

---

## Calibration Notes

- Patrol 1 completed: 2026-03-01
- OneChronos/Auctionomics is a significant gap filled — announced July 2025, not in initial knowledge base
- GPU ABS ecosystem is more mature than expected — institutional finance already embedded in compute infrastructure
- Compute Standards Council needs dedicated research to confirm formation, membership, and governance
- Patent landscape: ProphetStor is only significant filer found; core compute exchange players appear to have no IP filings yet (opportunity for first-movers)
- Ornn first swap confirmed executed — market is live, not just announced
- H100 prices: +10% spike in Jan 2026 (per Silicon Data), but OCPI shows flat/slightly down over 6 months — methodological difference between quote aggregation (SD) and executed prices (OCPI) may explain divergence
- SiliconIndex now on both Bloomberg + Refinitiv — distribution advantage is real and growing

# Competition Researcher — Knowledge Base

> Last updated: 2026-02-28
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

#### Products
1. **SDH100RT** — World's first daily GPU rental benchmark index. Live on Bloomberg Terminal (ticker: SDH100RT). Launched May 27, 2025. Processes 3.5M data points/day from 30+ global sources.
2. **SiliconNavigator** — Institutional GPU pricing/market intelligence dashboard. Free tier + paid API + enterprise.
3. **SiliconMark** — GPU performance & longevity benchmarking. Paper accepted to GPGPU Conference 2026.
4. **SiliconPriceIQ** — AI-powered dynamic GPU pricing optimization with forecasts and competitive benchmarking.
5. **SiliconCarbon** — AI sustainability and carbon footprint tracking by workload/region.

#### Key Technology
- **T-Guard:** Proprietary autonomous data pipeline (named after T-cells). Handles ingestion, monitoring, anomaly detection, normalization. ML anomaly detection + human QA layer.

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
1. **OCPI (Ornn Compute Price Index)** — Tracks live executed spot prices (not quotes) for H100, H200, B200, RTX 5090+. 10+ data partners. Regional weighting.
2. **Cash-settled futures** on GPU compute hours
3. **Cash-settled swaps** — lock $/GPU-hour, settle against OCPI benchmark
4. **Memory futures** — tracking DRAM/HBM prices
5. **Perpetual futures** (via Architect partnership)

#### Regulatory Status
- Operating under **CFTC de minimis exemption** as swap dealer (up to $8B notional volume)
- Actively pursuing **Designated Contract Market (DCM) license** for full U.S. exchange regulation
- Designing systems under CFTC-aligned standards: USD cash collateral, transparent reporting, central clearing

#### Key Partnerships
- **Architect/AX** (Jan 2026) — first exchange-traded perpetual futures on compute
- **HydraHost** (Oct 2025) — 30K+ GPUs, Founders Fund-backed, largest OCPI data contributor

#### Key Quotes
- Bavaria: "We don't think of this as an engineering problem. Every new market is a behavioral problem."
- Bavaria: "Compute is rapidly becoming the defining commodity of the AI era, yet until now there has been no transparent, tradeable benchmark for its price."

---

### Architect Financial Technologies / AX Exchange
- **Founded:** 2023
- **Website:** architect.co / architect.exchange
- **Exchange name:** AX
- **Regulation:** Licensed under Bermuda Monetary Authority
- **Valuation:** ~$187M post-money (Dec 2025)

#### Leadership
- **Brett Harrison** — Founder & CEO. Former President of FTX US (departed before collapse).
- **Eric Stokes** — CTO. Former Jane Street (core trading infra, managed London/HK tech groups).

#### Funding ($52M total)
- Pre-seed: $5M (2023)
- Seed: $12M (early 2024)
- Series A: $35M (Dec 2025) — led by Miami International Holdings + Tioga Capital. Galaxy Ventures, ARK Invest, VanEck, Geneva Trading, Coinbase Ventures.

#### Product: AX Exchange
- Launched November 2025
- Perpetual futures (non-expiring) on FX, rates, equities, metals, commodities
- 24/7 trading, margin trading with USD or stablecoin collateral
- Built with Connamara Technologies
- **Compute expansion via Ornn** (Jan 2026): first exchange-traded compute futures, pending regulatory approval
- **Deltix (EPAM) integration** (Feb 25, 2026): institutional trading platform access

#### Target Customers
Hedge funds, market makers, family offices, asset managers, insurance/reinsurance, lenders

---

## Market Structure Map

### The Compute Commodity Stack

| Layer | Company | Function |
|-------|---------|----------|
| **Data & Intelligence** | Silicon Data | Benchmark indices (SDH100RT), pricing data, Bloomberg distribution |
| **Spot Marketplace** | Compute Exchange | Auction-based spot trading, order books, RFQ |
| **Index & Derivatives** | Ornn | OCPI index, OTC swaps, futures design |
| **Regulated Exchange** | Architect/AX | Listed perpetual futures, institutional clearing |

### Key Relationships
- Silicon Data provides data → Compute Exchange uses for marketplace pricing
- Carmen Li is CEO of both Silicon Data and Compute Exchange (dual role since Oct 2025)
- Ornn provides indices → Architect lists futures products based on OCPI
- HydraHost (Founders Fund-backed, 30K GPUs) is Ornn's largest data contributor
- DRW: co-founded Compute Exchange, co-led Silicon Data seed, Don Wilson on board — connective tissue across data/exchange layer
- Jump Trading: co-led Silicon Data seed

### Competitive Dynamics
- Silicon Data/Compute Exchange vs. Ornn: **two competing index providers** (SDH100RT vs. OCPI). Different methodologies — SD aggregates from 30+ sources, Ornn uses executed transaction data.
- Exchange layer: Compute Exchange (spot auctions) and Architect/AX (perpetual futures) are complementary, not competitive — yet.
- Regulatory: Ornn pursuing CFTC DCM license (U.S. regulation). Architect licensed under Bermuda Monetary Authority. Different jurisdictional strategies.

---

## Opinions

### Active Opinions

1. **"The compute commodity market will bifurcate into a data/analytics layer and an exchange/derivatives layer, similar to how Bloomberg and CME coexist in traditional markets."**
   - Confidence: 70
   - Evidence: Silicon Data positioning as "Bloomberg of Compute" while Ornn/Architect build the exchange. The analogy is explicit and the teams are acting on it.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

2. **"DRW's involvement in both Silicon Data and Compute Exchange gives that ecosystem a significant structural advantage — they understand market-making, regulatory navigation, and liquidity bootstrapping better than any other backer in this space."**
   - Confidence: 75
   - Evidence: Don Wilson (DRW founder) co-founded Compute Exchange, sits on Silicon Data board, DRW co-led seed. DRW is one of the largest proprietary trading firms. Jump Trading co-led alongside.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

3. **"Ornn's CFTC DCM license pursuit is the most important regulatory development in this space — if granted, it creates the first U.S.-regulated compute futures exchange and sets the regulatory precedent."**
   - Confidence: 65
   - Evidence: Ornn actively pursuing DCM, currently operating under de minimis exemption ($8B cap). Architect took the offshore route (Bermuda). Whoever gets U.S. regulatory clarity first has a major advantage for institutional adoption.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

4. **"The index war (SDH100RT vs. OCPI) will be the defining competitive battle — whichever index becomes the settlement benchmark for futures contracts captures enormous value, similar to how ICE Brent became the global oil benchmark."**
   - Confidence: 60
   - Evidence: Both indices launched within months of each other. SDH100RT on Bloomberg Terminal (distribution advantage). OCPI uses executed transaction data (methodology advantage). Futures contracts need a settlement benchmark — this is winner-take-most.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

5. **"Carmen Li's dual CEO appointment (Silicon Data + Compute Exchange, Oct 2025) signals an eventual merger or deep integration of the data and spot marketplace layers."**
   - Confidence: 75
   - Evidence: Same CEO, shared data infrastructure (RFQ Hub powered by SD benchmarks), same key backers (DRW, Wilson). Operational integration already happening.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

---

## Predictions

### Active Predictions

1. **"Silicon Data and Compute Exchange will formally merge or announce a unified brand within 12 months."**
   - Confidence: 65
   - Timeframe: By March 2027
   - Evidence: Shared CEO, shared investors, integrated products. Maintaining two entities adds overhead for a ~6-person team.
   - Status: active
   - Stated: 2026-02-28

2. **"Ornn will receive CFTC DCM approval or a no-action letter within 18 months."**
   - Confidence: 45
   - Timeframe: By August 2027
   - Evidence: Actively pursuing, designing to CFTC standards, $8B de minimis runway gives them time. But CFTC moves slowly and compute is a novel asset class.
   - Status: active
   - Stated: 2026-02-28

3. **"At least one major bank (top 10 global) will publicly announce a compute derivatives desk or compute trading capability within 12 months."**
   - Confidence: 50
   - Timeframe: By March 2027
   - Evidence: Carmen Li's Bloomberg background + SDH100RT on Bloomberg Terminal = institutional visibility. PE firms already lending to GPU infrastructure (Ornn origin story). Banks follow where risk management tools exist.
   - Status: active
   - Stated: 2026-02-28

4. **"The first $1B+ notional compute derivatives trade will occur within 18 months."**
   - Confidence: 40
   - Timeframe: By August 2027
   - Evidence: Ornn has $8B de minimis capacity. Architect launched with $187M valuation. HydraHost has 30K GPUs. The infrastructure is being built, but market adoption is uncertain.
   - Status: active
   - Stated: 2026-02-28

---

## Patent & Standards Watch

### Known Activity
- No specific patent filings identified yet from SDCE, Ornn, or Architect as of 2026-02-28
- **Action item:** Run USPTO/WIPO searches for compute exchange, GPU benchmarking, compute metering patents in next patrol
- NIST compute standards: no specific activity identified yet
- IEEE/ISO: no compute commodity standards activity identified yet

### Areas to Monitor
- Compute unit standardization (what makes GPU-hours fungible)
- Benchmark methodology patents (could create moats)
- Exchange mechanism patents
- Clearing/settlement infrastructure patents

---

## Source Links for Future Patrols

### Carmen Li / Silicon Data
- LinkedIn: linkedin.com/in/carmenrli
- Medium: medium.com/@cli_87015
- Frontlines podcast: frontlines.io/podcasts/carmen-li/
- MarketsWiki: marketswiki.com/wiki/Silicon_Data
- Bloomberg coverage (May 2025): bloomberg.com/news/articles/2025-05-27/silicon-data-creates-first-of-its-kind-index-for-ai-chips

### Ornn
- Website: ornn.trade
- Research hub: ornn.trade/research
- Kush Bavaria X: @bavaria_kush
- PitchBook: pitchbook.com/profiles/company/1084467-79
- Paragraph blog: paragraph.com/@moyed/ornn

### Architect
- Website: architect.co
- Brett Harrison LinkedIn: linkedin.com/in/brettaharrison
- Brett Harrison Wikipedia: en.wikipedia.org/wiki/Brett_Harrison

### Compute Exchange
- Website: compute.exchange
- MarketsWiki: marketswiki.com/wiki/Compute_Exchange

---

## Calibration Notes

- This is the initial knowledge base seeded from research conducted 2026-02-28
- All company data should be verified against primary sources on first patrol
- Patent landscape is the biggest gap — needs dedicated research
- Regulatory timeline predictions are inherently uncertain (CFTC is unpredictable)
- Team sizes are approximate and likely growing

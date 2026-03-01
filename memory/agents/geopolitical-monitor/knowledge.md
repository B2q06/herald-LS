# Geopolitical Monitor — Knowledge Base

> Last updated: 2026-03-01
> Agent: The Strategist (geopolitical-monitor)

---

## Regulatory Landscape for Compute as a Commodity

### CFTC Jurisdiction
- The CFTC regulates commodity futures and swaps in the U.S.
- **Ornn** sources pricing data from live GPU markets (HydraHost is largest data contributor via GPU brokering activity). Ornn's indices are built on real transaction data — the foundation for price discovery.
- Knowledge update: prior knowledge stated Ornn was pursuing a CFTC DCM license; confirmed this is NOT yet the case. Architect/Ornn chose **Bermuda BMA** regulation to move faster. CFTC DCM is a future aspiration, not a current application.
- No CFTC guidance yet on whether GPU compute qualifies as a "commodity" under the Commodity Exchange Act.
- **Key question:** Is a GPU-hour more like electricity (commodity, CFTC jurisdiction) or a cloud service (not a commodity)?
- CFTC Chairman Michael Selig (sole commissioner as of March 2026): "minimum effective dose of regulation" doctrine. Pro-innovation, anti-regulatory-overreach. Filing amicus briefs to expand CFTC jurisdiction over prediction markets vs. states. Cannot pass formal rules alone — needs confirmed commissioners for full APA rulemaking.
- Digital Commodity Intermediaries Act (Senate Agriculture Committee, Jan 29, 2026): Would give CFTC authority over digital commodity spot markets. Legislative text's definition of "digital commodity" worth monitoring for compute coverage potential.

### Architect / AX Exchange
- Licensed under **Bermuda Monetary Authority** — chose offshore regulation explicitly to move faster than US regulatory timeline allows.
- Products: perpetual futures on GPU rental prices and DRAM prices, referencing Ornn indices.
- Margin-traded, USD or USD-stablecoin collateral, institutional non-US clients only.
- $35M Series A raised (Miami International Holdings lead, Tioga Capital, Coinbase Ventures, Circle Ventures, SALT Fund). Valuation ~$187M.
- Ornn separate $5.7M seed raise.
- **Brett Harrison** (ex-FTX US President) — regulatory experience with both US licensing and offshore structure.
- Miami International Holdings (MIAX exchange operator) as lead investor is significant — they understand DCM/DCO licensing better than almost anyone. Signals they see US licensing as eventually feasible.
- Launch status: "imminently, pending [Bermuda] regulatory approval" as of January 2026.

### Key Legislative Developments (January 2026 — High Priority)

**Remote Access Security Act (H.R. 2683)**
- House-passed January 12, 2026 (369-22), Senate-pending.
- Extends Export Control Reform Act to cloud computing — remote GPU access by restricted persons = controlled export.
- Covers GPUs/AI chips accessed through cloud platforms by foreign persons from China, Russia, Iran, DPRK, Cuba, Venezuela.
- Forces KYC/end-user verification on cloud providers, compute marketplaces, and exchanges.
- Civil penalties: up to $370,000 per violation or twice transaction value.
- **Implication for compute commodity design:** Any compute exchange or marketplace operating internationally must build KYC/AML compliance equivalent to money service businesses. This is now a prerequisite, not optional.

**AI Overwatch Act (H.R. 6875)**
- House Foreign Affairs Committee advanced 42-2-1, January 2026.
- 30-day Congressional veto window on any chip export license for H20-class-or-above GPUs.
- Covers China, Russia, Iran, DPRK, Cuba, Venezuela.
- Would revoke existing licenses and impose temporary blanket denial pending new national security strategy.
- White House (David Sacks) opposing.
- **Implication:** If enacted, creates structural licensing uncertainty for compute instruments referencing non-US GPU supply. Material risk factor for compute commodity instruments with international delivery.
- Probability of full enactment: moderate/uncertain (42-2 committee vote strong, but White House opposition and Senate uncertain).

**BIS Case-by-Case Review + 25% Tariff (Jan 15, 2026)**
- H200 and AMD MI325X class GPUs: export license review changed from "presumption of denial" to "case-by-case" for China/Macau.
- Conditions: 50% volume cap (aggregate TPP to China ≤ 50% of TPP to US customers), 25% tariff, KYC requirements, third-party US lab testing.
- Domestic exemptions (no tariff): US datacenter use, US R&D, US startups, US repairs/replacements.
- **Key implication:** Creates US-domestic vs. export-controlled supply bifurcation. US GPU-hour pricing should diverge from international pricing as domestic preference carve-out builds. Compute indices need geographic delivery specification.
- April 14, 2026: Commerce/USTR deadline to report on semiconductor trade negotiations → potential "significant" broader tariff recommendation.
- July 1, 2026: Secretary of Commerce update on datacenter GPU market → President determines whether to modify tariff.

**Trump Section 232 Semiconductor Tariff (Jan 14, 2026)**
- 25% tariff on narrow range of advanced AI chips (H200, MI325X class), effective Jan 15, 2026.
- Broad domestic exemptions for US datacenters, US R&D, US startups.
- Part of same package as BIS case-by-case review — instruments designed to incentivize US chip production while restricting China access.

### Precedents to Track
- **Electricity deregulation (1990s-2000s):** FERC Order 888 opened electricity markets → NYMEX listed electricity futures → Enron happened → regulation tightened. Compute could follow a similar arc. The Remote Access Security Act mirrors how FERC asserted federal jurisdiction over interstate electricity transmission — compute access = item in commerce triggering federal oversight.
- **Bandwidth trading (2000-2002):** Enron Broadband, Williams Communications tried to commoditize bandwidth. Market collapsed. Lessons: need standardized units, reliable delivery, and physical settlement mechanisms.
- **Carbon credits (2005-present):** EU ETS established carbon as tradable commodity. Required government mandate to create the market. Compute doesn't have a regulatory mandate — it needs organic demand.
- **Weather derivatives (1997-present):** CME weather futures showed you can financialize anything with measurable variability. GPU-hour pricing has similar characteristics.
- **New parallel identified:** The Remote Access Security Act + BIS export controls create a **BIS/Commerce + CFTC dual-agency jurisdiction** scenario for compute — analogous to how the CFTC and FERC share jurisdiction over electricity derivatives. This is more complex than the crypto path (which is CFTC vs. SEC only).

### International Regulatory Landscape
- **EU (ESMA/MiFID II):** No specific guidance on compute instruments. EU AI Act compute thresholds (10²³/10²⁵ FLOPs) are now law, with full enforcement starting August 2, 2026. Compute instruments settling against training compute may create downstream compliance obligations for EU counterparties.
- **UK (FCA):** No specific guidance. Post-Brexit regulatory competition could make UK favorable for compute exchange licensing.
- **Singapore (MAS):** Crypto-friendly regulatory environment. Potential venue for compute exchange licensing.
- **Bermuda (BMA):** Where Architect chose to license. Known for innovation-friendly financial regulation. AX exchange operating under BMA.
- **Action item:** Monitor IOSCO (international securities regulators) for any cross-border compute instrument guidance. Monitor Senate Digital Commodity Intermediaries Act text for "digital commodity" definition scope.

### EU AI Act Compute Thresholds (Now Enforceable Aug 2, 2026)
- 10²³ FLOPs: GPAI model threshold → full compliance obligations for general-purpose AI providers.
- 10²⁵ FLOPs: Systemic risk threshold → enhanced obligations (adversarial testing, incident reporting, AI Office notification within 2 weeks of reaching threshold).
- Compute estimate accuracy: within ±30%, with documented assumptions.
- Fines: up to 3% global annual turnover or €15M, whichever is higher.
- 26 providers signed Code of Practice (Microsoft, Google, Amazon, OpenAI, Anthropic). Meta refused — enhanced scrutiny.
- Practical implication: compute instruments that facilitate training above 10²³ FLOPs may create compliance obligations for EU-based buyers. Legal analysis needed before August 2026.

---

## Compute Supply Chain Geopolitics

### GPU Supply
- **NVIDIA** dominates AI/HPC GPU market (H100, H200, B100, B200, GB200). Blackwell architecture in production at TSMC Arizona (Fab 21 Phase 1, N4 process).
- NVIDIA consumer GPUs (RTX 5090 Blackwell) — operator runs local inference on this hardware. Consumer GPU export controls remain unlikely (H20-performance threshold in AI Overwatch Act is datacenter-class).
- **AMD** (MI300X, MI325X) — gaining datacenter GPU share. MI325X now subject to same BIS licensing regime as H200.
- **Intel** (Gaudi 3) — struggling but still a supply factor.
- **Export controls:** H200/MI325X = case-by-case review for China with 50% volume cap. H20-class and above = AI Overwatch Act target. Consumer GPUs (RTX series) = no current or near-term export control expected.

### Semiconductor Supply Chain
- **TSMC:** Manufactures >90% of advanced chips. Arizona status:
  - Fab 21 Phase 1 (N4 process): In production since Q4 2024. Producing Apple and NVIDIA Blackwell chips.
  - Fab 21 Phase 2 (N3/3nm process): Equipment installation targeting Q3 2026. Production 2027. Months ahead of original 2028 schedule.
  - Fab 21 Phase 3 (N2/A16 process): Groundbreaking April 2025. Volume production end of decade.
  - 900 acres purchased January 2026 for expansion beyond 6 fabs → up to 12 fabs total.
  - Challenges: power outage in Q3 2025 scrapped thousands of wafers, crushed quarterly profits 99%. Yield and cost competitiveness vs. Taiwan remains a gap.
  - Long-term: 30% of most advanced chips to be US-manufactured once full buildout complete.
- **ASML:** Sole supplier of EUV lithography. Dutch export controls limit China sales.
- **HBM suppliers:** SK Hynix (dominant), Samsung, Micron. HBM is the bottleneck for AI GPUs. Samsung/SK Hynix shifted from Validated End User status to annual licenses — creates annual supply chain uncertainty.
- **Advanced packaging:** TSMC CoWoS capacity is a key constraint for GPU production volume.
- **Huawei Ascend:** 600K units of 910C planned for 2026 (2x 2025). 910D (4-die packaging) targeting late 2026. Yield rates 5-20% vs. NVIDIA 60-80%. China GPU cloud consolidating around Baidu + Huawei. Software gap: no CUDA equivalent, compatibility layers emerging.

### Energy & Compute Costs
- Datacenter energy costs: 30-40% of GPU-hour operational costs. In high-density AI deployments, power costs can *exceed* hardware costs.
- **Regional cost differentials (critical for compute commodity pricing):**
  - Pacific Northwest (Washington, Oregon): $0.04-0.06/kWh (hydro)
  - Nordic (Norway, Sweden, Finland): $0.04-0.06/kWh (hydro/wind)
  - Texas/Midwest: $0.05-0.09/kWh
  - Gulf States (UAE, Saudi Arabia): $0.05-0.06/kWh — LOW COST AND US-CHIP APPROVED
  - US average: $0.09-0.15/kWh
- **Power is the 2026 binding constraint on compute scaling.** US datacenter occupancy approaching 95% in major markets. Not GPU supply — it's power allocation. 8.9 GW of new datacenter capacity in pipeline targeting end-2026, but power availability is the gating factor.
- GB200 NVL72: 120kW per rack. GB300: 140kW. Vera Rubin (2027): estimated 360kW per rack. Liquid cooling mandatory for AI-class deployments.
- Nuclear: Microsoft-Three Mile Island (20-year deal), Amazon-X-energy ($500M, 5GW by 2039), Meta-Vistra/TerraPower/Oklo (6.6GW by 2035). SMR deployments for datacenters: realistic 2028-2030.
- **Gulf sovereign compute advantage:** US chips approved (Nov 2025, 70,000 GB300 chips), $0.05-0.06/kWh energy, sovereign capital. Structurally lower operating costs than US hyperscalers.
- **Action item:** Track power purchase agreements (PPAs) by major datacenter operators as leading indicator of compute supply. Track Gulf datacenter energy contracts for pricing baseline.

### Middle East Sovereign Compute (New — First Patrol Finding)
- **Saudi Arabia HUMAIN (PIF subsidiary):** 500MW AI factory target, 18,000 GB200 Grace Blackwell Superchips Phase 1, $10B Google Cloud partnership, xAI 500MW datacenter, NVIDIA multi-billion partnership. Target: third biggest global AI hub.
- **UAE G42/Stargate:** 5GW AI campus target, 1-to-3.3GW datacenter capacity by 2030. Microsoft $9.4B total commitment through 2029 (including $1.5B G42 equity). Oracle Abu Dhabi Blackwell Supercluster (4,000+ Blackwell GPUs).
- **G42 2026 GPU orders:** Hundreds of thousands of units.
- This is a third compute power center (US, China/Huawei, Gulf sovereign) with: US chip access, cheap energy, sovereign capital, compliance infrastructure (due to US export reporting requirements).

---

## US-China Technology Decoupling

### Current State (Updated March 2026)
- BIS export control regime: H200/MI325X = case-by-case review with 50% cap + 25% tariff (Jan 15, 2026). H100 and below = previous restrictions still apply.
- Cloud loophole exploitation examples: INF Tech (2,300 Blackwell GPUs via Indonesia), Tencent ($1.2B contracts via Japanese provider Datasection). Both now exposed to Remote Access Security Act if enacted.
- China domestic chips: Huawei Ascend 910C dominant (23% domestic market share in H1 2025 per IDC). NVIDIA China share dropped to 50% as of May 2025 CEO comment. 2026: NVIDIA likely retains training market; domestic chips dominate government/vertical sectors.
- Investment restrictions: Executive Order limiting US investment in Chinese AI/semiconductor companies still in effect.

### Impact on Compute Markets
- Export controls create a **bifurcated compute market** — different GPU availability in US-aligned vs. China-aligned markets.
- **Now three-way bifurcation emerging:** US-domestic (highest tier, exempt from tariffs), Export/Allied (licensed, capped, tariffed), China/domestic (Huawei Ascend, separate performance benchmarks).
- Affects compute commodity standardization: can you have a *global* compute commodity if major markets use different hardware? Answer increasingly: no. Geographic/hardware-specific indices are the path.
- Chinese domestic GPU development (910D, 2026 ramp) creating competing compute benchmark indices is now more concrete — Huawei's cluster-level performance metrics (CloudMatrix 384, 300 PFLOPS) are measured differently than NVIDIA's per-GPU metrics.

---

## Opinions

### Active Opinions

1. **"CFTC will issue informal guidance on compute instruments (likely via staff letter or no-action letter) before formal rulemaking, similar to how they approached crypto."**
   - Confidence: 60 → maintained
   - Evidence: CFTC historically uses informal guidance for novel asset classes before full rulemaking. Ornn's Bermuda-first approach doesn't directly trigger CFTC, but the Remote Access Security Act (if enacted) creates a BIS/CFTC jurisdictional overlap that will force engagement. Selig's one-person-commission constraint means informal guidance is the faster path.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

2. **"Export controls on consumer GPUs (RTX series) are unlikely in the next 2 years, but compute reporting thresholds for cloud providers are coming."**
   - Confidence: 65 → maintained at 65, upgrading cloud reporting threshold confidence
   - Evidence: H20-performance threshold in AI Overwatch Act is datacenter-class. RTX 5090 exceeds H20 in raw FP32 but is consumer class — no indication of targeting. Cloud reporting/KYC is effectively *here* with Remote Access Security Act and BIS KYC requirements.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

3. **"The regulatory path for compute commoditization will more closely follow electricity deregulation than crypto regulation."**
   - Confidence: 55 → upgrading to 62
   - Evidence: Remote Access Security Act's framing of cloud GPU access as a "controlled export" parallels FERC's treatment of electricity as an interstate commerce item. BIS/CFTC dual jurisdiction emerging, similar to FERC/CFTC jurisdiction over electricity derivatives. The physical delivery characteristic (actual GPU-hours in specific locations) is being legally recognized. This is a stronger electricity parallel than crypto parallel.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01
   - Note: CONTRARIAN — most observers compare compute to crypto markets. Evidence is strengthening.

4. **"Energy costs will become the primary driver of regional compute pricing differentials within 18 months, creating geographic arbitrage opportunities."**
   - Confidence: 50 → upgrading to 68
   - Evidence: Power is confirmed as the 2026 binding constraint on compute scaling (not GPU supply). US datacenter occupancy at 95% in major markets by late 2026. 4x regional cost differential in US alone ($0.04-0.16/kWh). Gulf compute at $0.05-0.06/kWh with US chip approval. As GPU hardware commoditizes, energy is the differentiator — and this is happening faster than expected.
   - First stated: 2026-02-28
   - Last updated: 2026-03-01

5. **"Compute commodity indices will need geographic delivery specifications within 18 months, similar to crude oil (WTI vs. Brent)."** [NEW]
   - Confidence: 70
   - Evidence: BIS 50% volume cap + 25% tariff creates explicit US-domestic vs. export supply bifurcation. Domestic exemptions mean US-delivery GPU-hours are a distinct product. Remote Access Security Act creates geographic end-user restrictions. Current Ornn index methodology blends transaction data without geographic weighting — this is a structural defect in a bifurcating market.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

6. **"The Remote Access Security Act accelerates CFTC engagement on compute commodity regulation by forcing a BIS/CFTC jurisdictional overlap."** [NEW]
   - Confidence: 65
   - Evidence: GPU access = controlled export under BIS/Commerce. If GPU compute is also a commodity under CEA, dual-agency jurisdiction is unavoidable. This tension will force inter-agency engagement faster than Ornn's exchange launch alone would have. Parallel to how SEC/CFTC crypto conflict forced Memoranda of Understanding.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

7. **"The Gulf sovereign compute buildout creates a medium-term compute basis trade between US-domestic and Gulf-delivery GPU-hours."** [NEW]
   - Confidence: 60
   - Evidence: US chips (approved), $0.05-0.06/kWh energy, sovereign capital. Similar compliance characteristics to US (due to export reporting requirements). Once Gulf capacity reaches scale (~2027), basis between US-delivery and Gulf-delivery compute becomes executable. This is the most interesting geographic basis trade in compute.
   - First stated: 2026-03-01
   - Last updated: 2026-03-01

---

## Predictions

### Active Predictions

1. **"CFTC will issue a staff advisory or no-action letter addressing compute derivatives by Q3 2026."**
   - Confidence: 40 → maintained at 40
   - Timeframe: By September 2026
   - Evidence: Architect/Ornn chose Bermuda over CFTC — no immediate DCM application forcing CFTC response. But Remote Access Security Act + Digital Commodity Intermediaries Act may create Congressional pressure for CFTC engagement. One-person commission limits formal rulemaking. Informal guidance remains the faster path. Timeline maintained but rationale updated.
   - Status: active
   - Stated: 2026-02-28

2. **"At least one G7 country will propose compute reporting requirements (compute KYC) by end of 2026."**
   - Confidence: 55 → upgrading to 70
   - Timeframe: By December 2026
   - Evidence upgraded: EU AI Act 10²³/10²⁵ FLOP thresholds = already a form of compute governance. BIS KYC requirements on chip exports = effective compute KYC. Remote Access Security Act cloud compute controls = explicit compute access reporting. The trend line is definitive. The question is whether a *new* formal proposal is needed — or whether existing instruments already count. Upgrading confidence substantially.
   - Status: active
   - Stated: 2026-02-28, updated 2026-03-01

3. **"TSMC Arizona N4 production is confirmed; N3/Blackwell-class chips won't be in Arizona volume production until 2027."**
   - Confidence: N4 confirmation = 95 (already happening). N3 volume 2027 = 60.
   - Timeframe: N3 production 2027
   - Evidence: Fab 21 Phase 1 producing N4 for Apple and NVIDIA Blackwell (confirmed). Phase 2 (N3) equipment installation targeting Q3 2026, production 2027. Original prediction of "volume production of advanced nodes by H2 2026" was slightly off — N4 counts as advanced but not the most AI-critical nodes. Revising to track N3 specifically.
   - Status: active, partially confirmed (N4), extended for N3
   - Stated: 2026-02-28, updated 2026-03-01

4. **"The Ornn compute index will add geographic delivery specifications by Q4 2026."** [NEW]
   - Confidence: 55
   - Timeframe: Q4 2026
   - Evidence: BIS policy bifurcation forces index differentiation; institutional clients will demand geographic specification for regulatory compliance; basis between US-domestic and export-eligible compute will widen.
   - Status: active
   - Stated: 2026-03-01

5. **"The April 14 Commerce/USTR semiconductor tariff review will recommend tariff expansion, but execution will be delayed."** [NEW]
   - Confidence: 50
   - Timeframe: April–June 2026
   - Evidence: Trump tariff pattern consistent with recommending expansion; 90-day structure designed to produce recommendations; semiconductor as geopolitical leverage. But Taiwan deal signals some partners can negotiate out; White House (Sacks) prefers chip access over restriction for US firms; political counterforces.
   - Status: active
   - Stated: 2026-03-01

---

## Key Dates to Watch

- **April 14, 2026:** Commerce/USTR deadline to report to Trump on semiconductor trade negotiations → potential "significant" broader tariff recommendation
- **July 1, 2026:** Commerce Secretary update on datacenter GPU market → President determines tariff modification
- **August 2, 2026:** EU AI Act full enforcement begins. 10²³/10²⁵ FLOP thresholds enforceable. Fines of up to 3% global turnover live.
- **Q3 2026:** TSMC Fab 21 Phase 2 equipment installation (N3 process) — watch for yield reports and schedule slippage
- **Ongoing:** Senate consideration of Remote Access Security Act and Digital Commodity Intermediaries Act
- **Ongoing:** Bermuda BMA approval for Architect/Ornn AX exchange

---

## Source Links

### Regulatory
- CFTC press releases: cftc.gov/PressRoom
- BIS export control announcements: bis.gov/press-releases
- EU AI Act: artificialintelligenceact.eu
- IOSCO: iosco.org
- Congress.gov: H.R. 2683 (Remote Access Security Act), H.R. 6875 (AI Overwatch Act)
- Federal Register: Revision to License Review Policy for Advanced Computing Commodities (Jan 15, 2026)

### Supply Chain
- TSMC investor relations: investor.tsmc.com
- ASML investor relations: asml.com/en/investors
- SemiAnalysis (Dylan Patel): semianalysis.com
- Tom's Hardware (consumer GPU pricing/availability, Huawei Ascend coverage)
- Data Center Dynamics: datacenterdynamics.com (TSMC Arizona, datacenter power)

### Compute Markets
- Ornn Data: ornn.ai (index methodology)
- Architect Financial: architectfinancial.com (AX exchange)
- Introl Blog: introl.com/blog (GPU export policy analysis)

### Think Tanks & Analysis
- CSIS (Center for Strategic & International Studies): csis.org — technology policy
- Brookings Institution: brookings.edu — tech regulation
- RAND Corporation: rand.org — semiconductor supply chain
- Carnegie Endowment: carnegieendowment.org — tech competition
- Information Technology & Innovation Foundation (ITIF): itif.org
- Middle East Institute: mei.edu — Gulf sovereign compute

---

## Calibration Notes

- Initial knowledge base seeded 2026-02-28
- First patrol completed 2026-03-01
- January 2026 was an unusually dense policy month — multiple simultaneous legislative/regulatory actions. Next patrol should assess Senate progress on H.R. 2683 and H.R. 6875.
- Compute commodity regulatory classification is genuinely novel — no direct precedent. Electricity deregulation parallel now stronger than crypto parallel.
- Geographic compute basis differentiation is emerging faster than expected — Ornn index methodology is a key tracking item.
- Energy cost data tracking: identified primary sources (EIA regional power costs, datacenter operator PPA disclosures, Gulf state energy announcements).
- Cross-reference with Competition Researcher on Ornn/Architect regulatory developments and HUMAIN competitive positioning.
- Prior knowledge stated Ornn pursuing CFTC DCM license — this was incorrect. Ornn/Architect went Bermuda-first. Update confirmed.

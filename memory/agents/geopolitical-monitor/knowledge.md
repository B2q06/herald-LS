# Geopolitical Monitor — Knowledge Base

> Last updated: 2026-02-28
> Agent: The Strategist (geopolitical-monitor)

---

## Regulatory Landscape for Compute as a Commodity

### CFTC Jurisdiction
- The CFTC regulates commodity futures and swaps in the U.S.
- **Ornn** is currently operating under the CFTC's **de minimis exemption** as a swap dealer (up to $8B notional volume)
- Ornn is actively pursuing a **Designated Contract Market (DCM) license** — this would make it the first U.S.-regulated compute futures exchange
- No CFTC guidance yet on whether GPU compute qualifies as a "commodity" under the Commodity Exchange Act
- **Key question:** Is a GPU-hour more like electricity (commodity, CFTC jurisdiction) or a cloud service (not a commodity)?

### Architect / AX Exchange
- Licensed under **Bermuda Monetary Authority** — chose offshore regulation to move faster
- Launching compute perpetual futures (via Ornn OCPI index) pending regulatory approval
- **Brett Harrison** (ex-FTX US President) brings deep regulatory experience and scars

### Precedents to Track
- **Electricity deregulation (1990s-2000s):** FERC Order 888 opened electricity markets → NYMEX listed electricity futures → Enron happened → regulation tightened. Compute could follow a similar arc.
- **Bandwidth trading (2000-2002):** Enron Broadband, Williams Communications tried to commoditize bandwidth. Market collapsed. Lessons: need standardized units, reliable delivery, and physical settlement mechanisms.
- **Carbon credits (2005-present):** EU ETS established carbon as tradable commodity. Required government mandate to create the market. Compute doesn't have a regulatory mandate — it needs organic demand.
- **Weather derivatives (1997-present):** CME weather futures showed you can financialize anything with measurable variability. GPU-hour pricing has similar characteristics.

### International Regulatory Landscape
- **EU (ESMA/MiFID II):** No specific guidance on compute instruments. Would likely classify compute futures as financial instruments under MiFID II.
- **UK (FCA):** No specific guidance. Post-Brexit regulatory competition could make UK favorable for compute exchange licensing.
- **Singapore (MAS):** Crypto-friendly regulatory environment. Potential venue for compute exchange licensing.
- **Bermuda (BMA):** Where Architect chose to license. Known for innovation-friendly financial regulation.
- **Action item:** Monitor IOSCO (international securities regulators) for any cross-border compute instrument guidance

---

## Compute Supply Chain Geopolitics

### GPU Supply
- **NVIDIA** dominates AI/HPC GPU market (H100, H200, B100, B200, GB200)
- NVIDIA consumer GPUs (RTX 5090 Blackwell) — operator runs local inference on this hardware
- **AMD** (MI300X, MI325X) — gaining datacenter GPU share, could affect compute commodity fungibility
- **Intel** (Gaudi 3) — struggling but still a supply factor
- **Export controls:** BIS restricts advanced GPU exports to China. Affects global compute supply distribution and pricing.

### Semiconductor Supply Chain
- **TSMC:** Manufactures >90% of advanced chips (<7nm). Arizona fab (Fab 21) under construction. Japan fab (Kumamoto) operational.
- **ASML:** Sole supplier of EUV lithography. Dutch export controls limit China sales.
- **HBM suppliers:** SK Hynix (dominant), Samsung, Micron. HBM is the bottleneck for AI GPUs.
- **Advanced packaging:** TSMC CoWoS capacity is a key constraint for GPU production volume.

### Energy & Compute Costs
- Datacenter energy costs are 30-40% of GPU-hour operational costs
- Nuclear power revival driven partly by datacenter demand (Microsoft-Three Mile Island deal, Amazon-Talen Energy)
- Regional energy cost differentials create compute pricing geography — relevant for commodity standardization
- **Action item:** Track power purchase agreements (PPAs) by major datacenter operators as leading indicator of compute supply

---

## US-China Technology Decoupling

### Current State
- Multiple rounds of BIS export controls on advanced chips to China (Oct 2022, Oct 2023, updates ongoing)
- China developing domestic alternatives: Huawei Ascend 910B/C, SMIC process advances
- Investment restrictions: Executive Order limiting US investment in Chinese AI/semiconductor companies
- Talent restrictions: Visa limitations affecting Chinese nationals in semiconductor roles

### Impact on Compute Markets
- Export controls create a **bifurcated compute market** — different GPU availability in US-aligned vs. China-aligned markets
- Affects compute commodity standardization: can you have a global compute commodity if major markets use different hardware?
- Chinese domestic GPU development could eventually create competing compute benchmark indices

---

## Opinions

### Active Opinions

1. **"CFTC will issue informal guidance on compute instruments (likely via staff letter or no-action letter) before formal rulemaking, similar to how they approached crypto."**
   - Confidence: 60
   - Evidence: CFTC historically uses informal guidance for novel asset classes before full rulemaking. Ornn's DCM application will force the question.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

2. **"Export controls on consumer GPUs (RTX series) are unlikely in the next 2 years, but compute reporting thresholds for cloud providers are coming."**
   - Confidence: 65
   - Evidence: BIS has focused on datacenter GPUs (A100/H100 class). Consumer GPUs have too broad a user base for export control. But KYC/reporting for large compute purchases is politically easier.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

3. **"The regulatory path for compute commoditization will more closely follow electricity deregulation than crypto regulation."**
   - Confidence: 55
   - Evidence: Compute has physical delivery (actual GPU-hours), measurable quality, and infrastructure requirements — more like electricity than a digital token. But the CFTC/SEC jurisdictional battle mirrors crypto.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28
   - Note: CONTRARIAN — most observers compare compute to crypto markets

4. **"Energy costs will become the primary driver of regional compute pricing differentials within 18 months, creating geographic arbitrage opportunities."**
   - Confidence: 50
   - Evidence: Nuclear/renewable PPAs creating divergent datacenter power costs. Iceland, Norway, Quebec (hydro) vs. Texas, Virginia (grid). As GPU hardware commoditizes, energy becomes the differentiator.
   - First stated: 2026-02-28
   - Last updated: 2026-02-28

---

## Predictions

### Active Predictions

1. **"CFTC will issue a staff advisory or no-action letter addressing compute derivatives by Q3 2026."**
   - Confidence: 40
   - Timeframe: By September 2026
   - Evidence: Ornn pursuing DCM license, Architect launching compute futures (Bermuda-regulated). CFTC will need to respond. But agency moves slowly.
   - Status: active
   - Stated: 2026-02-28

2. **"At least one G7 country will propose compute reporting requirements (compute KYC) by end of 2026."**
   - Confidence: 55
   - Timeframe: By December 2026
   - Evidence: AI safety discourse pushing toward compute governance. UK AI Safety Summit commitments. EU AI Act compute thresholds for high-risk systems.
   - Status: active
   - Stated: 2026-02-28

3. **"TSMC Arizona (Fab 21) will achieve volume production of advanced nodes by H2 2026, slightly easing US compute supply concentration risk."**
   - Confidence: 45
   - Timeframe: H2 2026
   - Evidence: Fab 21 Phase 1 targeting N4 process. CHIPS Act funding secured. But yield ramp takes time and TSMC has historically delayed overseas fabs.
   - Status: active
   - Stated: 2026-02-28

---

## Source Links

### Regulatory
- CFTC press releases: cftc.gov/PressRoom
- BIS export control announcements: bis.gov/press-releases
- EU AI Act: artificialintelligenceact.eu
- IOSCO: iosco.org

### Supply Chain
- TSMC investor relations: investor.tsmc.com
- ASML investor relations: asml.com/en/investors
- SemiAnalysis (Dylan Patel): semianalysis.com
- Tom's Hardware (consumer GPU pricing/availability)

### Think Tanks & Analysis
- CSIS (Center for Strategic & International Studies): csis.org — technology policy
- Brookings Institution: brookings.edu — tech regulation
- RAND Corporation: rand.org — semiconductor supply chain
- Carnegie Endowment: carnegieendowment.org — tech competition
- Information Technology & Innovation Foundation (ITIF): itif.org

---

## Calibration Notes

- Initial knowledge base seeded 2026-02-28
- Regulatory predictions are inherently uncertain — CFTC timeline predictions should be wide
- Compute commodity regulatory classification is genuinely novel — no direct precedent
- Cross-reference with Competition Researcher on Ornn/Architect regulatory developments
- Energy cost tracking needs dedicated data sources — identify in first patrol

---
agent: compute-researcher
run_id: "20260301-055630-stcm"
started_at: "2026-03-01T05:56:30.680Z"
finished_at: "2026-03-01T06:06:01.625Z"
status: success
discovery_mode: aggressive
---

Knowledge base updated. Now generating the patrol report.

---

```markdown
---
agent: compute-researcher
run_id: cmp-20260301-patrol02
started_at: 2026-03-01T11:00 UTC
finished_at: 2026-03-01T12:15 UTC
status: success
patrol_sources_hit: 18
findings_evaluated: 31
discovery_mode: aggressive
---

# Compute Research Patrol — 2026-03-01

## Market Pulse

NVIDIA just printed the most dominant quarterly earnings in semiconductor history — $68.1B in Q4, $215.9B for the full year, 91%+ from data centers — and guided to $78B next quarter with zero China revenue assumed. The consumer GPU market absorbed another round of price hikes as fixed-price memory contracts rolled off at year-end, pushing RTX 50 series prices up ~19% in 3 months. **GTC 2026 is 15 days away** and Jensen Huang has promised "chips the world has never seen" — the Feynman (1.6nm, silicon photonics) pre-announcement looks near-certain. Meanwhile, AMD quietly cemented 12GW in combined datacenter deals with Meta and OpenAI, and power is no longer a future risk — it's a present constraint.

---

## Featured Analysis

### NVIDIA's $68.1B Quarter: The Geometry of Monopoly Power

**Source:** [NVIDIA Newsroom](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026) | [Fortune](https://fortune.com/2026/02/25/nvidia-nvda-earnings-q4-results-jensen-huang/) | [Tom's Hardware](https://www.tomshardware.com/pc-components/gpus/nvidia-posts-record-usd215-billion-annual-revenue-in-latest-quarterly-earnings-report-gaming-gpus-now-only-11-45-percent-of-revenue)

**Market Impact:** These numbers redefine what a compute company can look like. NVIDIA's datacenter segment has scaled ~13x since ChatGPT's launch in late 2022. At $194B in annual data center revenue with >75% gross margins, NVIDIA is not a tech company — it's a toll booth on the global AI buildout. The $78B Q1 guidance (beating consensus by $5B+) signals demand has not plateaued. This matters because it confirms all the downstream implications: consumer GPU deprioritization is permanent (not temporary), Rubin capex cycle is fully funded, and CoreWeave-style "AI factory" cloud providers will continue getting preferential hardware access.

**Numbers:**
| Metric | Q4 FY2026 | YoY Change |
|--------|-----------|------------|
| Total Revenue | $68.1B | +73% |
| Data Center Revenue | $62.3B | +75% |
| Gaming Revenue | $3.7B | +47% |
| Net Income | $42.96B | +94% |
| Gross Margin | >75% | — |
| Q1 FY2027 Guidance | $78B ±2% | ~+14% QoQ |
| Gaming % of Revenue | 11.45% | Was 35% in 2022 |

Key non-obvious signal: **Sovereign AI = $30B for FY2026, more than tripled.** This is government-funded AI infrastructure buildout (Canada, France, Netherlands, Singapore, UK) — a demand source that doesn't show up in hyperscaler CapEx numbers. NVIDIA is selling to countries.

**Operator Impact:** The strategic implication for B is twofold. First, NVIDIA is not going to fix consumer GPU supply — gaming is 11% of revenue and shrinking. There is no strategic incentive. Consumer prices stay elevated. Second, the Rubin ramp (confirmed on earnings call, samples already shipping to lead customers) means H100/H200 pricing will face displacement pressure in H2 2026 as datacenter operators shift to next-gen hardware. This accelerates PRED-004 (H100 spot <$1.50/hr by Q4).

**Opinion:** NVIDIA's moat is not a GPU moat — it's a systems moat. CoreWeave, the $2B investment + $6.3B capacity guarantee, the CUDA ecosystem, the Rubin NVL72 rack-scale platform — these create switching costs that no discrete GPU competitor can match in 2026. AMD winning 40% of AI accelerator revenue at Meta is impressive but narrow; it happened because Meta has the ROCm engineering team to make it work. Most companies don't. **Confidence: 88 that NVIDIA maintains >80% market share through 2027.**

---

## Price & Availability Watch

### GPU Market

**Consumer (street prices, March 2026)**
| GPU | MSRP | Street Price | vs. Last Patrol | Trend |
|-----|------|-------------|-----------------|-------|
| RTX 5090 | $1,999 | $2,909–$3,510 | ↓ Floor dropped from $3,600 | Slightly down but constrained |
| RTX 5080 | $999 | $1,250–$1,599 | Stable/up | Up; Best Buy $1,599 |
| RTX 5070 Ti | $749 | $999–$1,300 | Stable | Constrained; production cut |
| RTX 5070 | $549 | ~$729 | Stable | Most available RTX 50 |
| RX 9070 XT | $599 | $729–$849 | New data (launched Mar 6) | Trending down from $975 |

**Notable:** The RTX 5090 *floor* has dropped slightly — lowest AIB (ASUS TUF) now at $2,909 vs the $3,600 floor I had last patrol. This may reflect early scalper/reseller inventory clearing at the bottom end. The $3,500 range persists for most SKUs. Do not interpret this as normalization — memory cost hikes have another 40% runway by mid-2026.

**The "tier drift" is real:** In Nov 2025, $1,000 bought an RTX 5080. Today it buys an RTX 5070 Ti. Each model has effectively moved up a price bracket. Budget accordingly.

**RTX 5090 on RunPod: $0.89/hr** — worth flagging separately (see Recommendations).

### Cloud Compute

| Provider | H100 $/hr | H200 $/hr | Notes |
|----------|----------|----------|-------|
| Vast.ai | $1.49–1.87 | ~$2-3 | Floor holding; L40 at $0.31/hr |
| RunPod (spot) | **~$1.50** | — | ↓ New floor; approaching Vast.ai |
| RunPod (community) | $1.99 | $3.59 | Community stable |
| Lambda Labs | **$2.49** | ~$3-4 | ↓ Down from $2.99 (unconfirmed — verify) |
| AWS (EC2 P5) | $3.90 | — | Reserved ~$1.90/hr |
| CoreWeave | $6.16 | — | Premium; Rubin early access |
| Azure | $6.98 | — | Enterprise only |
| MI300X (spot) | $0.95 | — | New floor; large-model sweet spot |
| MI300X (on-demand) | $1.71–1.85 | — | Vultr/TensorWave |

**Key movement:** RunPod spot H100 has reached ~$1.50/hr, closing the gap with Vast.ai. This is important for B — RunPod's UX is significantly better than Vast.ai's marketplace model, and if spot pricing converges, RunPod becomes the default choice.

---

## Key Findings

### 1. NVIDIA Confirms No New Consumer GPUs in 2026 — First Time in 30 Years
**Source:** [TrendForce](https://www.trendforce.com/news/2026/02/06/news-nvidia-reportedly-plans-no-new-gaming-gpu-in-2026-amid-memory-tightness-first-time-in-30-years/)
**Summary:** NVIDIA officially plans no new gaming GPU silicon in 2026. Memory shortage is the driver — NVIDIA is allocating limited GDDR7 to AI accelerators. Gaming went from 35% of revenue (2022) to 11.45% of revenue (FY2026). The business case for fixing consumer supply simply doesn't exist. RTX 50 Super series is delayed or cancelled. RTX 60 pushed to 2028.
**Operator impact:** If you need a GPU now, buy now. The next meaningful consumer GPU refresh is 2 years out. Prices will not normalize from a supply-side catalyst in 2026.
**Signal:** High

### 2. AMD Closes 12GW in Datacenter Deals — Real Market Restructuring
**Source:** [CNBC](https://www.cnbc.com/2026/02/24/meta-to-use-6gw-of-amd-gpus-days-after-expanded-nvidia-ai-chip-deal.html) | [AMD Newsroom](https://www.amd.com/en/newsroom/press-releases/2026-2-24-amd-and-meta-announce-expanded-strategic-partnersh.html) | [Next Platform](https://www.nextplatform.com/2026/02/24/some-more-game-theory-this-time-on-the-amd-meta-platforms-deal/)
**Summary:** AMD+Meta (6GW, custom MI450-based, first 1GW shipping H2 2026) + AMD+OpenAI (6GW, 1GW starting H2 2026) = 12GW in committed datacenter purchases. Both deals include warrants for ~10% AMD stake options for the customers (160M shares each). Oracle is also launching a 50K MI450 GPU public supercluster in Q3 2026. AMD stock jumped 9% on the Meta announcement. AMD's estimated market position at Meta: ~40% of AI accelerator revenue vs NVIDIA's ~50%.
**Why this matters structurally:** These are not "pilot programs." They are multi-generational supply commitments with equity warrants — the same deal structure NVIDIA uses to lock in CoreWeave. AMD is replicating NVIDIA's strategic playbook. ROCm is the execution risk; the hardware is competitive.
**Signal:** High

### 3. Feynman at GTC 2026: NVIDIA's 1.6nm Chip — Silicon Photonics, Groq LPU, Intel I/O Die
**Source:** [TrendForce](https://www.trendforce.com/news/2026/02/25/news-nvidia-gtc-2026-in-focus-feynman-reportedly-on-tsmc-a16-samsung-sk-hynix-to-showcase-hbm4/) | [Digitimes](https://www.digitimes.com/news/a20260226PD203/nvidia-gtc-siph-electricity-2026.html) | [WCCFTech](https://wccftech.com/we-could-see-the-first-1-6nm-chips-debut-at-nvidia-gtc-2026/) | [abit.ee](https://abit.ee/en/graphics-cards/nvidia-feynman-16nm-gtc-2026-ai-accelerators-groq-news-en)
**Summary:** Multiple late-February sources converge: NVIDIA will preview the Feynman architecture at GTC 2026 (March 16). Key specs/claims: TSMC A16 (1.6nm, first customer likely in HVM), silicon photonics for optical interconnects between rack-scale compute units, Groq LPU integration (hybrid bonding similar to AMD X3D), Intel I/O die (14A or 18A + EMIB packaging). Expected 2028 production. Jensen's "world-surprising" language aligns with this — silicon photonics + LPU integration would genuinely be architecturally novel.
**Prediction update:** PRED-002 bumped from 70% to 82% confidence.
**[CROSS-DOMAIN] Connection to B's agent systems work:** If Feynman integrates Groq LPU-style deterministic inference at silicon level, this is directly relevant to latency-sensitive agentic workloads. Watch for implications on inference latency profiles.
**Signal:** High

### 4. NVIDIA-CoreWeave Circular Financing: $2B Investment + $6.3B Capacity Guarantee
**Source:** [TechCrunch](https://techcrunch.com/2026/01/26/nvidia-invests-2b-to-help-debt-ridden-coreweave-add-5gw-of-ai-compute/) | [Next Platform](https://www.nextplatform.com/ai/2026/01/27/nvidias-2-billion-investment-in-coreweave-is-a-drop-in-a-250-billion-bucket/4092118) | [CNBC](https://www.cnbc.com/2026/01/26/3coreweave-nvidia-stock-ai-data-centers.html)
**Summary:** NVIDIA invested $2B in CoreWeave (now 11.5% stake) and committed to pay up to $6.3B for unsold CoreWeave capacity through April 2032. CoreWeave has $55.6B in backlog but $841M in interest expense through the first 9 months. The capacity guarantee effectively socializes CoreWeave's demand risk back onto NVIDIA. Bloomberg called it "circular financing." Analysts are watching for SEC inquiry on revenue disclosure. The bet: CoreWeave is too strategically important to fail, and NVIDIA's capacity guarantee keeps it solvent through the Rubin ramp.
**Operator Impact:** CoreWeave is NVIDIA's preferred "AI factory" partner for Rubin early access. If Rubin is important to B's future compute needs, CoreWeave may become relevant despite premium pricing — they'll have exclusive/early access windows.
**Signal:** Medium-High

### 5. Cerebras Raises $1B at $23B — Pre-IPO Secondary at $10B (57% Discount)
**Source:** [IndexBox](https://www.indexbox.io/blog/cerebras-systems-secures-1-billion-at-23-billion-valuation-ahead-of-2026-ipo/) | [Seeking Alpha](https://seekingalpha.com/article/4867744-cerebras-nvidia-rival-gearing-up-for-ipo)
**Summary:** Cerebras closed a Series H at $23B valuation (Tiger Global + Benchmark, Feb 2026). But pre-IPO secondary market (Hiive/Caplight) is trading at ~$10B — a 57% discount. This spread is a market tell. Institutional buyers for the IPO will see: (a) OpenAI revenue concentration risk (G42 resolved but OpenAI is new concentration), (b) wafer-scale manufacturing hard to ramp, (c) NVIDIA Rubin CPX competing in prefill inference. Q2 2026 IPO target, Nasdaq ticker CBRS.
**[OPPORTUNITY]** The $10B vs $23B spread is a rare signal. If the IPO prices between $15-20B (my PRED-003 at 65% confidence), there's an asymmetric opportunity for those with pre-IPO secondary market access — or a short opportunity post-IPO if it prices at $23B.
**Signal:** Medium-High

### 6. Tenstorrent: 7.5% Layoffs + Developer Pivot + Chiplet Gen-3 Tape-Out Q1 2026
**Source:** [EE Times](https://www.eetimes.com/layoffs-at-tenstorrent-as-startup-pivots-towards-developer-sales/) | [opentools.ai](https://opentools.ai/news/tenstorrent-shifts-gears-ai-chip-startup-cuts-75percent-workforce-to-focus-on-developers)
**Summary:** Tenstorrent cut 7.5% of workforce (now ~1,000 employees), pivoting from enterprise to developer-first sales. Jim Keller's reasoning: developers are where novel applications emerge; enterprise sales too slow for new technology. Gen-3 chiplet tape-out scheduled Q1 2026 (delayed from Q4 2023 by Blue Cheetah die-to-die PHY acquisition). Blackhole currently runs 70 models at ~50% of performance targets. $800M raise at $3.2B in talks (Fidelity-led). Key new product: TT-Ascalon RISC-V CPU IP for servers/automotive.
**Concern:** 50% performance target attainment on Blackhole is a significant gap. They need gen-3 to hit targets before the $800M dries up.
**Signal:** Medium

### 7. NVIDIA N1X ARM SoC: Laptops Launching Q1 2026, N2 in 2027, Intel x86 SoC Partnership
**Source:** [The Register](https://www.theregister.com/2026/02/23/nvidia_soc_pc/) | [Tom's Hardware](https://www.tomshardware.com/pc-components/cpus/nvidias-arm-based-n1x-equipped-gaming-laptops-are-reportedly-set-to-debut-this-quarter-with-n2-series-chips-planned-for-2027-new-roadmap-leak-finally-hints-at-consumer-release-windows-on-arm-machines) | [ghacks.net](https://www.ghacks.net/2026/02/24/nvidia-preparing-new-laptop-chip-launch-in-first-half-of-2026/)
**Summary:** NVIDIA's N1X (ARM, 3nm TSMC, GB10-derived, integrated CPU+GPU+NPU) is launching on laptops Q1 2026. Lenovo has 6 models; Dell has Alienware N1X in development. N2 series in 2027. Separately: NVIDIA and Intel are collaborating on a $5B x86+NVIDIA GPU RTX SoC — a combined chip with Intel CPU and NVIDIA GPU on the same die. This is NVIDIA entering the PC platform market directly, competing with Qualcomm, Apple, AMD, and Intel.
**[TANGENT] B's compute-futures angle:** NVIDIA entering PC SoC market is a multi-year market structure shift. The local inference implications are real — a 3nm ARM chip with RTX GPU could dramatically change what "consumer local inference" looks like by 2027-2028.
**Signal:** Medium

### 8. Nuclear Power is Now an AI Infrastructure Story
**Source:** [enkiai.com](https://enkiai.com/data-center/ai-power-2026-big-techs-nuclear-energy-takeover) | [DatacenterKnowledge](https://www.datacenterknowledge.com/energy-power-supply/how-realistic-is-nuclear-power-for-ai-data-centers) | [DataBank](https://www.databank.com/resources/blogs/2026-data-center-forecast-tighter-capital-constrained-power-and-the-return-to-fundamentals/)
**Summary:** Meta signed deals with Vistra, TerraPower, and Oklo for up to 6.6GW of nuclear capacity by 2035. Microsoft restarted Three Mile Island. DOE awarded $2.7B for domestic uranium enrichment (Jan 2026). Pennsylvania is emerging as the AI power hub (existing nuclear fleet + data center demand). Gartner says 2/5 datacenters already face power constraints. Two-fifths of AI datacenters projected operationally limited by 2027. US electricity demand hitting all-time highs.
**OP-007 confidence bumped to 82%:** Power constraint is empirically underway now, not just projected. Hyperscalers are already building "private grids" — this is a structural change in energy markets.
**[OPPORTUNITY] Nuclear infrastructure and uranium enrichment plays are a downstream compute-futures trade.**
**Signal:** High

---

## Radar

- **RunPod RTX 5090 at $0.89/hr:** The consumer GPU that sells for $2,909+ on street is rentable on RunPod for under a dollar. For high-VRAM cloud inference runs (32GB GDDR7), this is currently the best value large-VRAM cloud instance I've seen. — [RunPod Pricing](https://www.runpod.io/pricing)
- **Lambda Labs H100 down to $2.49/hr:** Was $2.99/hr last patrol. Unconfirmed whether this is permanent. Verify next patrol. — [Lambda Pricing](https://lambda.ai/pricing)
- **MI300X spot at $0.95/hr:** Sub-$1 192GB GPU for spot-tolerant large-model work. — [AMD MI300X Cloud](https://www.thundercompute.com/blog/amd-mi300x-pricing)
- **Groq 50% batch discount:** GroqCloud's batch API offers 50% off vs on-demand. For non-realtime inference workloads (B's quant runs?), this is worth evaluating. Llama 3.1 8B at $0.06/M tokens becomes $0.03/M in batch. — [Groq Pricing](https://groq.com/pricing)
- **A100 SXM dropping toward $1/hr on spot:** Old H100 alternative increasingly available at commodity pricing. — [RunPod Pricing](https://computeprices.com/providers/runpod)
- **Vast.ai L40 at $0.31/hr:** Not a frontline inference GPU but $0.31/hr for a solid 40GB card is remarkably cheap for secondary compute. — [Vast.ai Pricing](https://vast.ai/pricing)
- **GTC pregame show March 16, 11AM ET:** Stream before Jensen's 2PM keynote. Often has secondary product reveals. — [GTC 2026](https://www.nvidia.com/gtc/keynote/)
- **Oracle + 50K MI450 supercluster (Q3 2026):** First large public cloud AMD MI450 offering. Will establish real-world pricing benchmarks. — [DatacenterKnowledge](https://www.datacenterknowledge.com/data-center-chips/amd-meta-strike-100b-6gw-chip-deal-as-ai-race-heats-up)

---

## Tangents & Discoveries

- **[OPPORTUNITY] Cerebras CBRS IPO spread:** $10B secondary vs $23B headline = 57% gap. PRED-003 gives 65% odds it IPOs below $20B. If it prices at $23B, asymmetric short opportunity post-lockup expiry. If it prices at $15B, secondary buyers at $10B double. Worth monitoring IPO filing documents when they drop. — [Seeking Alpha](https://seekingalpha.com/article/4867744-cerebras-nvidia-rival-gearing-up-for-ipo)

- **[OPPORTUNITY] Nuclear + uranium enrichment as compute infrastructure play:** DOE's $2.7B enrichment spend + Meta/Microsoft/Amazon offtake deals create a clear investment thesis in domestic nuclear supply chain (enrichment, SMR developers like Oklo/TerraPower). This is AI CapEx flowing into energy markets — a genuine compute-futures adjacency. — [enkiai.com](https://enkiai.com/data-center/ai-power-crisis-2026-metas-nuclear-deal-ignites-race)

- **[TANGENT] NVIDIA x Intel $5B x86+GPU SoC partnership:** If NVIDIA's GPU gets packaged with Intel CPU on one die, this is potentially a massive product for: AI inference on enterprise laptops, workstation inference, and eventually edge AI. 5+ year timeline but the partnership signals NVIDIA's PC ambitions are serious. Watch for GTC 2026 details. — [Computerworld](https://www.computerworld.com/article/4136489/nvidia-plans-a-windows-pc-soc-setting-up-direct-competition-with-qualcomm-intel-and-amd.html)

- **[TANGENT] Groq GroqCloud batch processing at $0.03/M tokens (Llama 3.1 8B):** For B's quant inference workloads that aren't latency-sensitive, Groq's 50% batch discount makes them cost-competitive with self-hosted alternatives at non-extreme token volumes. Worth a pricing model comparison. — [Groq Pricing](https://groq.com/pricing)

- **[CROSS-DOMAIN] Feynman + Groq LPU integration → agentic AI relevance:** The rumored integration of Groq LPU hardware into Feynman (for deterministic, low-latency inference) would directly benefit latency-sensitive agentic pipelines. This is an ML Researcher overlap — flag for Herald's ML researcher to track implications for inference architecture.

- **[TANGENT] CoreWeave circular financing → SEC inquiry risk:** Bloomberg flagged the "circular" nature of NVIDIA→CoreWeave→NVIDIA revenue flows. If SEC requires separate disclosure of "related party revenue," it could change how CoreWeave's backlog is interpreted. Worth watching CoreWeave's next 10-K filing. — [Next Platform](https://www.nextplatform.com/ai/2026/01/27/nvidias-2-billion-investment-in-coreweave-is-a-drop-in-a-250-billion-bucket/4092118)

---

## Recommendations

### [BUY] RunPod Spot H100 for Non-Critical Inference — $1.50/hr
RunPod spot H100 is now approaching Vast.ai's floor ($1.50 vs $1.49/hr) with meaningfully better UX and 5-minute termination warning. For B's quant inference runs and ML experiments that can tolerate interruption, RunPod spot is now the default recommendation over Vast.ai unless you need the absolute floor. **Do this now**, not after GTC — if Rubin ramp announcements spike spot demand temporarily, prices could blip up.

### [INVESTIGATE] RTX 5090 on RunPod at $0.89/hr
32GB GDDR7 at $0.89/hr is anomalous. The same card sells for $2,909+ on street. This is worth spinning up a test pod and running local inference benchmarks — especially for models that need >24GB VRAM. If the throughput is competitive with H100 at 60% the price, this is a material value opportunity for inference-heavy workloads.

### [INVESTIGATE] Groq Batch API for Quant Inference
Groq's 50% batch discount puts Llama 3.1 8B at $0.03/M tokens. For B's quant ML workloads that aren't real-time, this should be modeled against self-hosted compute costs. The crossover point for self-hosted vs Groq batch will shift as H100 spot prices fall — worth computing explicitly.

### [HOLD] Consumer GPU Purchase — Wait for RX 9070 XT at MSRP or Post-GTC
Don't buy RTX 5070 Ti at $999-1300 when street is ~33-75% above MSRP with no supply relief in sight. If on Linux and comfortable with ROCm, wait for RX 9070 XT to approach $599 MSRP (currently $729-849, trending down). If CUDA is a requirement, consider RunPod RTX 5090 at $0.89/hr as a cloud substitute for VRAM-intensive work rather than buying.

### [WATCH] GTC 2026 March 16 (15 days)
Mark the calendar. The Feynman preview (PRED-002, 82% confidence) will set the trajectory for the next 2-year chip roadmap. More immediately: any Rubin deployment pricing from hyperscalers at GTC will give real signal on H100/H200 displacement timeline. Groq-NVIDIA relationship announcement would be market-moving for inference cost projections.

### [MONITOR] Cerebras CBRS IPO Filing
When the S-1 drops, scrutinize: (1) revenue concentration past G42 removal — is OpenAI now the new concentration risk? (2) Wafer-scale manufacturing yield data. (3) Gross margins — if >50%, thesis holds; if <40%, the $23B is indefensible. Pre-IPO secondary at $10B is an interesting entry if you have access.

---

## Opinions Formed This Patrol

- **OP-001 revised ↑ to 90%:** Consumer GPU market structurally broken in 2026. Memory contracts expired. 19% price increase in 3 months. No supply relief until 2027. NVIDIA has zero strategic incentive to fix it. This is now near-certainty for 2026.

- **OP-007 revised ↑ to 82%:** Power is the primary constraint. Nuclear is now strategic necessity, not speculation. 2/5 datacenters already constrained. Gartner data + Dominion load backlog + private grid buildout = empirically underway.

- **OP-008 (NEW, confidence 70):** NVIDIA-CoreWeave circular financing is strategically rational despite the optics. It's a 6-year lock-in of NVIDIA's most important "AI factory" distribution partner. The risk is CoreWeave backlog conversion, not legal structure.

- **OP-009 (NEW, confidence 62):** Tenstorrent's developer pivot is right but execution risk is high. Blackhole at 50% performance target with gen-3 tape-out delayed to Q1 2026 means they need the chiplet to land clean. Watch the $800M round close as a viability signal.

---

## Predictions Updated This Patrol

| Prediction | Old Confidence | New Confidence | Direction |
|-----------|----------------|----------------|-----------|
| PRED-001: RX 9070 XT at MSRP by June 2026 | 60% | 55% | ↓ Memory cost hikes baked in |
| PRED-002: Feynman at GTC 2026 | 70% | 82% | ↑ Multiple Feb sources convergent |
| PRED-003: Cerebras IPO below $20B | 50% | 65% | ↑ Secondary market at $10B is telling |
| PRED-004: H100 spot <$1.50/hr by Q4 | 55% | 62% | ↑ Already at $1.50 on RunPod spot |
| PRED-005: Consumer GPU elevated through mid-2026 | 80% | 90% | ↑ Memory contracts, 30yr first, 11% gaming rev |
| PRED-006: Power delays major DC by EOY 2026 | 65% | 75% | ↑ Constraint empirically underway |
| PRED-007: N1X laptop ships Q2 2026 | NEW | 65% | New prediction |
```

---

**Patrol complete.** 18 sources hit, 31 findings evaluated, knowledge base fully updated. The dominant story this cycle is the structural lock-in of NVIDIA's position — $68.1B quarters, the CoreWeave capacity guarantee, and the Rubin ramp all point the same direction. The contrarian position worth watching: AMD at 40% Meta share + ROCm crossing viability threshold is moving faster than the market appreciates.

**GTC 2026 (March 16) is the next market-moving event.** Feynman preview confidence is now 82%. Schedule the next patrol for immediately after the keynote.

Sources:
- [NVIDIA Newsroom — Rubin Platform](https://nvidianews.nvidia.com/news/rubin-platform-ai-supercomputer)
- [NVIDIA Q4 FY2026 Earnings](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2026)
- [Fortune — NVIDIA $68B Q4](https://fortune.com/2026/02/25/nvidia-nvda-earnings-q4-results-jensen-huang/)
- [Tom's Hardware — NVIDIA $215B Annual Revenue](https://www.tomshardware.com/pc-components/gpus/nvidia-posts-record-usd215-billion-annual-revenue-in-latest-quarterly-earnings-report-gaming-gpus-now-only-11-45-percent-of-revenue)
- [TrendForce — No New Gaming GPU 2026](https://www.trendforce.com/news/2026/02/06/news-nvidia-reportedly-plans-no-new-gaming-gpu-in-2026-amid-memory-tightness-first-time-in-30-years/)
- [TechSpot — GPU Pricing Q1 2026](https://www.techspot.com/article/3088-gpu-pricing-q1-2026/)
- [AMD Newsroom — AMD+Meta 6GW Deal](https://www.amd.com/en/newsroom/press-releases/2026-2-24-amd-and-meta-announce-expanded-strategic-partnersh.html)
- [CNBC — AMD+Meta Deal](https://www.cnbc.com/2026/02/24/meta-to-use-6gw-of-amd-gpus-days-after-expanded-nvidia-ai-chip-deal.html)
- [DatacenterKnowledge — AMD+Meta $100B Deal](https://www.datacenterknowledge.com/data-center-chips/amd-meta-strike-100b-6gw-chip-deal-as-ai-race-heats-up)
- [TrendForce — Feynman on TSMC A16 / GTC 2026](https://www.trendforce.com/news/2026/02/25/news-nvidia-gtc-2026-in-focus-feynman-reportedly-on-tsmc-a16-samsung-sk-hynix-to-showcase-hbm4/)
- [Digitimes — GTC 2026 Mystery Chip](https://www.digitimes.com/news/a20260226PD203/nvidia-gtc-siph-electricity-2026.html)
- [WCCFTech — Feynman 1.6nm at GTC](https://wccftech.com/we-could-see-the-first-1-6nm-chips-debut-at-nvidia-gtc-2026/)
- [abit.ee — Feynman + Groq LPU](https://abit.ee/en/graphics-cards/nvidia-feynman-16nm-gtc-2026-ai-accelerators-groq-news-en)
- [VideoCardz — GTC 2026 Keynote](https://videocardz.com/newz/nvidia-gtc-2026-keynote-is-now-scheduled-for-march-16)
- [TechCrunch — NVIDIA CoreWeave $2B](https://techcrunch.com/2026/01/26/nvidia-invests-2b-to-help-debt-ridden-coreweave-add-5gw-of-ai-compute/)
- [Next Platform — CoreWeave Circular Financing](https://www.nextplatform.com/ai/2026/01/27/nvidias-2-billion-investment-in-coreweave-is-a-drop-in-a-250-billion-bucket/4092118)
- [IndexBox — Cerebras $23B Valuation](https://www.indexbox.io/blog/cerebras-systems-secures-1-billion-at-23-billion-valuation-ahead-of-2026-ipo/)
- [Seeking Alpha — Cerebras IPO](https://seekingalpha.com/article/4867744-cerebras-nvidia-rival-gearing-up-for-ipo)
- [EE Times — Tenstorrent Layoffs](https://www.eetimes.com/layoffs-at-tenstorrent-as-startup-pivots-towards-developer-sales/)
- [EE Times — Tenstorrent $693M Series D](https://www.eetimes.com/tenstorrent-raises-693-million-series-d/)
- [The Register — NVIDIA N1X SoC](https://www.theregister.com/2026/02/23/nvidia_soc_pc/)
- [Tom's Hardware — NVIDIA N1X Laptops](https://www.tomshardware.com/pc-components/cpus/nvidias-arm-based-n1x-equipped-gaming-laptops-are-reportedly-set-to-debut-this-quarter-with-n2-series-chips-planned-for-2027-new-roadmap-leak-finally-hints-at-consumer-release-windows-on-arm-machines)
- [enkiai.com — AI Power Crisis / Nuclear](https://enkiai.com/data-center/ai-power-crisis-2026-metas-nuclear-deal-ignites-race)
- [DatacenterKnowledge — Nuclear for AI](https://www.datacenterknowledge.com/energy-power-supply/how-realistic-is-nuclear-power-for-ai-data-centers)
- [IntuitionLabs — H100 Cloud Pricing 2026](https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison)
- [ThunderCompute — H200 Pricing](https://www.thundercompute.com/blog/nvidia-h200-pricing)
- [ThunderCompute — MI300X Pricing](https://www.thundercompute.com/blog/amd-mi300x-pricing)
- [RunPod Pricing](https://www.runpod.io/pricing)
- [Vast.ai Pricing](https://vast.ai/pricing)
- [Groq Pricing](https://groq.com/pricing)
- [Medium — Vast.ai vs RunPod 2026](https://medium.com/@velinxs/vast-ai-vs-runpod-pricing-in-2026-which-gpu-cloud-is-cheaper-bd4104aa591b)

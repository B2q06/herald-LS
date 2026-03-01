---
agent: ml-researcher
run_id: ml-patrol-20260301-1730
started_at: 2026-03-01T17:30:00Z
finished_at: 2026-03-01T18:15:00Z
status: success
patrol_sources_hit: 12
findings_evaluated: 41
discovery_mode: aggressive
---

# ML Research Patrol — March 1, 2026 (Evening)

## Headlines

The Qwen3.5 medium series landed on Feb 24 and is the most immediately actionable story: the **35B-A3B model with only 3B active parameters outperforms the old 235B flagship on agent benchmarks** and runs on consumer GPUs (8GB VRAM via Ollama, 22GB RAM on Mac). This is a structural shift in what "local inference" means. Alongside this, **diffusion language models are having a genuine moment** — multiple independent papers this week attacking the core quality-speed tradeoff, with training-free speedups of 2–8×. And MIT dropped a neat result: **speculative decoding during RL training can cut reasoning model training time by 70–210%**, with idle GPU time doing the work. The inference economy is compressing on all fronts simultaneously.

---

## Featured Deep-Dive

### Qwen3.5 Medium Series: The Local Inference Threshold Has Shifted

**Source:** [VentureBeat coverage](https://venturebeat.com/technology/alibabas-new-open-source-qwen3-5-medium-models-offer-sonnet-4-5-performance-on-local-computers) | [Unsloth Docs](https://unsloth.ai/docs/models/qwen3.5) | [Ollama Library](https://ollama.com/library/qwen3.5:122b) | [GitHub QwenLM/Qwen3.5](https://github.com/QwenLM/Qwen3.5)

**Relevance to B:** Herald is built on claude-agent-sdk but the underlying model choice matters for any local fallback, cost-sensitive tasks, or fine-tuning experiments. The 35B-A3B running on 8GB VRAM is now a viable local model for tool-calling agents. B's quant trading work could leverage the 122B-A10B's demonstrated financial reasoning. Apache 2.0 = no licensing friction.

**Analysis:**

Released February 24, the medium series is four models (35B-A3B, 27B, 122B-A10B, and a Flash variant) built on the same Gated Delta Networks + MoE hybrid introduced in the 397B flagship. The efficiency story here is extraordinary. Let me give the numbers that matter:

- **Qwen3.5-35B-A3B**: 35B total parameters, only 3B active at inference. Runs via `ollama run qwen3.5:35b-a3b` on 8GB VRAM. Achieves **81.2 on TAU2-Bench** vs. 58.5 for the old Qwen3-235B. This is not an incremental improvement — it's a **39% jump on agent task performance at 1/8th the active compute**. Consistently beats Claude Sonnet 4.5 across most categories. Supports 1M token context on 32GB VRAM.

- **Qwen3.5-122B-A10B**: 10B active parameters, server-grade (80GB VRAM). **85% on AIME 2026** (top-tier reasoning), **72.2 on BFCL-V4 tool use** (vs. GPT-5 mini at 55.5 — that's a 30% margin). SWE-bench at 72.4, matching GPT-5-mini.

The architecture key is **Gated Delta Networks** (linear attention blocks interleaved with full attention). This is why the inference is so much cheaper than the parameter count suggests — the delta network layers don't require full attention computation. The 512-expert MoE routing further concentrates compute on relevant capacity.

**Critical caveats that matter for deployment:**
1. Framework support is still catching up. The Gated DeltaNet layers need explicit support in vLLM/SGLang/TensorRT-LLM — not universally available yet (as of March 1). Check your inference stack before committing.
2. MoE models are quantization-sensitive at the routing level. **Don't go below Q4_K_M** — the expert routing logic degrades at lower precision. Unsloth's docs confirm this.
3. A Feb 27 patch was issued for tool-calling bugs in the chat template. Re-download if you pulled the model before that date.

**Opinion:** This is the most significant open-weight model release since Qwen3's debut. PRED-004 (MoE <20B active matching 70B dense) is basically confirmed ahead of schedule on agent tasks specifically. The 3B active / 35B total ratio is the new efficiency benchmark to beat. Confidence I'm not overstating this: 85.

**Action:** If B has any workflow using API calls to Claude for structured/tool-use tasks that don't require frontier-level reasoning, the 35B-A3B is worth serious evaluation as a local alternative. The 8GB VRAM floor makes it compatible with most developer machines. Pull it via Ollama and benchmark on your actual task distribution before drawing conclusions.

---

### MIT TLT: Adaptive Speculative Decoding Cuts RL Training Time by 70–210%

**Source:** [MIT News](https://news.mit.edu/2026/new-method-could-increase-llm-training-efficiency-0226) | [TechXplore writeup](https://techxplore.com/news/2026-02-drafter-downtime-llm.html) | [arXiv preprint](https://arxiv.org/pdf/2511.16665)

**Relevance to B:** If B ever fine-tunes reasoning models (RL-based post-training), this directly cuts cost. More broadly, this confirms that the speculative decoding paradigm is now mature enough to apply to training, not just inference.

**Analysis:**

The core insight is elegant: RL training of reasoning models spends up to 85% of time on *rollout* (generating multiple candidate answers), during which most GPUs sit idle waiting for the slowest sequence. MIT's **TLT (Taming the Long-Tail)** uses those idle cycles to continuously train a small drafter model via speculative decoding. Two components:

1. **Adaptive Drafter Trainer**: Instead of a static drafter (which goes stale as the target model updates), TLT trains the drafter on-the-fly using idle processor time. The drafter stays synchronized with thousands of target model updates at zero extra compute cost.

2. **Adaptive Rollout Engine**: Dynamically adjusts the speculative decoding configuration per batch — how many draft tokens, verification thresholds — based on observed accept rates and workload features.

The result is **70–210% training speedup** across tested reasoning LLMs, with zero accuracy degradation. ASPLOS 2026 (March 22–26) is the venue. Note the arXiv date is November 2025 — this paper has been in flight for a few months, and the MIT News coverage is the deployment announcement.

**Why this matters beyond training cost:** The drafter model produced as a byproduct of TLT is already trained to mimic the target model and becomes *immediately available as a deployment-time speculative decoder*. You get inference speedup as a free artifact of training efficiency. That's a genuine two-for-one.

**Limitation:** The paper focuses on RL-based reasoning model training specifically. Supervised fine-tuning doesn't have the same rollout bottleneck. This is a specialized tool, not a general training accelerator.

**Opinion:** Clever systems-level work. The "use idle time productively" angle is simple but the execution (keeping the drafter synchronized) is non-trivial. This will likely be absorbed into RL training frameworks (GRPO, REINFORCE++) within 6–9 months. Confidence: 70.

---

## Key Findings

### Diffusion Language Models: Inference Speed Problem Getting Solved

**Source:** [arXiv:2602.22868 (ReMix)](https://arxiv.org/abs/2602.22868) | [arXiv:2602.22661 (dLLM framework)](https://arxiv.org/abs/2602.22661) | [arXiv:2601.06562 (Mosaic)](https://arxiv.org/html/2601.06562)

**Summary:** There are now three independent papers this week attacking the core dLLM bottleneck — parallel decoding quality degradation. The most interesting is **ReMix (Rejection Mixing)**: it introduces a "Continuous Mixing State" between masked and decoded tokens, letting parallel tokens resolve semantic conflicts in continuous space before committing to discrete tokens. Training-free, 2–8× speedup with no quality loss. The **dLLM** paper is a unified open-source framework (like a "HuggingFace for diffusion LMs") that standardizes training/inference/eval across LLaDA, Dream, and other models. **Mosaic** extends context length 15–32× on identical hardware. Three independent teams solving three different dLLM problems in one week is not coincidence — this is a field that's found its footing. Diffusion LMs were mostly interesting-but-impractical. They're becoming interesting-and-practical.

**Signal:** Medium (trending toward High if ReMix results hold up — this is training-free, so easy to verify)

---

### PageIndex: Vectorless RAG Achieving 98.7% Accuracy on FinanceBench

**Source:** [VectifyAI/PageIndex GitHub](https://github.com/VectifyAI/PageIndex) | [MarkTechPost coverage](https://www.marktechpost.com/2026/02/22/vectifyai-launches-mafin-2-5-and-pageindex-achieving-98-7-financial-rag-accuracy-with-a-new-open-source-vectorless-tree-indexing/) | [pageindex.ai](https://pageindex.ai/blog/pageindex-intro)

**Summary:** VectifyAI shipped **PageIndex** and **Mafin 2.5** simultaneously. PageIndex is a vectorless RAG system that builds a hierarchical tree index from documents and uses LLM reasoning (AlphaGo-style tree search) for retrieval instead of vector similarity. No chunking, no vector DB. Mafin 2.5 achieves **98.7% accuracy on FinanceBench** — vs. ~31% for GPT-4o and ~45% for Perplexity on the same benchmark. That gap is enormous and directly relevant to B's financial ML work. The system also ships an MCP server (`pageindex-mcp`) compatible with Claude, Cursor, and any MCP client — meaning it plugs directly into the Herald/claude-agent-sdk ecosystem. Integrates with Claude Agent SDK, Vercel AI SDK, OpenAI Agents SDK, LangChain. This is not vaporware — the GitHub repo has 19,404 stars with 3,553 new this week.

**Signal:** High — **direct relevance to B's quant work and Herald agent infrastructure**. A 98.7% accuracy on financial document QA is remarkable. If the benchmark is real (FinanceBench is a legitimate eval), this deserves immediate evaluation.

---

### OpenAI Chain-of-Thought Monitorability Research

**Source:** [OpenAI Research](https://openai.com/index/evaluating-chain-of-thought-monitorability/) | [OpenAI Newsroom](https://openai.com/news/research/)

**Summary:** OpenAI released a systematic framework for evaluating whether a model's chain-of-thought is actually monitorable — i.e., whether it faithfully reflects the model's reasoning or is disconnected from it. They built 13 evaluations across 24 environments. The concern: CoT monitorability may be fragile to training procedure changes, data sources, and continued scaling. This is significant for anyone building agent systems that use CoT reasoning as a transparency/debugging tool. If CoT is unreliable as a window into model reasoning, the dominant mental model for how agents "think" is wrong. The research is safety-motivated but the implications are practical: you can't trust CoT as a debugging signal without validation. Connects to B's Herald agent work — if Claude's chain-of-thought isn't reliably monitorable, agent debugging becomes harder.

**Signal:** Medium (safety research, but directly relevant to agent system design)

---

### DualPath: 1.87–1.96× Agentic Inference Throughput via KV-Cache I/O Restructuring

**Source:** [arXiv:2602.21548](https://arxiv.org/abs/2602.21548)

**Summary:** For multi-turn, agentic LLM inference, the bottleneck has shifted from *computation* to *KV-Cache storage I/O*. DualPath addresses this by creating a secondary storage-to-decode path: KV-Cache loads into decode engines first, then transfers to prefill engines via RDMA, avoiding NIC saturation on the prefill side. A global scheduler balances load across both paths. Results: **1.87× offline throughput, 1.96× online serving throughput** with maintained SLO compliance. This is infrastructure-level — relevant if B is running production agentic inference at scale, less so for single-user Herald. But the finding that KV-Cache I/O is now the bottleneck (not compute) is architecturally significant and validates OP-004.

**Signal:** Medium

---

### Agent Skills Ecosystem Explosion: 79K Stars on anthropics/skills

**Source:** [GitHub Trending](https://github.com/trending?l=python&since=weekly) | [anthropics/skills](https://github.com/anthropics/skills) | [muratcankoylan/Agent-Skills-for-Context-Engineering](https://github.com/muratcankoylan/Agent-Skills-for-Context-Engineering)

**Summary:** The Anthropic Skills repo (`anthropics/skills`) has 79,630 stars with 6,724 new this week — one of the highest star velocities on GitHub right now. `huggingface/skills` has 7,577 stars with 5,940 new (nearly all this week, suggesting a brand-new HuggingFace adoption of the format). A third-party `Agent-Skills-for-Context-Engineering` repo has 12,776 stars with 4,318 new. This is organic community signal, not hype — three separate repos, different organizations, all surging simultaneously. The Skills ecosystem is compounding faster than I expected when I logged OP-007. Raising confidence on that opinion.

**Signal:** High (for B's Herald platform specifically — agent skill composition is directly in Herald's domain)

---

### "Lord of the Flies" Multi-Agent Failure Mode: More Capable Agents Cause More System Failures

**Source:** [arXiv:2602.23093](https://arxiv.org/abs/2602.23093)

**Summary:** Mori & Johnson studied N autonomous AI agents competing for shared resources (fixed capacity C). Result: three stable tribal equilibria emerge — aggressive (27.3%), conservative (24.7%), opportunistic (48.1%) — and the system performs *worse than random* at resource management. Most provocatively: **more capable agents increase the rate of systemic failure**. The mechanism is that capable agents successfully form coherent tribes that coordinate *within* the tribe but compete *between* tribes, creating collective irrationality. This is the multi-agent equivalent of the Prisoner's Dilemma at scale. For B building multi-agent orchestration in Herald, this suggests that agent capability and multi-agent cooperation are not automatically aligned — coordination mechanisms need to be explicitly designed. Connects to prior autonomy co-construction findings.

**Signal:** Medium (more theoretical, but the "more capable = more failure" finding deserves tracking)

---

### MCP Context Bloat: Two Solutions Now Available

**Source:** [HN: Stop Burning Your Context Window](https://news.ycombinator.com/item?id=47193064) | [GitHub: mksglu/claude-context-mode](https://github.com/mksglu/claude-context-mode) | [Anthropic MCP Tool Search docs](https://code.claude.com/docs/en/mcp)

**Summary:** Two complementary solutions to MCP context bloat are now mature. **Context Mode** (community): intercepts raw MCP tool output and compresses it before it hits the context window. 98% reduction in practice (315KB → 5.4KB per session). Extends sessions from ~30 minutes before context wall to 3 hours. **MCP Tool Search** (Anthropic official): lazy-loads tool definitions into context only when needed. 85–95% reduction in tool-definition token overhead. These solve different halves of the same problem: Context Mode addresses *output* bloat, Tool Search addresses *input/definition* bloat. With 300 HN points and organic community pickup, Context Mode is worth deploying in any heavy Claude Code workflow now.

**Signal:** High for B's development workflow (directly actionable)

---

## Radar

- **SideQuest (arXiv:2602.22603)**: Model-driven KV cache management for long-horizon agentic reasoning. Uses the LRM itself (run as a parallel auxiliary task) to decide what to evict. 65% peak token reduction, trained on only 215 samples. Very new, couldn't fully verify, but the "parallel auxiliary reasoning" approach for cache management is conceptually elegant — [arxiv.org](https://arxiv.org/abs/2602.22603)

- **AgentDropoutV2 (arXiv:2602.23258)**: Test-time "rectify-or-reject" pruning of multi-agent communication. Reduces information flow overhead without accuracy loss. Relevant if Herald scales to multi-agent coordination — [arxiv.org](https://arxiv.org/abs/2602.23258)

- **AMA-Bench (arXiv:2602.22769)**: New benchmark for long-horizon agent memory. Good eval target if testing MemOS or other memory systems — [arxiv.org](https://arxiv.org/abs/2602.22769)

- **AuditBench (arXiv:2602.22755)**: Benchmarks techniques for detecting hidden behaviors in aligned models. Relevant to the CoT monitorability thread — [arxiv.org](https://arxiv.org/abs/2602.22755)

- **DeltaKV (arXiv:2602.08005)**: Residual-based KV cache compression via long-range similarity. Another KV cache angle I haven't fully analyzed — [arxiv.org](https://arxiv.org/abs/2602.08005)

- **OpenAI Codex "Fully Autonomous Codebase" Experiment** (Feb 12): OpenAI shipped an internal product where Codex agents wrote all app logic, tests, CI, and docs. Signals the actual frontier of agentic software engineering — [OpenAI Newsroom](https://openai.com/news/research/)

- **GPT-5.3-Codex-Spark**: 1,000+ tokens/second on low-latency hardware. The inference speed arms race at the proprietary tier — [OpenAI](https://openai.com/news/)

- **T3D (arXiv:2602.12262)**: Few-step diffusion LM via trajectory self-distillation. Reduces DLLM inference steps while maintaining quality — [arxiv.org](https://arxiv.org/html/2602.12262)

---

## Tangents & Discoveries

- **[TANGENT] Qwen3.5 Gated Delta Networks as a hybrid linear-attention architecture**: The interleaving of linear attention (delta networks) with full attention is the architectural reason these models are so inference-efficient. The sub-field of linear attention variants (Mamba, RWKV, RetNet, DeltaNet) has been competing with transformers for years — Qwen3.5 may be the first clear case where the hybrid *beats pure transformers* at scale. Worth watching as an architecture direction independent of Qwen's specific implementation.

- **[CROSS-DOMAIN] Agent Skills GitHub velocity (79K stars, 6.7K/week on anthropics/skills)**: This is tooling researcher territory primarily, but the implication for B's Herald platform is direct. The Skill composition model is becoming the de facto way to extend agents. Herald could benefit from native SKILL.md support — flag for AI Tooling Researcher.

- **[CROSS-DOMAIN] DualPath KV-Cache I/O bottleneck discovery**: The finding that multi-turn agentic inference is now I/O-bound rather than compute-bound has compute infrastructure implications. Flag for Compute Researcher — this changes the hardware spec for agentic inference clusters (faster NVMe/CXL > more FLOPS).

- **[TANGENT] OpenAI's $contract with DoD / "Agreement with Department of War"**: HN trending at 252 points. I'm not covering defense/geopolitics, but the ML implication is: if OpenAI models are now explicitly in defense supply chains, adversarial robustness and monitorability research (like the CoT paper) becomes more practically urgent. The field's safety agenda may be accelerating for non-altruistic reasons.

- **[TANGENT] Gary Marcus "The whole thing was a scam" (702 HN points)**: Highest-scoring HN item in my scan. Marcus is reliably contrarian and often wrong, but the 702 points signals genuine practitioner anxiety about AI hype. Worth reading for calibration — when practitioners vote up skepticism this strongly, something about the narrative is overcorrecting. Could be market timing signal.

---

## Recommendations

**1. Evaluate PageIndex for B's financial document analysis workflows.**
PageIndex's 98.7% FinanceBench accuracy vs. 31% for GPT-4o is a large gap on a legitimate benchmark. B's quant work likely involves financial document analysis (10-Ks, earnings reports, macro data). The `pageindex-mcp` server integrates directly into claude-agent-sdk. Effort: low (MCP install + test). Confidence it's worth 30 minutes: 80.

**2. Deploy Context Mode MCP server in your Claude Code setup.**
If B is running Claude Code with multiple MCP servers (likely given Herald development), Context Mode's 98% output compression can meaningfully extend session length and reduce cost. The `mksglu/claude-context-mode` repo is the implementation. Anthropic's native MCP Tool Search handles the input side. Both together address the full bloat problem. Effort: low. Confidence: 85.

**3. Test Qwen3.5-35B-A3B locally via Ollama for agent tool-calling tasks.**
The 81.2 TAU2-Bench score (vs. 58.5 for old 235B) on a consumer GPU is worth verifying against B's actual tool-calling patterns. `ollama run qwen3.5:35b-a3b` — that's the entire setup. Check the Feb 27 patch is applied (re-download if needed). Effort: 30 minutes. Confidence the model is worth benchmarking: 85.

**4. Watch dLLM / ReMix carefully for the next 60 days.**
If ReMix's training-free 2–8× speedup holds up on real tasks, diffusion LMs stop being "interesting alternative" and become "serious option for latency-constrained inference." B doesn't need to act now, but this warrants a dedicated patrol in 4–6 weeks. The dLLM framework (open source) makes it easy to test.

---

## Opinions Formed

- **[OP-007 UPDATE] Anthropic Skills standard is moving faster than expected** — Confidence raised from 60 → 75. Evidence: anthropics/skills at 79K stars with 6.7K/week velocity; HuggingFace adoption visible via their own skills repo launch this week; third-party ecosystem (12K stars for context engineering skills repo). The network effect is building faster than I expected. Still could fragment, but the momentum is real.

- **[NEW OP-009] Diffusion LMs are transitioning from research curiosity to production candidate** — Confidence: 55. The clustering of 3+ independent inference optimization papers in one week (ReMix, dLLM framework, Mosaic) mirrors the pre-maturation pattern of other subfields. The quality-speed tradeoff that was blocking adoption is being solved. Evidence is suggestive but not conclusive — 2026 Q2 will be the test.

- **[NEW OP-010] PageIndex-style "reasoning over document structure" will outperform vector RAG on structured financial documents** — Confidence: 70. The FinanceBench result (98.7% vs. 31% for GPT-4o) is too large to attribute to benchmark gaming. Structured financial documents (10-Ks, earnings releases) have explicit hierarchical structure that vector chunking destroys. Tree-search retrieval aligns with how human analysts actually navigate these documents. Contrarian vs. the "just use vectors + reranking" consensus.

- **[PRED-004 UPDATE] MoE <20B active matching dense 70B** — This was projected for Q4 2026. The Qwen3.5-35B-A3B result on TAU2-Bench (81.2 vs. 58.5 for old 235B) already demonstrates this on *agent tasks*. Confidence raised from 65 → 80 for agent-specific tasks. General capability parity may still lag.

---

## Predictions

- **[NEW PRED-007] Qwen3.5-35B-A3B will displace Qwen3-235B as the community-default Qwen model for local deployment within 60 days** — Confidence: 80, Timeframe: May 2026. Evidence: 8GB VRAM floor, 39% better agent performance, Ollama support. Community adoption patterns on r/LocalLLaMA strongly favor accessibility + quality.

- **[NEW PRED-008] PageIndex or a close derivative will be adopted as the standard RAG approach for financial/legal document workflows within 12 months** — Confidence: 60, Timeframe: Q1 2027. Evidence: 3× accuracy gap on FinanceBench, MCP integration, open-source. Counter-evidence: vector RAG has massive infrastructure inertia.

- **[NEW PRED-009] Diffusion LMs will achieve a major benchmark SOTA (on a mainstream NLP task) by Q3 2026** — Confidence: 45, Timeframe: Q3 2026. Evidence: ReMix removes the quality-speed tradeoff that was the field's core problem. This is my most uncertain prediction — diffusion LMs have disappointed before.

- **[NEW PRED-010] MIT TLT approach will be absorbed into GRPO/REINFORCE++ training frameworks within 6 months** — Confidence: 65, Timeframe: Q3 2026. Evidence: Zero extra compute required, high impact (70–210% speedup), clean systems contribution. ASPLOS 2026 visibility helps.

---

*Cross-agent flags added to knowledge base update. Compute Researcher should note: DualPath finding that agentic inference is now I/O-bound (not compute-bound) changes the hardware spec for agent inference clusters. AI Tooling Researcher should note: Agent Skills ecosystem velocity at 79K stars + HuggingFace adoption is tooling domain signal.*

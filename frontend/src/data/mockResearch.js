// Fake data for demo mode (when VITE_API_URL isn't set in .env).
// The links go to real search pages for the topic, so they're never made-up URLs.

// Makes text safe to drop into a URL, e.g. "solid state" -> "solid%20state"
const forUrl = (text) => encodeURIComponent(text)

// The log lines each agent "prints" while it's pretending to work
export const MOCK_AGENT_LOGS = {
  retriever: () => [
    'Querying scholarly indexes…',
    'Querying news, reports and explainers…',
    'Retrieved 23 candidates, deduplicated to 14',
    'Ranked by relevance and credibility, kept top 8',
  ],
  analyst: () => [
    'Reading 8 sources',
    'Extracted 24 key points and 8 TL;DRs',
    'Identified 3 themes, 3 points of consensus, 2 debates',
    'Drafted structured notes and next steps',
  ],
}

// Builds a full fake result for whatever topic was typed in.
// `t` is just the topic, kept short because it shows up in almost every string below.
export function buildMockResearch(topic) {
  const t = topic.trim()

  const sources = [
    {
      id: 's1', type: 'paper', year: 2025, relevance: 0.96, credibility: 'high', readingMinutes: 28,
      title: `${t}: a systematic review of methods and open problems`,
      publisher: 'Scholarly index',
      url: `https://scholar.google.com/scholar?q=${forUrl(t + ' systematic review')}`,
      snippet: `Surveys the main approaches to ${t}, compares their assumptions and evaluation practices, and catalogues the open problems that recur across the literature.`,
    },
    {
      id: 's2', type: 'paper', year: 2024, relevance: 0.91, credibility: 'high', readingMinutes: 22,
      title: `Benchmarking approaches to ${t}`,
      publisher: 'Preprint server',
      url: `https://arxiv.org/search/?query=${forUrl(t)}&searchtype=all`,
      snippet: `Evaluates competing methods on a shared benchmark and finds that reported gains shrink considerably under consistent evaluation conditions.`,
    },
    {
      id: 's3', type: 'article', year: 2026, relevance: 0.88, credibility: 'medium', readingMinutes: 9,
      title: `${t}: overview and history`,
      publisher: 'Encyclopedia',
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${forUrl(t)}`,
      snippet: `A broad introduction covering key terminology, how the field developed, notable milestones and the main schools of thought.`,
    },
    {
      id: 's4', type: 'report', year: 2025, relevance: 0.85, credibility: 'high', readingMinutes: 35,
      title: `The state of ${t}: 2025 outlook`,
      publisher: 'Industry report',
      url: `https://www.semanticscholar.org/search?q=${forUrl(t + ' report')}`,
      snippet: `Tracks adoption, investment and practical constraints, with survey data from practitioners on what works outside the lab.`,
    },
    {
      id: 's5', type: 'article', year: 2025, relevance: 0.79, credibility: 'medium', readingMinutes: 7,
      title: `What practitioners get wrong about ${t}`,
      publisher: 'Practitioner blog',
      url: `https://www.google.com/search?q=${forUrl(t + ' lessons learned')}`,
      snippet: `A field-level account of common pitfalls, from over-trusting headline metrics to underestimating integration costs.`,
    },
    {
      id: 's6', type: 'paper', year: 2023, relevance: 0.74, credibility: 'high', readingMinutes: 31,
      title: `Foundations of ${t}: a theoretical perspective`,
      publisher: 'Peer-reviewed journal',
      url: `https://scholar.google.com/scholar?q=${forUrl(t + ' theory')}`,
      snippet: `Formalises the core concepts and derives conditions under which common approaches are expected to succeed or fail.`,
    },
    {
      id: 's7', type: 'video', year: 2025, relevance: 0.68, credibility: 'medium', readingMinutes: 18,
      title: `${t} explained in 18 minutes`,
      publisher: 'Lecture video',
      url: `https://www.youtube.com/results?search_query=${forUrl(t + ' explained')}`,
      snippet: `An accessible walkthrough with worked examples, useful for building intuition before tackling the primary literature.`,
    },
    {
      id: 's8', type: 'report', year: 2024, relevance: 0.63, credibility: 'medium', readingMinutes: 14,
      title: `Policy and ethical considerations for ${t}`,
      publisher: 'Policy brief',
      url: `https://www.google.com/search?q=${forUrl(t + ' policy ethics')}`,
      snippet: `Outlines regulatory questions, stakeholder concerns and recommended safeguards for responsible deployment.`,
    },
  ]

  const summaries = {
    overview: `Research on ${t} has moved from establishing core concepts toward rigorous comparison and real-world deployment. The strongest sources agree on the fundamentals but differ on how much recent progress survives careful evaluation. Practitioner and policy sources add constraints the academic literature often treats as out of scope: cost, integration and accountability.`,
    themes: [
      { title: 'Methods are converging', description: 'Most recent work refines a small family of approaches rather than proposing new paradigms.', sourceIds: ['s1', 's2', 's6'] },
      { title: 'Evaluation is the bottleneck', description: 'Inconsistent benchmarks make headline results hard to compare; standardised evaluation narrows the gaps.', sourceIds: ['s2', 's5'] },
      { title: 'Deployment raises new questions', description: 'Adoption surfaces cost, governance and ethical constraints that are under-studied.', sourceIds: ['s4', 's8', 's5'] },
    ],
    consensus: [
      `The core definitions and building blocks of ${t} are well established.`,
      'Careful evaluation matters more than marginal method improvements.',
      'Practical adoption lags behind what is reported in research settings.',
    ],
    debates: [
      'Whether recent gains reflect genuine progress or evaluation artefacts.',
      'How much regulation is appropriate at the current level of maturity.',
    ],
    perSource: [
      { sourceId: 's1', tldr: 'The most complete map of the field. Start here.', keyPoints: ['Groups prior work into three families of approaches.', 'Identifies evaluation inconsistency as a cross-cutting issue.', 'Lists six open problems with suggested directions.'] },
      { sourceId: 's2', tldr: 'Under a shared benchmark, the gap between methods is much smaller than claimed.', keyPoints: ['Re-runs popular methods under identical conditions.', 'Average reported improvement drops by more than half.', 'Releases the benchmark for reuse.'] },
      { sourceId: 's3', tldr: 'Good for vocabulary and historical context; light on evidence.', keyPoints: ['Defines key terms used across the other sources.', 'Traces the field from early work to present day.', 'Links to primary sources worth following.'] },
      { sourceId: 's4', tldr: 'Adoption is growing, but cost and skills are the main barriers.', keyPoints: ['Practitioner survey across multiple sectors.', 'Integration cost is the most cited obstacle.', 'Expects consolidation around a few standard tools.'] },
      { sourceId: 's5', tldr: 'Common failure modes come from trusting metrics that do not match the real task.', keyPoints: ['Headline metrics often misrepresent real-world value.', 'Pilot projects rarely budget for maintenance.', 'Recommends small, measurable first deployments.'] },
      { sourceId: 's6', tldr: 'Explains why approaches work, and when they will not.', keyPoints: ['Formal definitions of the core problem.', 'Derives conditions for success of common methods.', 'Predicts failure cases later observed empirically.'] },
      { sourceId: 's7', tldr: 'Fastest route to intuition; pair with the review paper.', keyPoints: ['Worked examples of the main concepts.', 'Visual explanations of the core mechanism.', 'Covers common misconceptions.'] },
      { sourceId: 's8', tldr: 'Frames the governance questions the field has yet to settle.', keyPoints: ['Maps stakeholders and their concerns.', 'Recommends transparency and audit practices.', 'Flags gaps in current regulation.'] },
    ],
  }

  const notes = [
    { id: 'n1', heading: 'Research question', body: `What is the current state of ${t}, which approaches are best supported by evidence, and what remains unresolved?` },
    { id: 'n2', heading: 'Background', body: `${t} builds on a well-established set of core concepts [s3, s6]. The field has shifted from proposing new approaches toward comparing and deploying existing ones [s1].` },
    { id: 'n3', heading: 'Key findings', body: `- Methods are converging on a small family of approaches [s1, s6].\n- Under consistent evaluation, differences between methods shrink substantially [s2].\n- Real-world adoption is growing but constrained by cost and skills [s4].` },
    { id: 'n4', heading: 'Tensions and debates', body: `- Progress vs. evaluation artefacts [s2, s5].\n- Appropriate level of regulation and oversight [s8].` },
    { id: 'n5', heading: 'Working thesis', body: `The main opportunity in ${t} is not a new method but better evaluation and deployment practice.` },
  ]

  const nextSteps = {
    tasks: [
      { id: 't1', text: 'Read the systematic review in full and note its taxonomy', priority: 'high', done: false, sourceId: 's1' },
      { id: 't2', text: 'Reproduce one result from the benchmarking paper', priority: 'high', done: false, sourceId: 's2' },
      { id: 't3', text: 'Find 2–3 recent case studies of real-world deployment', priority: 'medium', done: false },
      { id: 't4', text: 'Compare the theoretical conditions in s6 with benchmark outcomes', priority: 'medium', done: false, sourceId: 's6' },
      { id: 't5', text: 'Summarise the policy landscape in one paragraph', priority: 'low', done: false, sourceId: 's8' },
    ],
    questions: [
      `Which evaluation setup is closest to how ${t} is used in practice?`,
      'Are there populations or settings where the evidence does not hold?',
      'What would change the current consensus?',
    ],
    followUps: [
      `${t} evaluation benchmarks`,
      `${t} case studies`,
      `ethics of ${t}`,
      `history of ${t}`,
    ],
  }

  return { topic: t, generatedAt: new Date().toISOString(), sources, summaries, notes, nextSteps }
}

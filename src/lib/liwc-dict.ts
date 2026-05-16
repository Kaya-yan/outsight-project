/**
 * LIWC Dictionary Engine
 *
 * Linguistic Inquiry and Word Count (LIWC) — standard tool for
 * psycholinguistic text analysis in discourse research.
 *
 * Supports:
 *  - Built-in research-grade sentiment lexicon (~500+ words across 5 categories)
 *  - External .dic file loading (LIWC-2007/2015/2022 format)
 *  - Category-level word counting and ratio computation
 *
 * LIWC .dic file format:
 *   %
 *   1   posemo
 *   2   negemo
 *   ...
 *   %
 *   happy   1
 *   sad     2
 *   angry   2 4
 */

// ============================================================
// LIWC sentiment categories used in this project
// ============================================================

export interface LiwcCategory {
  id: number;
  code: string;
  label: string;
  labelZh: string;
}

export const LIWC_SENTIMENT_CATEGORIES: LiwcCategory[] = [
  { id: 1, code: "posemo", label: "Positive Emotion", labelZh: "正面情绪" },
  { id: 2, code: "negemo", label: "Negative Emotion", labelZh: "负面情绪" },
  { id: 3, code: "anx", label: "Anxiety", labelZh: "焦虑" },
  { id: 4, code: "anger", label: "Anger", labelZh: "愤怒" },
  { id: 5, code: "sad", label: "Sadness", labelZh: "悲伤" },
];

export type LiwcCode = (typeof LIWC_SENTIMENT_CATEGORIES)[number]["code"];

// ============================================================
// Built-in LIWC-style sentiment lexicon (~500 words)
// ============================================================

const BUILTIN_DICT: Record<string, number[]> = {
  // ---- POSEMO (1): Positive emotion ----
  accept: [1], accepted: [1], accepts: [1], accepting: [1], accomplish: [1], accomplished: [1],
  achievement: [1], active: [1], advance: [1], advanced: [1], advantage: [1], adventurous: [1],
  agree: [1], agreed: [1], agreement: [1], amazing: [1], ambitious: [1], appreciate: [1],
  appreciated: [1], appreciation: [1], attractive: [1], balance: [1], beautiful: [1], belief: [1],
  benefit: [1], benefited: [1], beneficial: [1], best: [1], better: [1], bless: [1], blessed: [1],
  bold: [1], boost: [1], boosted: [1], brave: [1], bright: [1], brilliant: [1], calm: [1],
  celebrate: [1], celebration: [1], champion: [1], charming: [1], cheer: [1], cheerful: [1],
  collaborative: [1], comfortable: [1], commitment: [1], committed: [1], compassion: [1],
  compassionate: [1], competent: [1], confidence: [1], confident: [1], constructive: [1],
  content: [1], contribution: [1], cooperation: [1], cooperative: [1], courage: [1],
  creative: [1], curiosity: [1], delighted: [1], desirable: [1], determination: [1],
  determined: [1], development: [1], devoted: [1], dignity: [1], dynamic: [1],
  eager: [1], effective: [1], efficient: [1], elegant: [1], empower: [1], empowered: [1],
  encourage: [1], encouraged: [1], energetic: [1], engage: [1], engaged: [1], enjoyable: [1],
  enthusiasm: [1], enthusiastic: [1], equity: [1], excellence: [1], excellent: [1],
  excited: [1], exciting: [1], expand: [1], expanded: [1], fair: [1], faith: [1],
  favorable: [1], flourish: [1], fortunate: [1], free: [1], freedom: [1], friendly: [1],
  friendship: [1], generous: [1], genius: [1], genuine: [1], glad: [1], good: [1],
  grace: [1], grateful: [1], great: [1], greatest: [1], growth: [1], happy: [1],
  happier: [1], happiest: [1], happiness: [1], harmonious: [1], harmony: [1], heal: [1],
  healthy: [1], helpful: [1], hero: [1], honest: [1], honor: [1], hope: [1], hopeful: [1],
  humble: [1], humor: [1], ideal: [1], impressive: [1], improve: [1], improvement: [1],
  inclusive: [1], innovation: [1], innovative: [1], inspire: [1], inspired: [1],
  inspiring: [1], integrity: [1], joy: [1], joyful: [1], justice: [1], kind: [1],
  kindness: [1], leadership: [1], leading: [1], liberty: [1], love: [1], loved: [1],
  lovely: [1], loyal: [1], lucky: [1], meaningful: [1], milestone: [1], moderate: [1],
  modest: [1], motivate: [1], mutual: [1], nice: [1], noble: [1], nurture: [1],
  optimistic: [1], outstanding: [1], overcome: [1], passionate: [1], peace: [1],
  peaceful: [1], perfect: [1], persistence: [1], pleasant: [1], positive: [1],
  powerful: [1], praise: [1], precious: [1], pride: [1], productive: [1], progress: [1],
  promise: [1], promising: [1], prosperous: [1], protect: [1], proud: [1],
  recommend: [1], recovery: [1], reliable: [1], relief: [1], remarkable: [1],
  resilient: [1], resilience: [1], resolve: [1], respect: [1], responsible: [1],
  reward: [1], rich: [1], robust: [1], safe: [1], satisfaction: [1], satisfied: [1],
  secure: [1], share: [1], significant: [1], smart: [1], solution: [1], stability: [1],
  stable: [1], strategic: [1], strength: [1], strengthen: [1], strong: [1], stronger: [1],
  success: [1], successful: [1], super: [1], superior: [1], support: [1], supportive: [1],
  sustainable: [1], talent: [1], terrific: [1], thriving: [1], tolerance: [1],
  transform: [1], transformative: [1], triumph: [1], trust: [1], trusted: [1],
  trustworthy: [1], truth: [1], unique: [1], united: [1], unity: [1], value: [1],
  valued: [1], vibrant: [1], victory: [1], vigor: [1], virtuous: [1], vision: [1],
  vital: [1], warm: [1], wealth: [1], welcome: [1], wellness: [1], winning: [1],
  wisdom: [1], wonderful: [1], worth: [1], worthy: [1], wow: [1],

  // ---- NEGEMO (2): Negative emotion (general) ----
  abandon: [2], abuse: [2], afraid: [2], agony: [2], alarm: [2], alarming: [2],
  alienate: [2], awful: [2], bad: [2], bitter: [2], blame: [2], boring: [2],
  bother: [2], burden: [2], catastrophe: [2], caution: [2], chaos: [2], chaotic: [2],
  complaint: [2], concern: [2], concerning: [2], conflict: [2], confusion: [2],
  contempt: [2], controversial: [2], crisis: [2], critical: [2], criticism: [2],
  criticize: [2], cruel: [2], curse: [2], damage: [2], damaging: [2], danger: [2],
  dangerous: [2], dark: [2], decline: [2], defeat: [2], deficit: [2], degrade: [2],
  deny: [2], depression: [2], deprive: [2], despair: [2], desperate: [2], destroy: [2],
  destruction: [2], devastating: [2], difficult: [2], disadvantage: [2], disaster: [2],
  discontent: [2], discrimination: [2], disgrace: [2], disgust: [2], dishonest: [2],
  disorder: [2], dispute: [2], disruption: [2], distort: [2], distrust: [2], disturb: [2],
  divisive: [2], doubt: [2], downward: [2], dread: [2], evil: [2], fail: [2], failed: [2],
  failure: [2], fake: [2], fatal: [2], fault: [2], fear: [2], feeble: [2], fragile: [2],
  fraud: [2], frighten: [2], frustration: [2], grave: [2], greed: [2], grief: [2],
  grim: [2], gross: [2], guilt: [2], hard: [2], hardship: [2], harm: [2], harmful: [2],
  hate: [2], hatred: [2], haunt: [2], helpless: [2], hesitate: [2], hideous: [2],
  hopeless: [2], horrible: [2], hostile: [2], hostility: [2], humiliate: [2], hurt: [2],
  ignore: [2], immoral: [2], impatient: [2], impossible: [2], incompetent: [2],
  inferior: [2], inhibit: [2], insecure: [2], instability: [2], insult: [2],
  interfere: [2], intolerance: [2], irrational: [2], irritate: [2], isolate: [2],
  jealousy: [2], lack: [2], lazy: [2], liar: [2], lie: [2], limitation: [2],
  lose: [2], loser: [2], losing: [2], loss: [2], lost: [2], madness: [2],
  manipulate: [2], misery: [2], misfortune: [2], misguided: [2], miss: [2],
  mistake: [2], mock: [2], miserable: [2], negative: [2], neglect: [2], nervous: [2],
  nightmare: [2], nonsense: [2], objection: [2], obstacle: [2], offend: [2],
  oppression: [2], pain: [2], painful: [2], panic: [2], pathetic: [2], pessimistic: [2],
  pity: [2], poison: [2], poor: [2], poverty: [2], pressure: [2], problem: [2],
  problematic: [2], protest: [2], punishment: [2], rage: [2], regret: [2], reject: [2],
  rejection: [2], reluctant: [2], resign: [2], retreat: [2], revenge: [2], revolt: [2],
  ridiculous: [2], risk: [2], risky: [2], rude: [2], ruin: [2], sabotage: [2],
  scandal: [2], scare: [2], scorn: [2], selfish: [2], serious: [2], severe: [2],
  shame: [2], shock: [2], sick: [2], sin: [2], slow: [2], sorrow: [2], stain: [2],
  starvation: [2], strain: [2], strange: [2], stress: [2], struggle: [2], stubborn: [2],
  stupid: [2], suffer: [2], suspicious: [2], tension: [2], terrible: [2], terrify: [2],
  terror: [2], threat: [2], threaten: [2], tired: [2], tragedy: [2], trap: [2],
  trouble: [2], turmoil: [2], ugly: [2], unacceptable: [2], uncomfortable: [2],
  unfair: [2], unfortunate: [2], unhappy: [2], unpleasant: [2], unreliable: [2],
  unrest: [2], unstable: [2], upset: [2], urgent: [2], useless: [2], violate: [2],
  violence: [2], violent: [2], vulnerable: [2], warn: [2], warning: [2], waste: [2],
  weak: [2], weakness: [2], wicked: [2], worried: [2], worry: [2], worse: [2],
  worst: [2], worthless: [2], wrong: [2],

  // ---- ANX (3): Anxiety ----
  afraid: [3], alarm: [3], anxious: [3], apprehensive: [3], avoid: [3], avoidance: [3],
  caution: [3], cautious: [3], concern: [3], confused: [3], confusing: [3], doubt: [3],
  dread: [3], embarrassment: [3], fear: [3], fearful: [3], frightening: [3],
  hesitate: [3], hesitation: [3], insecure: [3], intimidated: [3], nervous: [3],
  overwhelm: [3], panic: [3], phobia: [3], pressure: [3], restless: [3], scared: [3],
  self-conscious: [3], shake: [3], shy: [3], stress: [3], stressed: [3],
  suspense: [3], tense: [3], tension: [3], terrified: [3], terror: [3],
  timid: [3], uncertain: [3], uncertainty: [3], uneasy: [3], unstable: [3],
  vigilance: [3], wary: [3], worried: [3], worry: [3],

  // ---- ANGER (4): Anger ----
  aggravate: [4], aggressive: [4], anger: [4], angry: [4], annoy: [4], annoyed: [4],
  arrogant: [4], attack: [4], bash: [4], betray: [4], bitter: [4], blame: [4],
  brutal: [4], confront: [4], confrontational: [4], contempt: [4], cruel: [4],
  crush: [4], curse: [4], damn: [4], defiant: [4], destroy: [4], disagreement: [4],
  disgust: [4], enrage: [4], envy: [4], fight: [4], frustrated: [4], frustration: [4],
  furious: [4], fury: [4], grudge: [4], harsh: [4], hate: [4], hatred: [4],
  hostile: [4], hostility: [4], impatient: [4], indignation: [4], insult: [4],
  irritate: [4], irritated: [4], jealousy: [4], livid: [4], mad: [4], malice: [4],
  offended: [4], outrage: [4], outraged: [4], provoke: [4], provocative: [4],
  punish: [4], rage: [4], rebel: [4], resentment: [4], revenge: [4], rude: [4],
  sarcasm: [4], scorn: [4], scream: [4], spite: [4], stubborn: [4], temper: [4],
  threaten: [4], violent: [4], wrath: [4],

  // ---- SAD (5): Sadness ----
  abandon: [5], alone: [5], blue: [5], breakdown: [5], broken: [5],
  cry: [5], crushed: [5], defeat: [5], dejected: [5], depressed: [5], depression: [5],
  despair: [5], desperate: [5], disappointed: [5], disappointment: [5], discouraged: [5],
  distant: [5], distressed: [5], down: [5], empty: [5], failed: [5], failure: [5],
  funeral: [5], gloom: [5], gloomy: [5], grief: [5], grieve: [5], guilty: [5],
  helpless: [5], home_sick: [5], hopeless: [5], hurt: [5], inferior: [5], isolate: [5],
  lonely: [5], longing: [5], lose: [5], loss: [5], lost: [5], low: [5], melancholy: [5],
  miserable: [5], misery: [5], miss: [5], mourn: [5], neglected: [5], pain: [5],
  pity: [5], regret: [5], rejected: [5], rejection: [5], sad: [5], sadness: [5],
  sigh: [5], sorrow: [5], sorry: [5], suffer: [5], tear: [5], tragic: [5], unhappy: [5],
  weep: [5], worthless: [5],
};

// ============================================================
// Dictionary loader
// ============================================================

export interface LiwcDict {
  /** Category definitions */
  categories: LiwcCategory[];
  /** word → category IDs mapping */
  words: Map<string, number[]>;
}

/**
 * Load the built-in LIWC-style sentiment dictionary.
 */
export function loadBuiltinDict(): LiwcDict {
  return {
    categories: LIWC_SENTIMENT_CATEGORIES,
    words: new Map(Object.entries(BUILTIN_DICT)),
  };
}

/**
 * Parse an external LIWC .dic file content.
 * Format:
 *   %
 *   1   posemo
 *   2   negemo
 *   ...
 *   %
 *   happy   1
 *   sad     2 5
 */
export function parseLiwcDic(dicContent: string): LiwcDict | null {
  try {
    const lines = dicContent.split(/\r?\n/);
    const categories: LiwcCategory[] = [];
    const words = new Map<string, number[]>();

    let section: "header" | "words" = "header";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line === "%") {
        if (section === "header") section = "words";
        continue;
      }
      if (line.startsWith("%")) continue;

      if (section === "header") {
        const match = line.match(/^(\d+)\s+(.+)/);
        if (match) {
          const id = parseInt(match[1], 10);
          const code = match[2].toLowerCase().replace(/\s+/g, "_");
          categories.push({ id, code, label: match[2], labelZh: match[2] });
        }
      } else {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const word = parts[0].toLowerCase();
          const ids = parts.slice(1).map(Number).filter((n) => !isNaN(n));
          if (ids.length > 0) {
            // Merge with existing (a word can appear in multiple lines in some LIWC formats)
            const existing = words.get(word) ?? [];
            for (const id of ids) {
              if (!existing.includes(id)) existing.push(id);
            }
            words.set(word, existing);
          }
        }
      }
    }

    if (categories.length === 0 || words.size === 0) return null;

    return { categories, words };
  } catch {
    return null;
  }
}

// ============================================================
// Analysis engine
// ============================================================

export interface LiwcResult {
  /** Total word count in text */
  totalWords: number;
  /** Per-category hit counts */
  categoryCounts: Record<string, number>;
  /** Per-category ratios (% of total words) */
  categoryRatios: Record<string, number>;
  /** Overall tone classification */
  tone: string;
  /** Tone based on posemo/(posemo+negemo) ratio */
  toneRatio: number;
  /** Which dictionary was used */
  dictSource: "builtin" | "external";
}

/**
 * Analyze text using a LIWC dictionary.
 */
export function analyzeWithLiwc(text: string, dict: LiwcDict, dictSource: "builtin" | "external" = "builtin"): LiwcResult {
  // Tokenize
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, "").split(/\s+/).filter(Boolean);
  const totalWords = words.length;

  // Count per category
  const categoryCounts: Record<string, number> = {};
  for (const cat of dict.categories) {
    categoryCounts[cat.code] = 0;
  }

  for (const w of words) {
    const catIds = dict.words.get(w);
    if (catIds) {
      for (const id of catIds) {
        const cat = dict.categories.find((c) => c.id === id);
        if (cat) {
          categoryCounts[cat.code] = (categoryCounts[cat.code] ?? 0) + 1;
        }
      }
    }
  }

  // Compute ratios (% of total words)
  const categoryRatios: Record<string, number> = {};
  for (const cat of dict.categories) {
    categoryRatios[cat.code] = totalWords > 0
      ? Math.round((categoryCounts[cat.code] / totalWords) * 1000) / 10
      : 0;
  }

  // Overall tone: posemo / (posemo + negemo)
  const pos = categoryCounts.posemo ?? 0;
  const neg = categoryCounts.negemo ?? 0;
  const toneTotal = pos + neg || 1;
  const toneRatio = Math.round((pos / toneTotal) * 100);

  let tone: string;
  if (pos === 0 && neg === 0) {
    tone = "中性";
  } else if (toneRatio >= 70) {
    tone = "强烈正面";
  } else if (toneRatio >= 55) {
    tone = "偏正面";
  } else if (toneRatio >= 45) {
    tone = "偏中立";
  } else if (toneRatio >= 30) {
    tone = "偏负面";
  } else {
    tone = "强烈负面";
  }

  return { totalWords, categoryCounts, categoryRatios, tone, toneRatio, dictSource };
}

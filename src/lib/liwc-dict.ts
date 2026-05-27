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

// Helper to build the dictionary without duplicate keys
function buildDict(): Record<string, number[]> {
  const dict: Record<string, number[]> = {};

  function add(word: string, ...cats: number[]) {
    const existing = dict[word];
    if (existing) {
      for (const c of cats) if (!existing.includes(c)) existing.push(c);
    } else {
      dict[word] = cats;
    }
  }

  // ---- POSEMO (1): Positive emotion ----
  for (const w of ["accept","accepted","accepts","accepting","accomplish","accomplished",
    "achievement","active","advance","advanced","advantage","adventurous","agree","agreed",
    "agreement","amazing","ambitious","appreciate","appreciated","appreciation","attractive",
    "balance","beautiful","belief","benefit","benefited","beneficial","best","better","bless",
    "blessed","bold","boost","boosted","brave","bright","brilliant","calm","celebrate",
    "celebration","champion","charming","cheer","cheerful","collaborative","comfortable",
    "commitment","committed","compassion","compassionate","competent","confidence","confident",
    "constructive","content","contribution","cooperation","cooperative","courage","creative",
    "curiosity","delighted","desirable","determination","determined","development","devoted",
    "dignity","dynamic","eager","effective","efficient","elegant","empower","empowered",
    "encourage","encouraged","energetic","engage","engaged","enjoyable","enthusiasm",
    "enthusiastic","equity","excellence","excellent","excited","exciting","expand","expanded",
    "fair","faith","favorable","flourish","fortunate","free","freedom","friendly","friendship",
    "generous","genius","genuine","glad","good","grace","grateful","great","greatest","growth",
    "happy","happier","happiest","happiness","harmonious","harmony","heal","healthy","helpful",
    "hero","honest","honor","hope","hopeful","humble","humor","ideal","impressive","improve",
    "improvement","inclusive","innovation","innovative","inspire","inspired","inspiring",
    "integrity","joy","joyful","justice","kind","kindness","leadership","leading","liberty",
    "love","loved","lovely","loyal","lucky","meaningful","milestone","moderate","modest",
    "motivate","mutual","nice","noble","nurture","optimistic","outstanding","overcome",
    "passionate","peace","peaceful","perfect","persistence","pleasant","positive","powerful",
    "praise","precious","pride","productive","progress","promise","promising","prosperous",
    "protect","proud","recommend","recovery","reliable","relief","remarkable","resilient",
    "resilience","resolve","respect","responsible","reward","rich","robust","safe",
    "satisfaction","satisfied","secure","share","significant","smart","solution","stability",
    "stable","strategic","strength","strengthen","strong","stronger","success","successful",
    "super","superior","support","supportive","sustainable","talent","terrific","thriving",
    "tolerance","transform","transformative","triumph","trust","trusted","trustworthy","truth",
    "unique","united","unity","value","valued","vibrant","victory","vigor","virtuous","vision",
    "vital","warm","wealth","welcome","wellness","winning","wisdom","wonderful","worth",
    "worthy","wow"]) add(w, 1);

  // ---- NEGEMO (2): Negative emotion (general) ----
  for (const w of ["abandon","abuse","afraid","agony","alarm","alarming","alienate","awful",
    "bad","bitter","blame","boring","bother","burden","catastrophe","caution","chaos","chaotic",
    "complaint","concern","concerning","conflict","confusion","contempt","controversial",
    "crisis","critical","criticism","criticize","cruel","curse","damage","damaging","danger",
    "dangerous","dark","decline","defeat","deficit","degrade","deny","depression","deprive",
    "despair","desperate","destroy","destruction","devastating","difficult","disadvantage",
    "disaster","discontent","discrimination","disgrace","disgust","dishonest","disorder",
    "dispute","disruption","distort","distrust","disturb","divisive","doubt","downward",
    "dread","evil","fail","failed","failure","fake","fatal","fault","fear","feeble","fragile",
    "fraud","frighten","frustration","grave","greed","grief","grim","gross","guilt","hard",
    "hardship","harm","harmful","hate","hatred","haunt","helpless","hesitate","hideous",
    "hopeless","horrible","hostile","hostility","humiliate","hurt","ignore","immoral",
    "impatient","impossible","incompetent","inferior","inhibit","insecure","instability",
    "insult","interfere","intolerance","irrational","irritate","isolate","jealousy","lack",
    "lazy","liar","lie","limitation","lose","loser","losing","loss","lost","madness",
    "manipulate","misery","misfortune","misguided","miss","mistake","mock","miserable",
    "negative","neglect","nervous","nightmare","nonsense","objection","obstacle","offend",
    "oppression","pain","painful","panic","pathetic","pessimistic","pity","poison","poor",
    "poverty","pressure","problem","problematic","protest","punishment","rage","regret",
    "reject","rejection","reluctant","resign","retreat","revenge","revolt","ridiculous","risk",
    "risky","rude","ruin","sabotage","scandal","scare","scorn","selfish","serious","severe",
    "shame","shock","sick","sin","slow","sorrow","stain","starvation","strain","strange",
    "stress","struggle","stubborn","stupid","suffer","suspicious","tension","terrible",
    "terrify","terror","threat","threaten","tired","tragedy","trap","trouble","turmoil","ugly",
    "unacceptable","uncomfortable","unfair","unfortunate","unhappy","unpleasant","unreliable",
    "unrest","unstable","upset","urgent","useless","violate","violence","violent","vulnerable",
    "warn","warning","waste","weak","weakness","wicked","worried","worry","worse","worst",
    "worthless","wrong"]) add(w, 2);

  // ---- ANX (3): Anxiety ----
  for (const w of ["afraid","alarm","anxious","apprehensive","avoid","avoidance","caution",
    "cautious","concern","confused","confusing","doubt","dread","embarrassment","fear","fearful",
    "frightening","hesitate","hesitation","insecure","intimidated","nervous","overwhelm","panic",
    "phobia","pressure","restless","scared","self-conscious","shake","shy","stress","stressed",
    "suspense","tense","tension","terrified","terror","timid","uncertain","uncertainty","uneasy",
    "unstable","vigilance","wary","worried","worry"]) add(w, 3);

  // ---- ANGER (4): Anger ----
  for (const w of ["aggravate","aggressive","anger","angry","annoy","annoyed","arrogant","attack",
    "bash","betray","bitter","blame","brutal","confront","confrontational","contempt","cruel",
    "crush","curse","damn","defiant","destroy","disagreement","disgust","enrage","envy","fight",
    "frustrated","frustration","furious","fury","grudge","harsh","hate","hatred","hostile",
    "hostility","impatient","indignation","insult","irritate","irritated","jealousy","livid",
    "mad","malice","offended","outrage","outraged","provoke","provocative","punish","rage",
    "rebel","resentment","revenge","rude","sarcasm","scorn","scream","spite","stubborn","temper",
    "threaten","violent","wrath"]) add(w, 4);

  // ---- SAD (5): Sadness ----
  for (const w of ["abandon","alone","blue","breakdown","broken","cry","crushed","defeat",
    "dejected","depressed","depression","despair","desperate","disappointed","disappointment",
    "discouraged","distant","distressed","down","empty","failed","failure","funeral","gloom",
    "gloomy","grief","grieve","guilty","helpless","home_sick","hopeless","hurt","inferior",
    "isolate","lonely","longing","lose","loss","lost","low","melancholy","miserable","misery",
    "miss","mourn","neglected","pain","pity","regret","rejected","rejection","sad","sadness",
    "sigh","sorrow","sorry","suffer","tear","tragic","unhappy","weep","worthless"]) add(w, 5);

  return dict;
}

const BUILTIN_DICT = buildDict();

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
  // Tokenize: keep letters, spaces, hyphens, apostrophes, underscores
  const words = text.toLowerCase().replace(/[^a-z\s'_-]/g, "").split(/\s+/).filter(Boolean);
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

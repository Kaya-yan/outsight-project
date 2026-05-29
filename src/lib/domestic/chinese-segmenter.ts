/**
 * Chinese word segmentation using Intl.Segmenter with dictionary-based fallback.
 */

// ── Fallback dictionary: high-frequency political & general terms ──
const FALLBACK_DICT = new Set([
  // 政治术语
  "中国式现代化", "高质量发展", "新质生产力", "深化改革", "全面深化改革",
  "乡村振兴", "一带一路", "人类命运共同体", "共同富裕", "新发展格局",
  "供给侧结构性改革", "双循环", "碳达峰", "碳中和", "绿水青山",
  "国家安全", "总体国家安全观", "一带一路倡议", "粤港澳大湾区",
  "长三角一体化", "京津冀协同", "雄安新区", "海南自贸港",
  "数字经济", "人工智能", "大数据", "云计算", "区块链",
  "新型城镇化", "乡村振兴战略", "精准扶贫", "脱贫攻坚",
  "社会主义核心价值观", "文化自信", "制度自信", "道路自信",
  "理论自信", "四个自信", "两个维护", "两个确立",
  "不忘初心", "牢记使命", "主题教育", "党史学习教育",
  "基层治理", "社会治理", "法治建设", "依法治国",
  "从严治党", "反腐败", "巡视巡察", "纪检监察",
  "实体经济", "制造业", "科技创新", "自立自强",
  "人才强国", "科教兴国", "创新驱动", "新型举国体制",
  "粮食安全", "能源安全", "产业链", "供应链",
  "营商环境", "民营经济", "国有企业", "混合所有制",
  "金融市场", "资本市场", "房地产", "住房保障",
  "医疗卫生", "社会保障", "养老服务", "生育政策",
  "生态文明", "环境保护", "污染防治", "绿色发展",
  "一带一路", "金砖国家", "上海合作组织", "亚太经合组织",
  "联合国", "世界卫生组织", "世界贸易组织", "国际货币基金",
  // 通用高频词
  "发展", "建设", "推进", "加强", "实施", "完善", "推动", "促进",
  "坚持", "深化", "加快", "实现", "提高", "增强", "优化", "提升",
  "经济", "社会", "政治", "文化", "生态", "科技", "教育", "医疗",
  "改革", "创新", "开放", "合作", "治理", "制度", "体系", "机制",
  "政策", "规划", "战略", "目标", "任务", "措施", "方案", "意见",
  "中央", "地方", "省级", "市级", "县级", "基层", "社区", "农村",
  "城市", "城镇", "乡村", "东部", "西部", "中部", "东北",
  "总书记", "总理", "主席", "部长", "省长", "书记", "市长", "县长",
  "国务院", "全国人大", "政协", "中央", "省委", "市委", "县委",
  "报告", "讲话", "指示", "批示", "强调", "指出", "要求",
  "全国两会", "二十大", "二十届", "三中全会", "四中全会",
]);

/**
 * Forward Maximum Matching segmentation (fallback when Intl.Segmenter unavailable).
 * Splits text into known dictionary words + individual characters for unknown parts.
 */
function fallbackSegment(text: string): string[] {
  const words: string[] = [];
  let i = 0;
  const maxLen = 8; // max dictionary word length

  while (i < text.length) {
    // Skip non-CJK characters (punctuation, digits, latin)
    const code = text.charCodeAt(i);
    if (code < 0x4E00 || code > 0x9FFF) {
      // Keep consecutive non-CJK as one token if meaningful
      let j = i;
      while (j < text.length) {
        const c = text.charCodeAt(j);
        if (c >= 0x4E00 && c <= 0x9FFF) break;
        j++;
      }
      const token = text.slice(i, j).trim();
      if (token.length > 0) words.push(token);
      i = j;
      continue;
    }

    // Forward maximum matching for CJK characters
    let matched = false;
    for (let len = Math.min(maxLen, text.length - i); len >= 2; len--) {
      const candidate = text.slice(i, i + len);
      if (FALLBACK_DICT.has(candidate)) {
        words.push(candidate);
        i += len;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Single character as fallback (still counted for char frequency)
      words.push(text[i]);
      i++;
    }
  }

  return words;
}

/**
 * Segment Chinese text into words.
 * Uses Intl.Segmenter (Node 18+) with dictionary fallback.
 */
export function segmentChinese(text: string): string[] {
  // Try Intl.Segmenter first
  try {
    const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
    const words: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike && segment.length > 1) {
        words.push(segment);
      }
    }
    if (words.length > 0) return words;
  } catch {
    // Intl.Segmenter not available, use fallback
  }

  // Fallback: dictionary-based forward maximum matching
  return fallbackSegment(text);
}

/**
 * Count character frequency (Chinese characters only).
 */
export function countCharFrequency(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x4E00 && code <= 0x9FFF) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }
  }
  return freq;
}

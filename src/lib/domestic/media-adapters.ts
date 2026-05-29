/**
 * Media adapters for Chinese domestic media sources.
 * Each adapter defines how to scrape, clean, and parse articles from a specific media outlet.
 */

export interface MediaAdapter {
  id: string;
  name: string;
  listPages: string[];
  articlePattern: RegExp;
  contentSelector: string;
  titleSelector: string;
  authorSelector: string;
  /** CSS selectors to remove BEFORE content extraction (media-specific ad/nav cleanup) */
  removeSelectors: string[];
  sections: { id: string; label: string }[];
  sourceType: "government" | "mainstream_media";
}

export const MEDIA_ADAPTERS: MediaAdapter[] = [
  {
    id: "people_daily",
    name: "人民日报",
    listPages: [
      "http://www.people.com.cn/",
      "http://cpc.people.com.cn/",
      "http://politics.people.com.cn/GB/1024/index.html",
      "http://finance.people.com.cn/",
      "http://society.people.com.cn/",
    ],
    articlePattern: /people\.com\.cn\/n1\/\d{4}\/\d{4}\/c\d+-\d+\.html/,
    contentSelector: "#rm_txt_zw",
    titleSelector: "h1",
    authorSelector: "#laiyid",
    removeSelectors: [
      ".share-bar", ".share-wrap", "#share-wrap",
      ".comment-area", "#comment_area",
      ".related-news", ".recommend",
      ".ad-box", ".ad_banner", "[class*='ad']",
      ".breadcrumb", "#rwb_navpath",
      ".editor", "#btn-wrap",
      ".login-area", "#loginMsg",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "politics", label: "时政" },
      { id: "economy", label: "经济" },
      { id: "society", label: "社会" },
      { id: "international", label: "国际" },
      { id: "opinion", label: "评论" },
      { id: "military", label: "军事" },
    ],
    sourceType: "government",
  },
  {
    id: "xinhua",
    name: "新华社",
    listPages: [
      "http://www.news.cn/",
      "http://www.news.cn/politics/",
      "http://www.news.cn/fortune/",
    ],
    articlePattern: /news\.cn\/(politics|fortune|world|military|local)\/[\w/]+\.htm/,
    contentSelector: "#detail, .article, .main-content",
    titleSelector: "h1, .head-line, .title",
    authorSelector: ".source, .author",
    removeSelectors: [
      ".share-box", ".comment-box", ".related",
      ".ad-wrap", ".recommend", ".breadcrumb",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "politics", label: "时政" },
      { id: "fortune", label: "财经" },
      { id: "world", label: "国际" },
      { id: "local", label: "地方" },
    ],
    sourceType: "government",
  },
  {
    id: "economic_daily",
    name: "经济日报",
    listPages: [
      "http://www.ce.cn/",
      "http://finance.ce.cn/",
    ],
    articlePattern: /ce\.cn\/.*\/\d{8}\/t\d+_\d+\.shtml/,
    contentSelector: "#articleContent, .TRS_Editor, .article_con",
    titleSelector: "h1, .article_title",
    authorSelector: ".source, .author",
    removeSelectors: [
      ".share", ".comment", ".related", ".ad", ".breadcrumb",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "finance", label: "财经" },
      { id: "industry", label: "产业" },
      { id: "tech", label: "科技" },
    ],
    sourceType: "mainstream_media",
  },
  {
    id: "guangming",
    name: "光明日报",
    listPages: [
      "https://www.gmw.cn/",
      "https://politics.gmw.cn/",
      "https://economy.gmw.cn/",
      "https://society.gmw.cn/",
    ],
    articlePattern: /gmw\.cn\/.*\/content_\d+\.htm/,
    contentSelector: "#articleContent, .u-txt, .contentMain",
    titleSelector: "h1, .article-title, .u-title",
    authorSelector: ".author, .source, .m-title-source",
    removeSelectors: [
      ".share", ".comment", ".related", ".ad", ".breadcrumb",
      ".recommend", ".login-area",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "politics", label: "时政" },
      { id: "economy", label: "经济" },
      { id: "society", label: "社会" },
      { id: "culture", label: "文化" },
      { id: "science", label: "科技" },
    ],
    sourceType: "government",
  },
  {
    id: "thepaper",
    name: "澎湃新闻",
    listPages: [
      "https://www.thepaper.cn/",
      "https://www.thepaper.cn/channel_25462",
      "https://www.thepaper.cn/channel_26916",
    ],
    articlePattern: /thepaper\.cn\/newsDetail_forward_\d+/,
    contentSelector: "#news_txt, .news_txt, .newsDetail_content",
    titleSelector: "h1, .news_title, .title",
    authorSelector: ".news_author, .author, .source",
    removeSelectors: [
      ".comment", ".related", ".ad", ".share",
      ".recommend", ".breadcrumb",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "politics", label: "时政" },
      { id: "finance", label: "财经" },
      { id: "thought", label: "思想" },
      { id: "tech", label: "科技" },
    ],
    sourceType: "mainstream_media",
  },
  {
    id: "chinadaily",
    name: "中国日报",
    listPages: [
      "https://www.chinadaily.com.cn/",
      "https://www.chinadaily.com.cn/china/",
      "https://www.chinadaily.com.cn/world/",
    ],
    articlePattern: /chinadaily\.com\.cn\/.*\/content_\d+\.htm/,
    contentSelector: "#Content, .article-body, .main_content",
    titleSelector: "h1, .article-title, #Title",
    authorSelector: ".author, .source, #Author",
    removeSelectors: [
      ".share", ".comment", ".related", ".ad", ".breadcrumb",
      ".recommend", ".login",
    ],
    sections: [
      { id: "all", label: "全部" },
      { id: "china", label: "中国" },
      { id: "world", label: "国际" },
      { id: "business", label: "财经" },
      { id: "culture", label: "文化" },
    ],
    sourceType: "mainstream_media",
  },
];

/**
 * Get adapter by ID.
 */
export function getAdapter(id: string): MediaAdapter | undefined {
  return MEDIA_ADAPTERS.find((a) => a.id === id);
}

/**
 * Get all adapter IDs and names (for frontend display).
 */
export function getMediaOptions() {
  return MEDIA_ADAPTERS.map((a) => ({ id: a.id, name: a.name, sourceType: a.sourceType }));
}

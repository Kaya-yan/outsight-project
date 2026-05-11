export interface Quote {
  text: string;
  author: string;
  source?: string;
}

const quotes: Quote[] = [
  { text: "观察即介入，描述即建构。", author: "米歇尔·福柯", source: "《知识考古学》" },
  { text: "话语不仅反映现实，话语建构现实。", author: "诺曼·费尔克拉夫", source: "《话语与社会变迁》" },
  { text: "每一次编码，都是对文本的一次温柔解剖。", author: "传播学方法论札记" },
  { text: "严谨的方法论，是研究者最好的修辞。", author: "社会科学方法论" },
  { text: "数据不会说谎，但解读需要诚实。", author: "定量研究方法论" },
  { text: "The limits of my language mean the limits of my world.", author: "Ludwig Wittgenstein", source: "Tractatus Logico-Philosophicus" },
  { text: "We see things not as they are, but as we are.", author: "Walter Lippmann", source: "Public Opinion" },
  { text: "新闻是历史的初稿。", author: "菲利普·格雷厄姆" },
  { text: "The medium is the message.", author: "Marshall McLuhan", source: "Understanding Media" },
  { text: "谁控制了媒体，谁就控制了思想。", author: "语言与权力" },
  { text: "学术的本质不是寻找答案，而是学会提问。", author: "学术方法导论" },
  { text: "In the age of information, ignorance is a choice.", author: "Donny Miller" },
  { text: "话语分析不是解码，而是对意义的考古。", author: "话语研究方法论" },
  { text: "好的研究提出问题，伟大的研究改变问题的提法。", author: "科学研究范式" },
  { text: "语言是存在之家。", author: "马丁·海德格尔" },
  { text: "报道什么、不报道什么，本身就是一种权力。", author: "议程设置理论" },
  { text: "Truth is a construct of power.", author: "Michel Foucault" },
  { text: "我们使用的词语，塑造了我们思考的方式。", author: "语言相对论" },
  { text: "The most important thing in communication is hearing what isn't said.", author: "Peter Drucker" },
  { text: "框架即权力，命名即秩序。", author: "框架理论札记" },
  { text: "每一条新闻标题，都是一次意义的选择。", author: "新闻话语分析" },
  { text: "研究者的目光，决定了什么被看见，什么被遮蔽。", author: "研究方法反思" },
  { text: "Statistics are human beings with the tears wiped off.", author: "Paul Brodeur" },
  { text: "不记录，就等于不存在。", author: "田野调查笔记" },
  { text: "Knowledge is power, but understanding is wisdom.", author: "学术思考" },
  { text: "News is what somebody does not want you to print.", author: "Alfred Harmsworth" },
  { text: "文本的意义不在文本之中，而在读者的阐释之中。", author: "接受美学" },
  { text: "他者即地狱，但理解他者即自由。", author: "让-保罗·萨特" },
  { text: "The aim of science is not to open the door to infinite wisdom, but to set a limit to infinite error.", author: "Bertolt Brecht", source: "Life of Galileo" },
  { text: "分析就是拆分，综合就是连接，二者缺一不可。", author: "系统思维导论" },
  { text: "Nothing exists except atoms and empty space; everything else is opinion.", author: "Democritus" },
  { text: "媒体是社会的镜子，但这面镜子总有弧度。", author: "媒介社会学" },
  { text: "It is the theory that decides what we can observe.", author: "Albert Einstein" },
  { text: "修辞是说服的艺术，也是分析的对象。", author: "古典修辞学" },
  { text: "在信息洪流中，分析框架是我们唯一可以依靠的木筏。", author: "信息分析方法" },
  { text: "The more we elaborate our means of communication, the less we communicate.", author: "J.B. Priestley" },
  { text: "在话语的丛林中穿行，框架是我们的指南针。", author: "话语分析手记" },
  { text: "每一个数据点，都曾是某个真实时刻的锚。", author: "数据人文札记" },
  { text: "We don't see things as they are; we see them as we are.", author: "Anaïs Nin" },
  { text: "内容分析是数学与诠释学的交汇点。", author: "内容分析方法论" },
  { text: "传媒不是第四权力，而是权力之网上的一个节点。", author: "传播政治经济学" },
  { text: "The greatest obstacle to discovery is not ignorance — it is the illusion of knowledge.", author: "Daniel J. Boorstin" },
  { text: "编码表是研究者的视线，框架是学术的骨骼。", author: "编码方法" },
  { text: "不读话语，便不识权力。", author: "批判话语分析" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "比较是认知的起点，差异是理解的门户。", author: "比较研究方法" },
  { text: "定性的深度需要定量的广度来支撑。", author: "混合方法研究" },
  { text: "语言的边界就是世界的边界，跨越语言的边界就是拓展世界的疆域。", author: "跨文化传播" },
  { text: "There is nothing more practical than a good theory.", author: "Kurt Lewin" },
  { text: "中国式现代化是绝佳的话语分析样本，因为它同时承载着历史、政治与文化的多重编码。", author: "话语研究前沿" },
  { text: "每一次回译都是对文化的重新诠释。", author: "翻译研究" },
  { text: "知识的积累始于细致的分类。", author: "分类学基础" },
  { text: "The whole is more than the sum of its parts.", author: "Aristotle" },
  { text: "不追求完美的客观，但追求透明的主观。", author: "质性研究伦理" },
  { text: "Words are, of course, the most powerful drug used by mankind.", author: "Rudyard Kipling" },
  { text: "学术是孤独的，但协作让它有了温度。", author: "学术共同体" },
  { text: "传播学不是研究'谁说了什么'，而是研究'为什么这样说'。", author: "批判传播学" },
  { text: "Every word is a prejudice.", author: "Friedrich Nietzsche" },
  { text: "数据是沉默的证人，分析让它们开口说话。", author: "数据科学导论" },
  { text: "研究中国就是研究世界，理解话语就是理解权力。", author: "全球化话语研究" },
];

export function getDailyQuote(): Quote {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
}

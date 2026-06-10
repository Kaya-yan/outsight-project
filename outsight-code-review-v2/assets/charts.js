(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart: Quality Radar ---
  var chartQuality = echarts.init(document.getElementById('chart-quality'), null, { renderer: 'svg' });
  chartQuality.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true },
    radar: {
      indicator: [
        { name: '类型安全', max: 10 },
        { name: '错误处理', max: 10 },
        { name: '代码复用', max: 10 },
        { name: '可维护性', max: 10 },
        { name: '性能', max: 10 },
        { name: '安全性', max: 10 },
        { name: '文档', max: 10 },
        { name: '测试覆盖', max: 10 }
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: { color: ink, fontSize: 13, fontWeight: 600 },
      splitLine: { lineStyle: { color: rule } },
      splitArea: { show: true, areaStyle: { color: [bg2, 'transparent'] } },
      axisLine: { lineStyle: { color: rule } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: [7.5, 6, 7.5, 8, 6.5, 6.5, 8, 3],
        name: '当前评分',
        areaStyle: { color: accent + '33' },
        lineStyle: { color: accent, width: 2 },
        itemStyle: { color: accent }
      }, {
        value: [9, 8, 8.5, 9, 8, 8.5, 9, 7],
        name: '目标评分',
        areaStyle: { color: accent2 + '22' },
        lineStyle: { color: accent2, width: 2, type: 'dashed' },
        itemStyle: { color: accent2 }
      }]
    }],
    legend: {
      data: ['当前评分', '目标评分'],
      bottom: 0,
      textStyle: { color: muted }
    }
  });
  window.addEventListener('resize', function() { chartQuality.resize(); });

  // --- Chart: Collection Pipeline Flow ---
  var chartPipeline = echarts.init(document.getElementById('chart-pipeline'), null, { renderer: 'svg' });
  chartPipeline.setOption({
    animation: false,
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      data: [
        { name: 'RSS 订阅源' },
        { name: 'NewsAPI' },
        { name: 'GDELT' },
        { name: '搜索引擎' },
        { name: 'URL 发现' },
        { name: '时间过滤' },
        { name: 'URL 去重' },
        { name: '入库' },
        { name: '正文提取' },
        { name: '付费墙检测' },
        { name: '文本清洗' },
        { name: '可用语料' }
      ],
      links: [
        { source: 'RSS 订阅源', target: 'URL 发现', value: 15 },
        { source: 'NewsAPI', target: 'URL 发现', value: 20 },
        { source: 'GDELT', target: 'URL 发现', value: 150 },
        { source: '搜索引擎', target: 'URL 发现', value: 30 },
        { source: 'URL 发现', target: '时间过滤', value: 215 },
        { source: '时间过滤', target: 'URL 去重', value: 180 },
        { source: 'URL 去重', target: '入库', value: 120 },
        { source: '入库', target: '正文提取', value: 120 },
        { source: '正文提取', target: '付费墙检测', value: 100 },
        { source: '付费墙检测', target: '文本清洗', value: 80 },
        { source: '文本清洗', target: '可用语料', value: 75 }
      ],
      lineStyle: { color: 'source', curveness: 0.5 },
      itemStyle: { color: accent, borderColor: accent },
      label: { color: ink, fontSize: 12 }
    }]
  });
  window.addEventListener('resize', function() { chartPipeline.resize(); });

  // --- Chart: Source Comparison ---
  var chartSource = echarts.init(document.getElementById('chart-source'), null, { renderer: 'svg' });
  chartSource.setOption({
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { data: ['数据量', '可靠性', '实时性', '覆盖度'], bottom: 0, textStyle: { color: muted } },
    radar: {
      indicator: [
        { name: 'RSS', max: 10 },
        { name: 'NewsAPI', max: 10 },
        { name: 'GDELT', max: 10 },
        { name: '搜索引擎', max: 10 },
        { name: 'Firecrawl', max: 10 }
      ],
      axisName: { color: ink, fontSize: 12 },
      splitLine: { lineStyle: { color: rule } },
      splitArea: { show: true, areaStyle: { color: [bg2, 'transparent'] } }
    },
    series: [{
      type: 'radar',
      data: [
        { value: [4, 6, 9, 5, 5], name: '数据量', areaStyle: { color: accent + '22' }, lineStyle: { color: accent } },
        { value: [8, 7, 9, 6, 7], name: '可靠性', areaStyle: { color: accent2 + '22' }, lineStyle: { color: accent2 } },
        { value: [9, 8, 5, 7, 6], name: '实时性', areaStyle: { color: muted + '22' }, lineStyle: { color: muted } },
        { value: [3, 4, 9, 8, 6], name: '覆盖度', areaStyle: { color: '#e17055' + '22' }, lineStyle: { color: '#e17055' } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartSource.resize(); });
})();

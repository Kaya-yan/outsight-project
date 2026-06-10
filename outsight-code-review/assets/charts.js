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
        value: [7.5, 5, 7, 7.5, 6, 6.5, 8, 3],
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
})();

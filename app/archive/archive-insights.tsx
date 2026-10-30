'use client';
import type { categoryDistribution, monthlyRecordCounts } from '@/lib/archive-data.js';

type CategoryStats = ReturnType<typeof categoryDistribution>;
type MonthStats = ReturnType<typeof monthlyRecordCounts>;

export function ArchiveInsights({categoryStats,monthStats,categoryFilter,monthFilter,onCategorySelect,onMonthSelect,onMonthClear}:{categoryStats:CategoryStats;monthStats:MonthStats;categoryFilter:string;monthFilter:string;onCategorySelect:(category:string)=>void;onMonthSelect:(month:string)=>void;onMonthClear:()=>void}) {
  const currentMonthKey=monthStats.months.at(-1)?.key ?? '';
  return <section className="archive-insights" aria-label="内容分布概览">
    <div className="insight-panel">
      <div className="insight-head"><p className="section-kicker">{'// CATEGORY DISTRIBUTION'}</p><h2>分类分布</h2><span className="insight-scope">{categoryStats.rows.length} 个分类 / {categoryStats.total} 条记录</span></div>
      <p className="insight-note">按当前分区全部记录统计，不随搜索词缩小分母；条长为该类记录数 ÷ 最大类记录数，点选分类即筛选下方列表。</p>
      {categoryStats.rows.length === 0 ? <p className="insight-empty">当前分区还没有记录。添加或导入档案后，这里会显示真实分布。</p> : <ol className="insight-bars">{categoryStats.rows.map(row=><li key={row.category}><button type="button" className={`insight-bar${categoryFilter===row.category?' is-current':''}`} aria-pressed={categoryFilter===row.category} aria-label={`${row.category}：${row.count} 条记录，${categoryFilter===row.category?'当前筛选':'筛选此分类'}`} onClick={()=>onCategorySelect(row.category)}><span className="insight-bar-name">{row.category}</span><span className="insight-bar-count">{row.count}</span><span className="insight-bar-track" aria-hidden="true"><span className="insight-bar-fill" style={{width:`${(row.ratio*100).toFixed(2)}%`}} /></span></button></li>)}</ol>}
    </div>
    <div className="insight-panel">
      <div className="insight-head"><p className="section-kicker">{'// RECORDS BY DATE'}</p><h2>按记录日期</h2><span className="insight-scope">{monthStats.range}</span></div>
      <p className="insight-note">按每条记录的日期计数，不受最近更新时间影响；柱高与上方数字一致。点选月份可筛选下方列表。</p>
      <ol className="month-chart" aria-label={`最近十二个自然月的记录数量：${monthStats.range}`}>{monthStats.months.map(month=><li key={month.key} className={`month-column${month.count===0?' is-empty':''}${month.key===currentMonthKey?' is-current':''}${monthFilter===month.key?' is-selected':''}${month.label.endsWith('.01')?' is-year-start':''}`}><button type="button" className="month-button" aria-pressed={monthFilter===month.key} aria-label={`${month.label}：${month.count} 条记录，${monthFilter===month.key?'当前筛选，点击取消':'筛选此月份'}`} onClick={()=>onMonthSelect(month.key)}><span className="month-count">{month.count}</span><span className="month-track" aria-hidden="true"><span className="month-bar" style={{height:`${(month.ratio*100).toFixed(2)}%`}} /></span><span className="month-label"><span className="sr-only">{month.label}，</span>{month.label.slice(2)}</span></button></li>)}</ol>
      <p className="insight-foot">{monthStats.total} 条记录落在 {monthStats.range} 内{monthStats.unverified?`；另有 ${monthStats.unverified} 条记录日期待核对，未计入图中`:''}{monthStats.outside?`；${monthStats.outside} 条记录在此范围之外，保留在下方列表`:''}。</p>
      {monthFilter && <p className="month-filter-status">正在筛选 {monthFilter} 的记录。<button type="button" onClick={onMonthClear}>清除月份筛选</button></p>}
    </div>
  </section>;
}

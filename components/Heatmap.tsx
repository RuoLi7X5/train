'use client'

import { useEffect, useState } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'

interface HeatmapProps {
  apiEndpoint?: string
  colorScheme?: 'green' | 'blue' // 简单区分两套配色
}

export default function Heatmap({ 
  apiEndpoint = '/api/stats/heatmap',
  colorScheme = 'green'
}: HeatmapProps) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(apiEndpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
           setData(data)
        }
        setLoading(false)
      })
      .catch(err => setLoading(false))
  }, [apiEndpoint])

  if (loading) return <div className="h-32 bg-gray-100 animate-pulse rounded-md"></div>

  // 定义主题颜色
  const theme = colorScheme === 'green' 
    ? { light: ['#ebedf0', '#40c463'] } // 学生版：只分有/无 (白色/绿色)
    : { light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] } // 管理员版：深浅不一

  // 针对学生版，强制 level 只显示 0 或 1 对应的颜色
  // ActivityCalendar 默认支持 level 0-4。如果我们只传了两个颜色，它会自动适配吗？
  // 实际上 react-activity-calendar 的 theme 数组长度决定了 level 的映射。
  // 如果我们只提供两个颜色 ['white', 'green']，那么 level 0->white, level 1+->green。

  return (
    <div className="w-full overflow-x-auto pb-4">
      <ActivityCalendar
        data={data}
        theme={theme}
        labels={{
          totalCount: '{{count}} 项记录 (过去一年)',
        }}
        renderBlock={(block, activity) => (
          <div data-tooltip-id="react-tooltip" data-tooltip-content={`${activity.date}: ${activity.count} 次提交`}>
            {block}
          </div>
        )}
        showWeekdayLabels
      />
      <ReactTooltip id="react-tooltip" />
    </div>
  )
}

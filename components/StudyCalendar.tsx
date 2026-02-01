'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Grid, List } from 'lucide-react'
import { ActivityCalendar } from 'react-activity-calendar'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'

type HeatmapData = {
  date: string
  count: number
  level: number
}

interface StudyCalendarProps {
  apiEndpoint?: string
}

export default function StudyCalendar({ apiEndpoint = '/api/stats/heatmap/user' }: StudyCalendarProps) {
  const [data, setData] = useState<HeatmapData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    fetch(apiEndpoint)
      .then(res => res.json())
      .then(resData => {
        if (Array.isArray(resData)) {
          setData(resData)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [apiEndpoint])

  const getDisplayDates = () => {
    const dates: Date[] = []
    const start = new Date(currentDate)

    if (viewMode === 'week') {
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        dates.push(d)
      }
    } else if (viewMode === 'month') {
      start.setDate(1)
      const month = start.getMonth()
      const startDay = start.getDay() || 7
      for (let i = 1; i < startDay; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() - (startDay - i))
        dates.push(d)
      }
      while (start.getMonth() === month) {
        dates.push(new Date(start))
        start.setDate(start.getDate() + 1)
      }
    }
    return dates
  }

  const displayDates = getDisplayDates()

  const handlePrev = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7)
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1)
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7)
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1)
    setCurrentDate(newDate)
  }

  const getDataForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return data.find(d => d.date === dateStr)
  }

  if (loading) return <div className="h-40 bg-gray-50 animate-pulse rounded-md" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode('week')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            本周
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            本月
          </button>
          <button
            onClick={() => setViewMode('year')}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${viewMode === 'year' ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:bg-gray-200'}`}
          >
            最近一年
          </button>
        </div>

        {viewMode !== 'year' && (
          <div className="flex items-center gap-4">
            <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-medium text-gray-700 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {viewMode === 'week'
                ? `${displayDates[0]?.toLocaleDateString()} - ${displayDates[6]?.toLocaleDateString()}`
                : `${currentDate.getFullYear()}年 ${currentDate.getMonth() + 1}月`
              }
            </span>
            <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight className="w-5 h-5" /></button>
          </div>
        )}
      </div>

      {viewMode === 'year' ? (
        <div className="w-full overflow-x-auto pb-4">
          <ActivityCalendar
            data={data}
            theme={{ light: ['#ebedf0', '#40c463'] }}
            labels={{
              totalCount: '{{count}} 次打卡 (过去一年)',
            }}
            renderBlock={(block, activity) => (
              <div data-tooltip-id="react-tooltip" data-tooltip-content={`${activity.date}: ${activity.count ? '已打卡' : '未打卡'}`}>
                {block}
              </div>
            )}
            showWeekdayLabels
          />
          <ReactTooltip id="react-tooltip" />
        </div>
      ) : (
        <div className={`grid gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'}`}>
          {['一', '二', '三', '四', '五', '六', '日'].map(d => (
            <div key={d} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">
              周{d}
            </div>
          ))}

          {displayDates.map((date, i) => {
            const record = getDataForDate(date)
            const isToday = new Date().toDateString() === date.toDateString()
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()

            return (
              <div
                key={i}
                className={`min-h-[80px] p-2 bg-white flex flex-col justify-between transition-colors
                  ${!isCurrentMonth && viewMode === 'month' ? 'bg-gray-50/50 text-gray-400' : ''}
                  ${record?.count ? 'bg-green-50/30' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                    {date.getDate()}
                  </span>
                  {record?.count ? (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      已打卡
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

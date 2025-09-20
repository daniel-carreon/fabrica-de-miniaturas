'use client'

import { useState } from 'react'

interface Tab {
  id: string
  label: string
  icon: string
  count: number
  color: string
}

interface TabsNavigatorProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export default function TabsNavigator({ tabs, activeTab, onTabChange, className = '' }: TabsNavigatorProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className={`bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-xl p-1 ${className}`}>
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isHovered = hoveredTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className={`
                relative flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-300 min-w-fit whitespace-nowrap
                ${isActive
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                  : isHovered
                    ? 'bg-white/10 text-white'
                    : 'text-gray-300 hover:text-white'
                }
              `}
            >
              {/* Background glow effect for active tab */}
              {isActive && (
                <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${tab.color} opacity-20 blur-sm`} />
              )}

              {/* Content */}
              <div className="relative flex items-center gap-1 md:gap-2">
                <span className="text-base md:text-lg">{tab.icon}</span>
                <span className="font-medium text-xs md:text-sm hidden sm:inline">{tab.label}</span>
                <div className={`
                  px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-xs font-bold min-w-[16px] md:min-w-[20px] text-center
                  ${isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-700 text-gray-300'
                  }
                `}>
                  {tab.count}
                </div>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r ${tab.color} rounded-full`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
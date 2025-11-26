import { useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { AnalyticsService } from '../worker/services/analytics.service';

interface WeakQuestsViewProps {
    userId: string; 
}

export function WeakQuestsView({userId}: WeakQuestsViewProps) {
  const [weakQuests, setWeakQuests] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
        const session = new AnalyticsService(); 
        const data = await session.getWeakQuests(userId); 
        setWeakQuests(data);
    }; 

    if (userId) load();
  }, [userId]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl text-white mb-2">Weak Quests Analysis</h2>
        <p className="text-sm text-[#b9bbbe]">
          Quests with low velocity or high interruption rates that may need restructuring
        </p>
      </div>

      <div className="space-y-4">
        {weakQuests.map((quest) => {
          const velocityDiff = quest.velocity - quest.avgVelocity;
          const velocityPercent = ((velocityDiff / quest.avgVelocity) * 100).toFixed(0);

          return (
            <div key={quest.id} className="bg-[#2f3136] rounded-lg p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{quest.icon}</div>
                  <div>
                    <h3 className="text-white mb-1">{quest.title}</h3>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-[#ED4245]" />
                      <span className="text-sm text-[#ED4245]">
                        {velocityPercent}% below average
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#72767d] mb-1">Velocity</div>
                  <div className="text-2xl text-[#ED4245]">{quest.velocity}</div>
                  <div className="text-xs text-[#72767d]">XP/hr (avg: {quest.avgVelocity})</div>
                </div>
              </div>

              {/* Velocity Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#72767d]">Performance vs Average</span>
                  <span className="text-xs text-[#b9bbbe]">{((quest.velocity / quest.avgVelocity) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ED4245] transition-all"
                    style={{ width: `${(quest.velocity / quest.avgVelocity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">Interruption Rate</div>
                  <div className="text-xl text-[#faa61a]">{quest.interruptionRate}%</div>
                </div>
                <div className="bg-[#202225] rounded p-3">
                  <div className="text-xs text-[#72767d] mb-1">Completion Rate</div>
                  <div className="text-xl text-[#00b0f4]">{quest.completionRate}%</div>
                </div>
              </div>

              {/* Issues */}
              <div className="pt-4 border-t border-[#202225]">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-[#faa61a]" />
                  <span className="text-xs uppercase tracking-wide text-[#b9bbbe]">Identified Issues</span>
                </div>
                <div className="space-y-1">
                  {quest.issues.map((issue, index) => (
                    <div key={index} className="text-sm text-[#dcddde] pl-6">
                      • {issue}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      <div className="mt-6 bg-[#2f3136] rounded-lg p-6">
        <h3 className="text-sm text-white mb-3">Suggestions</h3>
        <ul className="space-y-2 text-sm text-[#b9bbbe]">
          <li>• Consider breaking down large quests into smaller, more focused subtasks</li>
          <li>• Review quests with high interruption rates and identify external distractions</li>
          <li>• Increase XP rewards for consistently difficult or time-consuming subtasks</li>
          <li>• Remove or archive quests that no longer align with your goals</li>
        </ul>
      </div>
    </div>
  );
}

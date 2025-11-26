import { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Zap } from 'lucide-react';
import { AnalyticsService } from '../worker/services/analytics.service';

interface BestQuestsViewProps {
    userId: string; 
}

export function BestQuestsView({ userId }: BestQuestsViewProps) {
  const [bestQuests, setBestQuests] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
        const session = new AnalyticsService(); 
        const data = await session.getBestQuests(userId); 
        setBestQuests(data);
    }; 

    if (userId) load();
  }, [userId]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl text-white mb-2">Best Performing Quests</h2>
        <p className="text-sm text-[#b9bbbe]">
          Quests with highest velocity and completion rates
        </p>
      </div>

      <div className="space-y-4">
        {bestQuests.map((quest, index) => {
          const velocityDiff = quest.velocity - quest.avgVelocity;
          const velocityPercent = ((velocityDiff / quest.avgVelocity) * 100).toFixed(0);

          return (
            <div key={quest.id} className="bg-[#2f3136] rounded-lg p-6 relative overflow-hidden">
              {/* Rank Badge */}
              {index === 0 && (
                <div className="absolute top-4 right-4">
                  <div className="w-10 h-10 rounded-full bg-[#faa61a] flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}

              {/* Gradient Background */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  background: `linear-gradient(135deg, ${quest.color} 0%, transparent 100%)`,
                }}
              />

              {/* Content */}
              <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{quest.icon}</div>
                    <div>
                      <h3 className="text-white mb-1">{quest.title}</h3>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#57F287]" />
                        <span className="text-sm" style={{ color: quest.color }}>
                          {velocityPercent}% above average
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#72767d] mb-1">Velocity</div>
                    <div className="text-2xl" style={{ color: quest.color }}>
                      {quest.velocity}
                    </div>
                    <div className="text-xs text-[#72767d]">XP/hr</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#202225] rounded p-3">
                    <div className="text-xs text-[#72767d] mb-1">Completion</div>
                    <div className="text-lg text-[#57F287]">{quest.completionRate}%</div>
                  </div>
                  <div className="bg-[#202225] rounded p-3">
                    <div className="text-xs text-[#72767d] mb-1">Total XP</div>
                    <div className="text-lg text-[#00b0f4]">{quest.totalXP}</div>
                  </div>
                  <div className="bg-[#202225] rounded p-3">
                    <div className="text-xs text-[#72767d] mb-1">Avg Session</div>
                    <div className="text-lg text-white">{quest.avgSessionTime}m</div>
                  </div>
                  <div className="bg-[#202225] rounded p-3">
                    <div className="text-xs text-[#72767d] mb-1">Consistency</div>
                    <div className="text-lg text-[#faa61a]">{quest.consistency}%</div>
                  </div>
                </div>

                {/* Performance Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#72767d]">Overall Performance</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" style={{ color: quest.color }} />
                      <span className="text-xs text-[#b9bbbe]">Excellent</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(quest.velocity / quest.avgVelocity) * 100}%`,
                        backgroundColor: quest.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Insights */}
      <div className="mt-6 bg-[#2f3136] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-[#faa61a]" />
          <h3 className="text-sm text-white">Key Insights</h3>
        </div>
        <ul className="space-y-2 text-sm text-[#b9bbbe]">
          <li>• Creative Flow shows highest velocity - consider allocating more time to creative work</li>
          <li>• High completion rates indicate well-structured subtasks</li>
          <li>• Strong consistency across best quests shows good habit formation</li>
          <li>• Use these quests as templates for improving weaker quests</li>
        </ul>
      </div>
    </div>
  );
}

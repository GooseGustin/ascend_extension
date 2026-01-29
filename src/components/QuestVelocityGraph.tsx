import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AnalyticsService } from '../worker/services/analytics.service';
import { QuestService } from '../worker/services/quest.service';

interface QuestVelocityGraphProps {
    userId: string;
}

export function QuestVelocityGraph({ userId }: QuestVelocityGraphProps) {
  const [data, setData] = useState<any[]>([]);
  const [quests, setQuests] = useState<Array<{ key: string; color: string }>>([]);

  useEffect(() => {
    const load = async () => {
      const analyticsService = new AnalyticsService();
      const questService = new QuestService();

      // Fetch quests to get their colors
      const userQuests = await questService.getUserQuests(userId);
      const questColorMap: Record<string, string> = {};
      userQuests.forEach((q: any) => {
        questColorMap[q.title] = q.color || '#5865F2';
      });

      const velocityData = await analyticsService.getVelocityData(userId, 7);
      setData(velocityData);

      if (velocityData.length > 0) {
        const questKeys = Object.keys(velocityData[0]).filter(k => k !== 'day');
        setQuests(questKeys.map((key) => ({
          key,
          color: questColorMap[key] || '#5865F2',
        })));
      }
    };

    if (userId) load();

  }, [userId]);


  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">Quest Velocity</h3>
        <div className="text-xs text-[#72767d]">XP / Hour</div>
      </div>
      
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#202225" />
          <XAxis dataKey="day" stroke="#72767d" style={{ fontSize: '12px' }} />
          <YAxis stroke="#72767d" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18191c',
              border: 'none',
              borderRadius: '8px',
              color: '#dcddde',
            }}
            labelStyle={{ color: '#dcddde' }}
            formatter={(value: number) => `${value} XP/hr`}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#b9bbbe' }} />
          {quests.map(quest => (
            <Line
              key={quest.key}
              type="monotone"
              dataKey={quest.key}
              stroke={quest.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t border-[#202225]">
        <div className="text-xs text-[#72767d] mb-2">Average Velocity (This Week)</div>
        <div className="grid grid-cols-2 gap-2">
          {quests.map(quest => {
            const total = data.reduce((sum, d) => {
              const value = d[quest.key as keyof typeof d];
              return sum + (typeof value === 'number' ? value : 0);
            }, 0);
            const avg = data.length > 0 ? total / data.length : 0;
            return (
              <div key={quest.key} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: quest.color }}
                />
                <span className="text-xs text-[#dcddde]">{quest.key}: {avg.toFixed(0)} XP/hr</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

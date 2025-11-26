import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnalyticsService } from '../worker/services/analytics.service';

interface TimePercentageDonutProps {
  userId: string; 
  timeView?: string;
}

export function TimePercentageDonut({ userId, timeView = 'overview' }: TimePercentageDonutProps) {
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);

  useEffect(() => {
    const load = async (userId, timeView) => {
      const days = timeView === 'by-month' ? 30 : timeView === 'by-week' ? 7 : 7;
      const session = new AnalyticsService();
      const data = await session.getTimeDistribution(userId, days);
      setData(data); 
    }
    if (userId) load(userId, timeView); 
  }, [timeView]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const getTitle = () => {
    if (timeView === 'by-month') return 'Monthly Time Distribution';
    if (timeView === 'by-day') return 'Daily Time Distribution';
    if (timeView === 'by-week') return 'Weekly Time Distribution';
    return 'Time Distribution (This Week)';
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">{getTitle()}</h3>
      
      <div className="flex items-center">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18191c',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#dcddde',
                }}
                formatter={(value: number) => formatTime(value)}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: '24px', fill: '#fff' }}
              >
                {formatTime(total)}
              </text>
              <text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: '12px', fill: '#72767d' }}
              >
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-40 space-y-2">
          {data.map((item) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#dcddde] truncate">{item.name}</div>
                  <div className="text-xs text-[#72767d]">{percentage}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

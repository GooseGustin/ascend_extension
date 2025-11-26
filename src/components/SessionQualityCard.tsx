import { useEffect, useState } from 'react';
import { AnalyticsService } from '../worker/services/analytics.service';

// getSessionQualityBreakdown

interface SessionQualityCardProps {
    userId: string
}

export function SessionQualityCard({ userId }: SessionQualityCardProps) {
  const [sessionData, setSessionData] = useState([
    { label: 'Completed', count: 0, color: '#57F287' },
    { label: 'Interrupted', count: 0, color: '#faa61a' },
    { label: 'Early Stops', count: 0, color: '#ED4245' },
    { label: 'Overtime', count: 0, color: '#00b0f4' },
  ]);

  useEffect(
    (userId: string) => {
      const load = async (userId) => {
        const service = new AnalyticsService();
        const data = await service.getSessionQualityBreakdown(userId);
        setSessionData([
        { label: 'Completed', count: data.completed, color: '#57F287' },
        { label: 'Interrupted', count: data.interrupted, color: '#faa61a' },
        { label: 'Early Stops', count: data.earlyStopped, color: '#ED4245' },
        { label: 'Overtime', count: data.overtime, color: '#00b0f4' },
      ]);
      };
      if (userId) load(userId);
    },
    [userId]
  );

  const total = sessionData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-4">Session Quality</h3>
      
      <div className="space-y-4">
        {sessionData.map((item) => {
          const percentage = (item.count / total) * 100;
          
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-[#dcddde]">{item.label}</span>
                </div>
                <span className="text-sm text-[#b9bbbe]">{item.count}</span>
              </div>
              
              {/* Progress bar */}
              <div className="w-full h-2 bg-[#202225] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot visualization */}
      <div className="mt-6 pt-4 border-t border-[#202225]">
        <div className="text-xs text-[#72767d] mb-3">Visual Distribution</div>
        <div className="flex items-center gap-2">
          {sessionData.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(item.count / 5) }).map((_, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

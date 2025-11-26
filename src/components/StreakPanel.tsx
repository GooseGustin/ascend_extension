import { useEffect, useState } from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { AuthService } from '../worker/services/auth.service';

export function StreakPanel() {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastBroken: 'N/A'
  });

  // Keep sparkline as mock for now
  const streakHealth = [
    1, 1, 1, 1, 1, 0, 1, 1, 1, 1,
    1, 1, 0, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 1, 1, 1, 1, 1, 1, 1, 1,
  ];

  useEffect(() => {
    const load = async () => {
        const session = new AuthService(); 
        const user = await session.getCurrentUser(); 
        if (user) {
        setStreakData({
          currentStreak: user.streakData.currentStreak,
          longestStreak: user.streakData.longestStreak,
          lastBroken: user.streakData.lastActivityDate || 'N/A'
        });
        }
    }; 

    load();
  }, []);


  return (
    <div className="bg-[#2f3136] rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="w-5 h-5 text-[#faa61a]" />
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe]">Streak Status</h3>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Current Streak */}
        <div>
          <div className="text-xs text-[#72767d] mb-1">Current Streak</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl text-[#faa61a]">{streakData.currentStreak}</span>
            <span className="text-sm text-[#b9bbbe]">days</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div>
          <div className="text-xs text-[#72767d] mb-1">Longest Streak</div>
          <div className="flex items-baseline gap-2">
            <TrendingUp className="w-4 h-4 text-[#57F287]" />
            <span className="text-4xl text-[#57F287]">{streakData.longestStreak}</span>
            <span className="text-sm text-[#b9bbbe]">days</span>
          </div>
        </div>
      </div>

      {/* Streak Health Heatmap */}
      <div className="mb-4">
        <div className="text-xs text-[#72767d] mb-2">Recent Activity (Last 30 Days)</div>
        <div className="grid grid-cols-10 gap-1">
          {streakHealth.map((day, index) => (
            <div
              key={index}
              className="aspect-square rounded-sm"
              style={{
                backgroundColor: day ? '#faa61a' : '#202225',
              }}
              title={day ? 'Active' : 'Missed'}
            />
          ))}
        </div>
      </div>

      {/* Last Broken */}
      <div className="pt-4 border-t border-[#202225]">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#72767d]">Last broken on:</span>
          <span className="text-[#dcddde]">{streakData.lastBroken}</span>
        </div>
      </div>
    </div>
  );
}

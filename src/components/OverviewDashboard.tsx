import { StatsStrip } from './StatsStrip';
import { ConsistencyScoreCard } from './ConsistencyScoreCard';
import { SessionQualityCard } from './SessionQualityCard';
import { WorkDistributionChart } from './WorkDistributionChart';
import { TimePercentageDonut } from './TimePercentageDonut';
import { QuestVelocityGraph } from './QuestVelocityGraph';
import { StreakPanel } from './StreakPanel';
import { ProgressHeatmap } from './ProgressHeatmap';

interface OverviewDashboardProps {
  userId: string;
  timeView?: string;
}

export function OverviewDashboard({ userId, timeView = 'overview' }: OverviewDashboardProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Strip */}
      <StatsStrip userId={userId} />

      {/* Row 1: Consistency + Session Quality */}
      <div className="grid grid-cols-2 gap-6">
        <ConsistencyScoreCard userId={userId} />
        <SessionQualityCard userId={userId} />
      </div>

      {/* Row 2: Charts Side by Side */}
      <div className="grid grid-cols-2 gap-6">
        <WorkDistributionChart userId={userId} timeView={timeView} />
        <TimePercentageDonut userId={userId} timeView={timeView} />
      </div>

      {/* Row 3: Velocity + Streak */}
      <div className="grid grid-cols-2 gap-6">
        <QuestVelocityGraph userId={userId} />
        <StreakPanel />
      </div>

      {/* Row 4: Heatmap (Full Width) */}
      <div>
        <h3 className="text-xs uppercase tracking-wide text-[#b9bbbe] mb-3">Activity Heatmap</h3>
        <ProgressHeatmap userId={userId} />
      </div>
    </div>
  );
}
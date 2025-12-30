import { useEffect, useState } from 'react';
import { Clock, Zap, AlertCircle, Trophy } from 'lucide-react';
import { AuthService } from '../worker/services/auth.service';
import { AnalyticsService } from '../worker/services/analytics.service';
import { QuestService } from '../worker/services/quest.service';

interface SessionHistoryViewProps {
  userId: string;
  logType?: 'session' | 'xp' | 'milestone';
}

export function SessionHistoryView({ userId, logType = 'session' }: SessionHistoryViewProps) {
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [xpLogs, setXpLogs] = useState<any[]>([]);
  const [milestoneLogs, setMilestoneLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (logType === 'session' || logType === 'xp') {
        const authService = new AuthService(); 
        const analyticsService = new AnalyticsService(); 
        const questService = new QuestService();
        const user: any = await authService.getCurrentUser();
        const sessions = await analyticsService.getSessionHistory({
          userId: user.userId, 
          limit: 50 
        });
        
        // Get quest details for each session
        const enrichedSessions = await Promise.all(
          sessions.map(async (session: any) => {
            const quest = await questService.getQuest(session.questId);
            return {
              id: session.sessionId,
              date: new Date(session.startTime).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }),
              time: new Date(session.startTime).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              }),
              quest: quest?.title || 'Unknown Quest',
              subtask: session.notes || 'Focused work',
              duration: session.actualDurationMin,
              xp: session.xpEarned,
              interrupted: session.interruptions.length > 0,
              color: quest?.difficulty?.userAssigned === 'Hard' ? '#ED4245' : '#5865F2'
            };
          })
        );
        
        setSessionHistory(enrichedSessions);
        
        // XP logs are just sessions with different formatting
        if (logType === 'xp') {
          const xpEntries = enrichedSessions.map((s: any) => ({
            id: s.id,
            date: s.date,
            action: 'Completed subtask',
            quest: s.quest,
            xp: s.xp
          }));
          setXpLogs(xpEntries);
        }
      }
      
      if (logType === 'milestone') {
        // Load milestone data from quest progress history
        // const quests = await workerRequest('quest:getAllQuests', undefined);
        const authService = new AuthService(); 
        const questService = new QuestService();
        const user: any = await authService.getCurrentUser();
        const quests = await questService.getUserQuests(user.userId);
        const milestones: any[] = [];
        
        quests.forEach((quest: any) => {
          quest.progressHistory?.forEach((entry: any) => {
            if (entry.isMilestone) {
              milestones.push({
                id: `${quest.questId}-${entry.date}`,
                date: new Date(entry.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }),
                quest: quest.title,
                milestone: `Milestone achieved`,
                xp: entry.expEarned,
                color: quest.difficulty?.userAssigned === 'Hard' ? '#ED4245' : '#5865F2'
              });
            }
          });
        });
        
        setMilestoneLogs(milestones.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
      }
    }

    loadData();
  }, [logType, userId]);


//   const sessionHistory = [
//     {
//       id: 's1',
//       date: 'Nov 15, 2025',
//       time: '09:30 AM',
//       quest: 'Work Sprint',
//       subtask: 'Code review for team PR',
//       duration: 25,
//       xp: 100,
//       interrupted: false,
//       color: '#5865F2',
//     },
//     {
//       id: 's2',
//       date: 'Nov 15, 2025',
//       time: '11:00 AM',
//       quest: 'Creative Flow',
//       subtask: 'Design new feature mockups',
//       duration: 50,
//       xp: 150,
//       interrupted: false,
//       color: '#57F287',
//     },
//     {
//       id: 's3',
//       date: 'Nov 15, 2025',
//       time: '02:15 PM',
//       quest: 'Work Sprint',
//       subtask: 'Update API endpoints',
//       duration: 15,
//       xp: 50,
//       interrupted: true,
//       color: '#5865F2',
//     },
//     {
//       id: 's4',
//       date: 'Nov 14, 2025',
//       time: '10:00 AM',
//       quest: 'Side Quest',
//       subtask: 'Write blog post outline',
//       duration: 40,
//       xp: 120,
//       interrupted: false,
//       color: '#EB459E',
//     },
//     {
//       id: 's5',
//       date: 'Nov 14, 2025',
//       time: '03:30 PM',
//       quest: 'Creative Flow',
//       subtask: 'Create style guide',
//       duration: 60,
//       xp: 200,
//       interrupted: false,
//       color: '#57F287',
//     },
//   ];

//   const xpLogs = [
//     { id: 'x1', date: 'Nov 15, 2025', action: 'Completed subtask', quest: 'Work Sprint', xp: 100 },
//     { id: 'x2', date: 'Nov 15, 2025', action: 'Completed subtask', quest: 'Creative Flow', xp: 150 },
//     { id: 'x3', date: 'Nov 14, 2025', action: 'Milestone reached', quest: 'Work Sprint', xp: 300 },
//     { id: 'x4', date: 'Nov 14, 2025', action: 'Completed subtask', quest: 'Side Quest', xp: 120 },
//   ];

//   const milestoneLogs = [
//     {
//       id: 'm1',
//       date: 'Nov 14, 2025',
//       quest: 'Work Sprint',
//       milestone: 'Complete 5 tasks',
//       xp: 300,
//       color: '#5865F2',
//     },
//     {
//       id: 'm2',
//       date: 'Nov 10, 2025',
//       quest: 'Creative Flow',
//       milestone: 'Design 3 mockups',
//       xp: 400,
//       color: '#57F287',
//     },
//     {
//       id: 'm3',
//       date: 'Nov 5, 2025',
//       quest: 'Daily Routine',
//       milestone: '7 day streak',
//       xp: 150,
//       color: '#FEE75C',
//     },
//   ];

  const renderSessionHistory = () => (
    <div className="space-y-3">
      {sessionHistory.map((session) => (
        <div key={session.id} className="bg-[#2f3136] rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${session.color}20`,
                    color: session.color,
                  }}
                >
                  {session.quest}
                </span>
                {session.interrupted && (
                  <div className="flex items-center gap-1 text-xs text-[#ED4245]">
                    <AlertCircle className="w-3 h-3" />
                    Interrupted
                  </div>
                )}
              </div>
              <div className="text-sm text-white">{session.subtask}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#72767d]">{session.date}</div>
              <div className="text-xs text-[#b9bbbe]">{session.time}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-[#b9bbbe]">
              <Clock className="w-3 h-3" />
              {session.duration} min
            </div>
            <div className="flex items-center gap-1 text-[#00b0f4]">
              <Zap className="w-3 h-3" />
              +{session.xp} XP
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderXPLogs = () => (
    <div className="space-y-2">
      {xpLogs.map((log) => (
        <div key={log.id} className="bg-[#2f3136] rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-white mb-1">{log.action}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#72767d]">{log.quest}</span>
              <span className="text-xs text-[#72767d]">•</span>
              <span className="text-xs text-[#72767d]">{log.date}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#00b0f4]">
            <Zap className="w-4 h-4" />
            <span>+{log.xp}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMilestoneLogs = () => (
    <div className="space-y-3">
      {milestoneLogs.map((log) => (
        <div key={log.id} className="bg-[#2f3136] rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#faa61a]" />
              <div>
                <div className="text-sm text-white mb-1">{log.milestone}</div>
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${log.color}20`,
                    color: log.color,
                  }}
                >
                  {log.quest}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-[#72767d]">{log.date}</div>
              <div className="flex items-center gap-1 text-[#faa61a] mt-1">
                <Zap className="w-3 h-3" />
                <span className="text-sm">+{log.xp} XP</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const getTitle = () => {
    if (logType === 'xp') return 'XP Logs';
    if (logType === 'milestone') return 'Milestone Log';
    return 'Session History';
  };

  const renderContent = () => {
    if (logType === 'xp') return renderXPLogs();
    if (logType === 'milestone') return renderMilestoneLogs();
    return renderSessionHistory();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl text-white mb-6">{getTitle()}</h2>
      {renderContent()}
    </div>
  );
}

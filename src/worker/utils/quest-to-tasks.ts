import { Quest } from '../models/Quest';
import { Task } from '../../App'

export default function questToTasks(quests: Quest[]): Task[] {
  console.log('[QuestToTasks]', quests);

  const allTasks = quests.flatMap(q => {

    return q.subtasks.map(st => ({
      id: st.id,
      title: st.title,
      questId: q.questId,
      questTag: q.title,
      questColor: q.color,
      completed: st.isComplete,
      levelReq: q.gamification.currentLevel
    }));
  });

  console.log('[QuestToTasks]', allTasks);

  return allTasks; 
}

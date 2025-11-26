import { Plus } from 'lucide-react';

interface FloatingPlusButtonProps {
  onClick: () => void;
}

// export function FloatingPlusButton({ onClick }: FloatingPlusButtonProps) {
//   return (
//     <button
//       onClick={onClick}
//       // className="fixed bottom-24 right-6 w-12 h-12 rounded-full bg-[#5865F2] hover:bg-[#4752C4] transition-all shadow-lg hover:shadow-xl flex items-center justify-center group z-50 hover:scale-110"
//       className="-6 h-6 text-white ml-0.5 mx-24"
//       title="Create New Quest"
//     >
//       <Plus className="w-5 h-5 text-white transition-transform" />
//     </button>
//   );
// }

export function FloatingPlusButton({ onClick }: FloatingPlusButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-2d4 bottom-6 right-6 w-12 h-12 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-40"
      aria-label="Create new quest"
    >
      <Plus className="w-6 h-6 text-white" />
    </button>
  );
}
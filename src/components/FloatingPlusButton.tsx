import { Plus } from 'lucide-react';

interface FloatingPlusButtonProps {
  onClick: () => void;
}

export function FloatingPlusButton({ onClick }: FloatingPlusButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-2d4 bottom-6 right-8 w-12 h-12 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-40"
      aria-label="Create new quest"
    >
      <Plus className="w-6 h-6 text-white" />
    </button>
  );
}
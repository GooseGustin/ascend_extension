import { Home, Sword, Package, TrendingUp, Users, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface NavigationSidebarProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'quests', icon: Sword, label: 'Quests' },
  { id: 'inventory', icon: Package, label: 'Inventory' },
  { id: 'progress', icon: TrendingUp, label: 'Progress' },
  { id: 'guilds', icon: Users, label: 'Guilds' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function NavigationSidebar({ activeNav, setActiveNav }: NavigationSidebarProps) {
  return (
    <div className="w-[72px] bg-[#202225] flex flex-col items-center py-3 gap-2">
      {/* App Icon/Logo */}
      <div className="w-12 h-12 bg-[#5865F2] rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center mb-2 cursor-pointer">
        <Sword className="w-6 h-6 text-white" />
      </div>
      
      <div className="w-8 h-[2px] bg-[#36393f] rounded-full mb-1" />
      
      {/* Navigation Items */}
      <TooltipProvider delayDuration={100}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveNav(item.id)}
                  className={`
                    w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200
                    flex items-center justify-center relative group
                    ${isActive ? 'bg-[#5865F2] rounded-[16px]' : 'bg-[#36393f] hover:bg-[#5865F2]'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[#dcddde]'}`} />
                  {isActive && (
                    <div className="absolute -left-1 w-2 h-10 bg-white rounded-r-full" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#18191c] border-0 text-[#dcddde]">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}

import { Menu } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Header = () => {
  const { profile } = useStore();

  return (
    <header className="flex justify-between items-center px-5 py-3 w-full sticky top-0 z-40 bg-background">
      <div className="flex items-center gap-4">
        <button className="text-primary hover:bg-surface-container-low transition-colors p-2 rounded-full active:scale-95 duration-150 flex items-center justify-center">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-sans text-3xl font-bold text-primary tracking-tight">My Life</h1>
      </div>
      <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-outline-variant hover:bg-surface-container-low transition-colors active:scale-95 duration-150">
        <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
      </button>
    </header>
  );
};

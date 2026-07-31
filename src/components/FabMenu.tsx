import { Plus } from 'lucide-react';

export const FabMenu = () => {
  return (
    <button className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-lg hover:bg-surface-tint transition-all z-40 active:scale-95">
      <Plus className="w-8 h-8" />
    </button>
  );
};

import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Flame, Film, BookOpen, CheckSquare, Settings } from 'lucide-react';

export const MoreView = () => {
  const modules = [
    { name: 'Kalori', path: '/calories', icon: Flame, color: 'text-primary' },
    { name: 'Medya', path: '/media', icon: Film, color: 'text-tertiary' },
    { name: 'Alışveriş', path: '/shopping', icon: ShoppingCart, color: 'text-secondary' },
    { name: 'Notlar', path: '/notes', icon: BookOpen, color: 'text-outline' },
    { name: 'Görevler', path: '/tasks', icon: CheckSquare, color: 'text-primary' },
    { name: 'Ayarlar', path: '/settings', icon: Settings, color: 'text-on-surface-variant' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6 pb-10"
    >
      <h2 className="text-2xl font-semibold text-on-background">Tüm Modüller</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {modules.map(mod => (
          <NavLink 
            key={mod.name}
            to={mod.path}
            className="bg-surface-container-lowest rounded-3xl p-6 card-shadow flex flex-col items-center justify-center gap-3 interactive-card"
          >
            <div className={`p-4 rounded-full bg-surface-container-low ${mod.color}`}>
              <mod.icon className="w-8 h-8" />
            </div>
            <span className="font-semibold text-on-surface">{mod.name}</span>
          </NavLink>
        ))}
      </div>
    </motion.div>
  );
};

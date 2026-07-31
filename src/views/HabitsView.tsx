import { motion } from 'framer-motion';
import { Droplets, BookOpen, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export const HabitsView = () => {
  const { waterLog, updateWaterLog, readingLog, updateReadingLog } = useStore();
  const [readingInput, setReadingInput] = useState('');

  const waterProgress = Math.min((waterLog.currentMl / waterLog.targetMl) * 100, 100);
  const readingProgress = Math.min((readingLog.pagesReadToday / 320) * 100, 100); // hardcoded max pages for demo

  const handleReadingSubmit = () => {
    if (readingInput) {
      updateReadingLog(parseInt(readingInput, 10));
      setReadingInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-4"
    >
      {/* Water Tracking Module */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow flex flex-col gap-6 interactive-card">
        <div className="flex items-center gap-2">
          <Droplets className="text-primary w-6 h-6" />
          <h2 className="text-xl font-semibold text-on-surface">Su Tüketimi</h2>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4">
          <div className="text-3xl font-bold text-primary">
            {waterLog.currentMl} <span className="text-2xl font-semibold text-on-surface-variant">/ {waterLog.targetMl} ml</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${waterProgress}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <button 
            onClick={() => updateWaterLog(250)}
            className="bg-surface-container-low hover:bg-surface-container transition-colors text-primary text-xs font-semibold py-3 px-5 rounded-full flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-[18px] h-[18px]" />
            250 ml (Bardak)
          </button>
          <button 
            onClick={() => updateWaterLog(500)}
            className="bg-surface-container-low hover:bg-surface-container transition-colors text-primary text-xs font-semibold py-3 px-5 rounded-full flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-[18px] h-[18px]" />
            500 ml
          </button>
        </div>
      </section>

      {/* Book Reading Module */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow flex flex-col gap-6 interactive-card mb-8">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary w-6 h-6" />
          <h2 className="text-xl font-semibold text-on-surface">Kitap Okuma</h2>
        </div>
        
        <div className="flex gap-4 items-center">
          <div className="w-16 h-24 bg-surface-container rounded-lg overflow-hidden shrink-0 shadow-sm">
            <img 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEtnFnZ2VfGdlJExwUsoWl-Nypgs9jEKvVumfm0TnKzk5KBBGxwoU9Pm1KQuB-_Gp-Fj6BtoBKu3H3lm9SD2IpOH8R2q93JaaMudgQxNu2xdaznp8XSadxbMf4ncXpZDlbC1ss52uSAxU7jjlmLkExd5kUbkl0aA9YQjbHMipJ1KKDkGX0bG6YrWgf_ihe-HJBf45U89dHriqqt2OXnOifViIddrAKAQCwuHSU5M4ysq-_8vZj0jw2" 
              alt={readingLog.currentBookTitle} 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base text-on-surface font-medium">{readingLog.currentBookTitle}</h3>
            <p className="text-sm text-on-surface-variant">James Clear</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <span className="text-sm text-on-surface-variant">İlerleme</span>
            <span className="text-xs font-semibold text-primary">
              {readingLog.pagesReadToday} / 320 sayfa <span className="opacity-60 ml-1">(%{Math.round(readingProgress)})</span>
            </span>
          </div>
          <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${readingProgress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <input 
            type="number" 
            placeholder="Kaldığım sayfa..." 
            value={readingInput}
            onChange={(e) => setReadingInput(e.target.value)}
            className="flex-1 bg-surface-container-low border-none rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <button 
            onClick={handleReadingSubmit}
            className="bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-medium hover:bg-surface-tint transition-colors active:scale-95"
          >
            Güncelle
          </button>
        </div>
      </section>
    </motion.div>
  );
};

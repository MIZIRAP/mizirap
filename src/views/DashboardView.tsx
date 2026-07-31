import { motion } from 'framer-motion';
import { Droplets, BookOpen, Dumbbell, Wallet, CheckCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export const DashboardView = () => {
  const { profile, waterLog, readingLog } = useStore();

  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8"
    >
      {/* Featured Section */}
      <section className="bg-surface-container-lowest rounded-3xl p-5 card-shadow flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-on-surface">Merhaba, {profile.name}!</h2>
        <p className="text-sm text-on-surface-variant">Bugün harika bir gün olacak. İşte senin için hazırladığımız özet.</p>
        <p className="text-[11px] font-medium text-on-surface-variant uppercase mt-2">{today}</p>
      </section>

      {/* 2x2 Grid Section */}
      <section className="grid grid-cols-2 gap-4">
        {/* Water Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow interactive-card flex flex-col justify-between aspect-square">
          <div className="p-2 w-fit rounded-full bg-secondary-container text-primary">
            <Droplets className="w-5 h-5" />
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-on-surface-variant uppercase">Su Tüketimi</span>
            <span className="text-xl font-semibold text-on-surface">
              {waterLog.currentMl} <span className="text-sm font-normal text-on-surface-variant">/ {waterLog.targetMl} ml</span>
            </span>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500" 
                style={{ width: `${Math.min((waterLog.currentMl / waterLog.targetMl) * 100, 100)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Reading Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow interactive-card flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-full bg-secondary-container text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium bg-surface-container-low text-on-surface px-2 py-1 rounded-full">
              {readingLog.booksCompleted}/{readingLog.targetBooks}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-on-surface-variant uppercase">Okuma</span>
            <span className="text-xl font-semibold text-on-surface">{readingLog.pagesReadToday} sayfa</span>
            <span className="text-sm text-on-surface-variant">bugün</span>
          </div>
        </div>

        {/* Sport Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow interactive-card flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <div className="p-2 rounded-full bg-secondary-container text-primary">
              <Dumbbell className="w-5 h-5" />
            </div>
            <button className="w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center"></button>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-on-surface-variant uppercase">Spor</span>
            <span className="text-xl font-semibold text-on-surface">Yapılmadı</span>
            <span className="text-sm text-on-surface-variant">Hedef: 4/hafta</span>
          </div>
        </div>

        {/* Finance Card */}
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow interactive-card flex flex-col justify-between aspect-square">
          <div className="p-2 w-fit rounded-full bg-secondary-container text-primary">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-on-surface-variant uppercase">Finans</span>
            <span className="text-xl font-semibold text-primary">4,250 TL</span>
            <span className="text-sm text-on-surface-variant">Bakiye</span>
          </div>
        </div>
      </section>

      {/* Bottom List Section */}
      <section className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-on-surface">Bekleyen Görevler</h3>
          <span className="text-primary text-xs font-semibold">Tümünü Gör</span>
        </div>
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-surface-container-low text-primary">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-base text-on-surface">Proje raporunu tamamla</p>
              <p className="text-[11px] text-on-surface-variant">Bugün, 17:00</p>
            </div>
          </div>
          <div className="h-px bg-outline-variant opacity-20"></div>
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-surface-container-low text-primary">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-base text-on-surface">Market alışverişi</p>
              <p className="text-[11px] text-on-surface-variant">Yarın</p>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
};

import { motion } from 'framer-motion';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, CreditCard, ShoppingBag, Utensils, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useState } from 'react';

export const FinanceView = () => {
  const { transactions, addTransaction } = useStore();
  
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const totalBalance = 4250 + transactions.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((acc, curr) => acc + curr.amount, 0) + 12000;
  const totalExpense = transactions.filter(t => t.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0) + 7750;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && amount) {
      addTransaction({
        id: Date.now().toString(),
        title,
        amount: type === 'expense' ? -parseFloat(amount) : parseFloat(amount),
        category: type === 'expense' ? 'Market' : 'Maaş', // Simplified for demo
        paymentMethod: 'Nakit',
        date: new Date().toISOString()
      });
      setTitle('');
      setAmount('');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Market': return <ShoppingBag className="w-5 h-5 text-primary" />;
      case 'Yeme/İçme': return <Utensils className="w-5 h-5 text-tertiary" />;
      case 'Fatura': return <Zap className="w-5 h-5 text-error" />;
      default: return <CreditCard className="w-5 h-5 text-outline" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6 pb-10"
    >
      {/* Balance Card */}
      <section className="bg-primary rounded-3xl p-6 text-on-primary shadow-lg flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="flex items-center gap-2 relative z-10">
          <Wallet className="w-6 h-6 text-primary-fixed-dim" />
          <h2 className="text-sm font-medium text-primary-fixed-dim">Toplam Bakiye</h2>
        </div>
        
        <div className="text-4xl font-bold tracking-tight relative z-10">
          ₺{totalBalance.toLocaleString('tr-TR')}
        </div>

        <div className="flex gap-4 relative z-10 pt-2 border-t border-white/20">
          <div className="flex-1">
            <div className="flex items-center gap-1 text-primary-fixed-dim text-xs mb-1">
              <ArrowUpRight className="w-4 h-4" /> Gelir
            </div>
            <div className="text-lg font-semibold">₺{totalIncome.toLocaleString('tr-TR')}</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1 text-primary-fixed-dim text-xs mb-1">
              <ArrowDownRight className="w-4 h-4" /> Gider
            </div>
            <div className="text-lg font-semibold">₺{totalExpense.toLocaleString('tr-TR')}</div>
          </div>
        </div>
      </section>

      {/* Add Transaction Form */}
      <section className="bg-surface-container-lowest rounded-3xl p-6 card-shadow">
        <h3 className="text-lg font-semibold text-on-background mb-4">Hızlı İşlem</h3>
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl">
            <button 
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${type === 'expense' ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-on-surface-variant'}`}
            >
              Gider
            </button>
            <button 
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${type === 'income' ? 'bg-surface-container-lowest text-on-background shadow-sm' : 'text-on-surface-variant'}`}
            >
              Gelir
            </button>
          </div>
          
          <div className="flex gap-3">
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 outline-none" 
              placeholder="Açıklama" 
              required
            />
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 bg-surface-container-low border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm py-3 px-4 outline-none" 
              placeholder="0.00" 
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary text-on-primary rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-tint active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" /> İşlem Ekle
          </button>
        </form>
      </section>

      {/* Transaction List */}
      <section className="flex flex-col gap-4">
        <h3 className="text-xl font-semibold text-on-surface">Son İşlemler</h3>
        
        <div className="bg-surface-container-lowest rounded-3xl p-4 card-shadow flex flex-col gap-1">
          {transactions.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4">Henüz işlem bulunmuyor.</p>
          )}
          
          {transactions.map((tx, idx) => (
            <div key={tx.id}>
              <div className="flex items-center justify-between p-2 hover:bg-surface-container-low rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${tx.amount > 0 ? 'bg-secondary-container text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    {tx.amount > 0 ? <ArrowUpRight className="w-5 h-5" /> : getCategoryIcon(tx.category)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{tx.title}</p>
                    <p className="text-[11px] text-on-surface-variant">{tx.category} • {new Date(tx.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
                <div className={`text-base font-bold ${tx.amount > 0 ? 'text-primary' : 'text-on-surface'}`}>
                  {tx.amount > 0 ? '+' : ''}₺{Math.abs(tx.amount).toLocaleString('tr-TR')}
                </div>
              </div>
              {idx < transactions.length - 1 && <div className="h-px bg-surface-container mx-2 my-1"></div>}
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

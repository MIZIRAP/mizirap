import { NavLink } from 'react-router-dom';
import { Home, CheckCircle2, Dumbbell, Wallet, ShoppingCart } from 'lucide-react';

export const Navbar = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-4 py-2 bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)] rounded-full mx-auto mb-8 w-[90%] max-w-md md:hidden">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-2 transition-all active:scale-[0.98] duration-200 ${
            isActive
              ? 'bg-secondary-container text-primary rounded-xl px-4 py-2'
              : 'text-on-surface-variant hover:text-primary'
          }`
        }
      >
        <Home className="w-6 h-6" />
        <span className="text-[11px] font-medium mt-1">Özet</span>
      </NavLink>
      
      <NavLink
        to="/habits"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-2 transition-all active:scale-[0.98] duration-200 ${
            isActive
              ? 'bg-secondary-container text-primary rounded-xl px-4 py-2'
              : 'text-on-surface-variant hover:text-primary'
          }`
        }
      >
        <CheckCircle2 className="w-6 h-6" />
        <span className="text-[11px] font-medium mt-1">Alışkanlık</span>
      </NavLink>

      <NavLink
        to="/workout"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-2 transition-all active:scale-[0.98] duration-200 ${
            isActive
              ? 'bg-secondary-container text-primary rounded-xl px-4 py-2'
              : 'text-on-surface-variant hover:text-primary'
          }`
        }
      >
        <Dumbbell className="w-6 h-6" />
        <span className="text-[11px] font-medium mt-1">Spor</span>
      </NavLink>

      <NavLink
        to="/finance"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-2 transition-all active:scale-[0.98] duration-200 ${
            isActive
              ? 'bg-secondary-container text-primary rounded-xl px-4 py-2'
              : 'text-on-surface-variant hover:text-primary'
          }`
        }
      >
        <Wallet className="w-6 h-6" />
        <span className="text-[11px] font-medium mt-1">Finans</span>
      </NavLink>

      <NavLink
        to="/more"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center p-2 transition-all active:scale-[0.98] duration-200 ${
            isActive
              ? 'bg-secondary-container text-primary rounded-xl px-4 py-2'
              : 'text-on-surface-variant hover:text-primary'
          }`
        }
      >
        <ShoppingCart className="w-6 h-6" />
        <span className="text-[11px] font-medium mt-1">Liste</span>
      </NavLink>
    </nav>
  );
};

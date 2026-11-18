import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || 'light'
  );
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('aura_theme', next);
    } catch {}
    setTheme(next);
  };
  return (
    <button
      onClick={toggle}
      className="glass-btn-secondary px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </button>
  );
}

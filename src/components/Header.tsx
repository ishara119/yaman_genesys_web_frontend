import { useEffect, useState } from 'react';
import SoundToggle from './SoundToggle';

const MENU_ITEMS = ['LINEUP', 'TICKETS', 'INFO', 'CONTACT'];

export default function Header() {
  const [open, setOpen] = useState(false);

  const toggleMenu = () => setOpen((prev) => !prev);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="site-header">
        <button
          className="hamburger"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobileMenu"
          onClick={toggleMenu}
        >
          <span />
          <span />
          <span />
        </button>
        <SoundToggle />
      </header>

      <nav
        id="mobileMenu"
        className={`mobile-menu${open ? ' open' : ''}`}
        aria-hidden={!open}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <ul>
          {MENU_ITEMS.map((item) => (
            <li key={item}>
              <a href="#" data-glitch-text={item}>
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

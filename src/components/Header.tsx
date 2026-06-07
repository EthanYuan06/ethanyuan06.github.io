import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow py-3 text-gray-800' : 'bg-transparent py-4 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="text-lg font-bold tracking-wider hover:text-brand transition font-sans">
          EY's Blog
        </Link>
        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6 text-sm tracking-widest font-bold font-sans">
          <Link to="/" className="hover:text-brand transition uppercase">Home</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-brand transition uppercase">GitHub</a>
        </div>
        {/* Mobile Navigation Toggle */}
        <button
          className="md:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Content */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-white border-t border-gray-100 shadow-md transition-all duration-300 overflow-hidden ${
          menuOpen ? 'max-h-60' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col space-y-4 py-4 px-6 text-sm font-bold tracking-widest text-gray-800 font-sans">
          <Link to="/" className="hover:text-brand transition uppercase">Home</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-brand transition uppercase">GitHub</a>
        </div>
      </div>
    </nav>
  );
}

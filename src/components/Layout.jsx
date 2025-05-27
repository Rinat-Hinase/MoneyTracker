import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowLeftOnRectangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/solid';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

const links = [
  { name: 'Dashboard', path: '/dashboard', icon: <HomeIcon className="h-5 w-5" /> },
  { name: 'Movimientos', path: '/movimientos', icon: <CurrencyDollarIcon className="h-5 w-5" /> },
  { name: 'Deudores', path: '/deudores', icon: <UsersIcon className="h-5 w-5" /> },
  { name: 'Resumen Semanal', path: '/movimientos-semanales', icon: <CalendarDaysIcon className="h-5 w-5" /> },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-6 text-center">MoneyTracker</h1>
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-200 ${
                  location.pathname === link.path ? 'bg-blue-100 font-semibold' : ''
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={cerrarSesion}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-100 rounded"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          Cerrar sesión
        </button>
      </aside>

      {/* Contenido principal con scroll */}
      <main className="flex-1 h-screen overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

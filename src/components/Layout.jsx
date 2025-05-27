import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowLeftOnRectangleIcon,
  CalendarDaysIcon,
  Bars3Icon,
  XMarkIcon,
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
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cerrarSesion = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed z-40 bg-white w-64 shadow-lg h-full p-4 flex-col justify-between md:flex ${
          menuAbierto ? 'flex' : 'hidden'
        } md:static`}
      >
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
                onClick={() => setMenuAbierto(false)}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <button
          onClick={cerrarSesion}
          className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-100 rounded mt-6"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          Cerrar sesión
        </button>
      </aside>

      {/* Menú móvil */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="text-gray-700 bg-white p-2 rounded shadow"
        >
          {menuAbierto ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* Contenido principal */}
      <main className="flex-1 px-4 md:px-8 py-6 w-full max-w-screen-2xl mx-auto">
        {children}
      </main>
    </div>
  );
}

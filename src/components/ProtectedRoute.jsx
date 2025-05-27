// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebaseConfig";

export default function ProtectedRoute({ children }) {
  const [cargando, setCargando] = useState(true);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioAutenticado(!!user);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Verificando sesión...</p>
      </div>
    );
  }

  return usuarioAutenticado ? children : <Navigate to="/" />;
}

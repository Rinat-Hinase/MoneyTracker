import React, { useEffect, useState } from "react";
import { auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import BalanceDiario from "../components/graficas/BalanceDiario";
import TotalesPorDia from "../components/graficas/TotalesPorDia.jsx";
import DistribucionMovimientos from "../components/graficas/DistribucionMovimientos";
import TopDeudores from "../components/graficas/TopDeudores";
import HistorialPagosSemanal from "../components/graficas/HistorialPagosSemanal";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [totalCuenta, setTotalCuenta] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      navigate("/");
    } else {
      setUser(currentUser);
      cargarTotalCuenta(currentUser.uid);
    }
  }, [navigate]);

  const cargarTotalCuenta = async (uid) => {
    try {
      const ref = doc(db, "cuentas", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setTotalCuenta(snap.data().total || 0);
      } else {
        setTotalCuenta(0);
      }
    } catch (err) {
      console.error("Error al obtener total:", err);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Panel Principal</h2>

        {user && (
          <p className="text-gray-600">
            ¡Hola <strong>{user.email}</strong>, bienvenido al sistema!
          </p>
        )}

        {totalCuenta !== null && (
          <div className="bg-white border-l-4 border-blue-600 p-4 rounded shadow max-w-sm">
            <p className="text-sm text-blue-800 font-semibold">Total en cuenta</p>
            <p className="text-2xl font-bold text-blue-900">
              ${totalCuenta.toLocaleString()}
            </p>
          </div>
        )}

        {/* Gráficas en dos columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BalanceDiario />
          <TotalesPorDia />
          <DistribucionMovimientos />
          <TopDeudores />
          <HistorialPagosSemanal />
        </div>
      </div>
    </Layout>
  );
}

import React, { useEffect, useState } from "react";
import { db, auth } from "../../services/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DistribucionMovimientos() {
  const [datosGrafica, setDatosGrafica] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const q = query(collection(db, "movimientos"), where("usuario_id", "==", uid));
      const snap = await getDocs(q);
      const movimientos = snap.docs.map(doc => doc.data());

      let ingresosManual = 0;
      let pagosRecibidos = 0;
      let egresos = 0;
      let prestamos = 0;

      movimientos.forEach(m => {
        if (m.tipo === "ingreso") {
          if (m.descripcion?.toLowerCase().includes("pago a")) {
            pagosRecibidos += m.monto;
          } else {
            ingresosManual += m.monto;
          }
        } else if (m.tipo === "egreso") {
          if (m.descripcion?.toLowerCase().includes("deuda")) {
            prestamos += m.monto;
          } else {
            egresos += m.monto;
          }
        }
      });

      const datos = {
        labels: ["Ingresos manuales", "Pagos recibidos", "Egresos", "Préstamos"],
        datasets: [{
          data: [ingresosManual, pagosRecibidos, egresos, prestamos],
          backgroundColor: ["#22c55e", "#3b82f6", "#ef4444", "#facc15"],
          borderColor: "#fff",
          borderWidth: 1,
        }]
      };

      setDatosGrafica(datos);
    };

    cargarDatos();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow w-full max-w-xl">
      <h3 className="text-lg font-bold mb-4 text-purple-600">📊 Distribución de Movimientos</h3>
      {datosGrafica ? (
        <Doughnut data={datosGrafica} />
      ) : (
        <p className="text-sm text-gray-500">Cargando gráfica...</p>
      )}
    </div>
  );
}

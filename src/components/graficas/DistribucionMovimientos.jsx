import React, { useEffect, useState } from "react";
import { db, auth } from "../../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
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

      const [ingresosSnap, egresosSnap, deudoresSnap] = await Promise.all([
        getDocs(collection(db, "ingresos")),
        getDocs(collection(db, "egresos")),
        getDocs(collection(db, "deudores")),
      ]);

      const ingresos = ingresosSnap.docs.filter(doc => doc.data().usuario_id === uid);
      const egresos = egresosSnap.docs.filter(doc => doc.data().usuario_id === uid);

      let pagos = 0;
      let aumentos = 0;

      for (const deudor of deudoresSnap.docs) {
        const data = deudor.data();
        if (data.usuario_id !== uid) continue;

        const historialSnap = await getDocs(collection(db, "deudores", deudor.id, "historial"));
        historialSnap.forEach(h => {
          const hdata = h.data();
          if (hdata.tipo === "pago") pagos += hdata.monto;
          if (hdata.tipo === "aumento") aumentos += hdata.monto;
        });
      }

      const datos = {
        labels: ["Ingresos manuales", "Pagos recibidos", "Egresos", "Préstamos"],
        datasets: [{
          data: [ingresos.reduce((a, b) => a + b.data().monto, 0), pagos, egresos.reduce((a, b) => a + b.data().monto, 0), aumentos],
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

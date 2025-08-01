import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { db, auth } from "../../services/firebaseConfig";
import {
  startOfWeek,
  addDays,
  format,
} from "date-fns";
import {
  getDoc,
  doc,
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function BalanceDiario() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const cuentaRef = doc(db, "cuentas", uid);
      const cuentaSnap = await getDoc(cuentaRef);
      let total = cuentaSnap.exists() ? cuentaSnap.data().total : 0;

      const hoy = new Date();
      const inicioSemana = startOfWeek(hoy, { weekStartsOn: 1 });
      const dias = [...Array(7)].map((_, i) => addDays(inicioSemana, i));

      const movimientosRef = collection(db, "movimientos");
      const q = query(movimientosRef, where("usuario_id", "==", uid));
      const movimientosSnap = await getDocs(q);

      const movimientos = movimientosSnap.docs.map((doc) => doc.data());

      const resultado = dias.map((dia) => {
        const fecha = format(dia, "yyyy-MM-dd");
        let delta = 0;
        movimientos.forEach((m) => {
          const mFecha = format(m.fecha.toDate(), "yyyy-MM-dd");
          if (mFecha === fecha) {
            if (m.tipo === "ingreso") delta += m.monto;
            if (m.tipo === "egreso") delta -= m.monto;
          }
        });
        return { fecha, delta };
      });

      let acumulado = total;
      const labels = [];
      const valores = [];

      for (let i = resultado.length - 1; i >= 0; i--) {
        acumulado -= resultado[i].delta;
      }

      for (let i = 0; i < resultado.length; i++) {
        acumulado += resultado[i].delta;
        labels.push(format(addDays(inicioSemana, i), "dd/MM"));
        valores.push(acumulado);
      }

      setDatos({
        labels,
        datasets: [
          {
            label: "Saldo diario",
            data: valores,
            fill: true,
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderColor: "#22c55e",
            tension: 0.3,
          },
        ],
      });
    };

    cargarDatos();
  }, []);

  if (!datos) return <p className="text-sm text-gray-500">Cargando gráfica...</p>;

  return (
    <div className="bg-white p-4 rounded shadow w-full max-w-2xl">
      <h3 className="text-lg font-bold mb-2 text-green-600">💹 Balance Diario (última semana)</h3>
      <Line data={datos} />
    </div>
  );
}

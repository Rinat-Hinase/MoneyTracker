import React, { useEffect, useState } from "react";
import { db, auth } from "../../services/firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format,
  subWeeks,
} from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function HistorialPagosSemanal() {
  const [graficaDatos, setGraficaDatos] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const q = query(collection(db, "movimientos"), where("usuario_id", "==", uid));
      const snap = await getDocs(q);
      const movimientos = snap.docs.map(doc => doc.data());

      const pagosPorSemana = {};

      movimientos.forEach(mov => {
        if (
          mov.tipo === "ingreso" &&
          mov.descripcion?.toLowerCase().includes("pago a")
        ) {
          const fecha = mov.fecha.toDate();
          for (let i = 0; i < 6; i++) {
            const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
            const end = endOfWeek(start, { weekStartsOn: 1 });
            if (isWithinInterval(fecha, { start, end })) {
              const label = format(start, "dd/MM") + " - " + format(end, "dd/MM");
              pagosPorSemana[label] = (pagosPorSemana[label] || 0) + mov.monto;
              break;
            }
          }
        }
      });

      const labels = Object.keys(pagosPorSemana).sort((a, b) => {
        const aDate = new Date("2024/" + a.split(" - ")[0].split("/").reverse().join("/"));
        const bDate = new Date("2024/" + b.split(" - ")[0].split("/").reverse().join("/"));
        return aDate - bDate;
      });

      const data = {
        labels,
        datasets: [
          {
            label: "Pagos por semana",
            data: labels.map((l) => pagosPorSemana[l] || 0),
            fill: false,
            borderColor: "#3b82f6",
            backgroundColor: "#3b82f6",
            tension: 0.3,
          },
        ],
      };

      setGraficaDatos(data);
    };

    cargarDatos();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow w-full max-w-2xl">
      <h3 className="text-lg font-bold mb-2 text-blue-600">📈 Pagos Semanales</h3>
      {graficaDatos ? (
        <Line data={graficaDatos} />
      ) : (
        <p className="text-sm text-gray-500">Cargando datos...</p>
      )}
    </div>
  );
}

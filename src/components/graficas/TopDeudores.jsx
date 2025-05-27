import React, { useEffect, useState } from "react";
import { db, auth } from "../../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function TopDeudores() {
  const [datosGrafica, setDatosGrafica] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const deudoresSnap = await getDocs(collection(db, "deudores"));
      const deudoresUsuario = deudoresSnap.docs
        .map((doc) => doc.data())
        .filter((d) => d.usuario_id === uid && d.monto_total > 0);

      const ordenados = deudoresUsuario
        .sort((a, b) => b.monto_total - a.monto_total)
        .slice(0, 5); // Top 5

      const labels = ordenados.map((d) => d.nombre);
      const montos = ordenados.map((d) => d.monto_total);

      const datos = {
        labels,
        datasets: [
          {
            label: "Saldo pendiente",
            data: montos,
            backgroundColor: "#f97316", // naranja
          },
        ],
      };

      setDatosGrafica(datos);
    };

    cargarDatos();
  }, []);

  return (
    <div className="bg-white p-4 rounded shadow w-full max-w-xl">
      <h3 className="text-lg font-bold mb-4 text-orange-600">🏷️ Top Deudores</h3>
      {datosGrafica ? (
        <Bar
          data={datosGrafica}
          options={{
            indexAxis: "y",
            responsive: true,
            plugins: {
              legend: { display: false },
              title: { display: false },
            },
            scales: {
              x: { beginAtZero: true },
            },
          }}
        />
      ) : (
        <p className="text-sm text-gray-500">Cargando gráfica...</p>
      )}
    </div>
  );
}

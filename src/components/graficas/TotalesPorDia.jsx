import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../../services/firebaseConfig";
import { Line } from "react-chartjs-2";
import { subDays, format, isSameDay } from "date-fns";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

export default function TotalesPorDia() {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchData = async () => {
      const ingresosSnap = await getDocs(collection(db, "ingresos"));
      const egresosSnap = await getDocs(collection(db, "egresos"));
      const deudoresSnap = await getDocs(collection(db, "deudores"));

      const fechas = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));

      const ingresos = ingresosSnap.docs
        .map(doc => doc.data())
        .filter(d => d.usuario_id === uid);

      const egresos = egresosSnap.docs
        .map(doc => doc.data())
        .filter(d => d.usuario_id === uid);

      const pagos = [];

      for (const d of deudoresSnap.docs) {
        const data = d.data();
        if (data.usuario_id !== uid) continue;

        const subRef = collection(db, "deudores", d.id, "historial");
        const subSnap = await getDocs(subRef);
        subSnap.forEach(mov => {
          const movData = mov.data();
          if (movData.tipo === "pago") {
            pagos.push(movData);
          }
        });
      }

      const formateado = fechas.map((fecha) => {
        const totalIngresos = ingresos
          .filter(d => isSameDay(d.fecha.toDate(), fecha))
          .reduce((acc, d) => acc + d.monto, 0);

        const totalEgresos = egresos
          .filter(d => isSameDay(d.fecha.toDate(), fecha))
          .reduce((acc, d) => acc + d.monto, 0);

        const totalPagos = pagos
          .filter(d => isSameDay(d.fecha.toDate(), fecha))
          .reduce((acc, d) => acc + d.monto, 0);

        return {
          dia: format(fecha, "EEE dd"),
          ingresos: totalIngresos,
          egresos: totalEgresos,
          pagos: totalPagos,
        };
      });

      setDatos({
        labels: formateado.map(f => f.dia),
        datasets: [
          {
            label: "Ingresos",
            data: formateado.map(f => f.ingresos),
            borderColor: "green",
            backgroundColor: "rgba(0,128,0,0.1)",
          },
          {
            label: "Egresos",
            data: formateado.map(f => f.egresos),
            borderColor: "red",
            backgroundColor: "rgba(255,0,0,0.1)",
          },
          {
            label: "Pagos",
            data: formateado.map(f => f.pagos),
            borderColor: "blue",
            backgroundColor: "rgba(0,0,255,0.1)",
          },
        ],
      });
    };

    fetchData();
  }, []);

  if (!datos) return null;

  return (
    <div className="bg-white p-4 rounded shadow w-full max-w-3xl">
      <h3 className="text-lg font-bold mb-2 text-blue-700">📊 Totales por Día</h3>
      <Line data={datos} />
    </div>
  );
}

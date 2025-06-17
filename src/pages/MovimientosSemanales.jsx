import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import Layout from "../components/Layout";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import html2canvas from "html2canvas";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format,
} from "date-fns";

export default function MovimientosSemanales() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [movimientos, setMovimientos] = useState([]);
  const [totalInicial, setTotalInicial] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);
  const [categorias, setCategorias] = useState({});
  const refResumen = useRef();

  const inicioSemana = startOfWeek(fechaSeleccionada, { weekStartsOn: 1 });
  const finSemana = endOfWeek(fechaSeleccionada, { weekStartsOn: 1 });

  const estaEnRango = (fechaFirestore) => {
    const fechaJS = fechaFirestore.toDate();
    return isWithinInterval(fechaJS, { start: inicioSemana, end: finSemana });
  };

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const cargarCategorias = async () => {
      const q = query(collection(db, "categorias"), where("usuario_id", "==", uid));
      const snap = await getDocs(q);
      const map = {};
      snap.forEach((doc) => {
        map[doc.id] = doc.data().nombre;
      });
      setCategorias(map);
    };

    const cargarMovimientos = async () => {
      const cuentaRef = doc(db, "cuentas", uid);
      const cuentaSnap = await getDoc(cuentaRef);
      const totalActual = cuentaSnap.exists() ? cuentaSnap.data().total || 0 : 0;

      const movimientosRef = collection(db, "movimientos");
      const q = query(movimientosRef, where("usuario_id", "==", uid));
      const snap = await getDocs(q);

      const movimientosFiltrados = snap.docs
        .map((d) => d.data())
        .filter((m) => estaEnRango(m.fecha))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      const totalSemana = movimientosFiltrados.reduce(
        (acc, m) => m.tipo === "ingreso" ? acc + m.monto : acc - m.monto,
        0
      );

      setMovimientos(movimientosFiltrados);
      setTotalInicial(totalActual - totalSemana);
      setTotalFinal(totalActual);
    };

    cargarCategorias().then(cargarMovimientos);
  }, [fechaSeleccionada]);

  const generarImagen = async () => {
    const canvas = await html2canvas(refResumen.current);
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = `resumen-${format(fechaSeleccionada, "yyyy-MM-dd")}.png`;
    link.click();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-3xl font-bold mb-6 text-center">📊 Estado de Cuenta Semanal</h2>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">📅 Fecha:</span>
            <DatePicker
              selected={fechaSeleccionada}
              onChange={(date) => setFechaSeleccionada(date)}
              className="border px-3 py-1 rounded shadow-sm"
            />
          </div>
          <button
            onClick={generarImagen}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            🖨️ Imprimir resumen
          </button>
        </div>
<div ref={refResumen} className="bg-white p-6 rounded shadow space-y-6 border overflow-auto">
  <h3 className="text-xl font-bold text-center">
    Semana del {inicioSemana.toLocaleDateString()} al {finSemana.toLocaleDateString()}
  </h3>

  {/* Total inicial */}
  <div className="bg-gray-100 p-3 rounded text-center shadow-sm">
    <p className="text-sm text-gray-600 mb-1">📌 Se inició la semana con un total de:</p>
    <p className="text-2xl font-bold text-blue-800">${totalInicial.toLocaleString()}</p>
  </div>

  {/* Detalle de movimientos */}
  <div>
    <h4 className="font-semibold text-lg mb-4 text-center">🧾 Detalle de Movimientos</h4>
    <ul className="space-y-2">
      {movimientos.length === 0 ? (
        <li className="text-gray-500 text-center">No hay movimientos esta semana.</li>
      ) : (
        movimientos.map((m, idx) => (
          <li key={idx} className="border-b pb-2">
            <div className="flex justify-between">
              <div>
                <span className="font-medium">{m.descripcion}</span> <br />
                <span className="text-xs text-gray-500">
                  {categorias[m.categoria_id] || "Sin categoría"}
                </span>
              </div>
              <div className={m.tipo === "ingreso" ? "text-green-600" : "text-red-600"}>
                {m.tipo === "ingreso" ? "+" : "-"}${m.monto.toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-gray-400 text-right">
              {m.fecha.toDate().toLocaleDateString()}
            </div>
          </li>
        ))
      )}
    </ul>
  </div>

  {/* Total final + resumen */}
  <div className="bg-gray-100 p-4 rounded text-center mt-6 shadow-sm border">
    <p className="text-sm text-gray-600">✅ El total restante al finalizar la semana fue de:</p>
    <p className="text-2xl font-bold text-green-700 mb-2">${totalFinal.toLocaleString()}</p>

    {totalFinal > totalInicial ? (
      <p className="text-green-600 font-semibold">
        📈 Esta semana tuviste un saldo positivo de ${Math.abs(totalFinal - totalInicial).toLocaleString()}.
      </p>
    ) : totalFinal < totalInicial ? (
      <p className="text-red-600 font-semibold">
        📉 Esta semana tuviste una pérdida de ${Math.abs(totalFinal - totalInicial).toLocaleString()}.
      </p>
    ) : (
      <p className="text-gray-600 font-semibold">
        ⚖️ Esta semana no hubo cambios en tu cuenta.
      </p>
    )}
  </div>
</div>

      </div>
    </Layout>
  );
}

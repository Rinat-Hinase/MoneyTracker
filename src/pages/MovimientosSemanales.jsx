import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "firebase/firestore";
import Layout from "../components/Layout";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import html2canvas from "html2canvas";
import {
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  format
} from "date-fns";

export default function MovimientosSemanales() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [totalInicial, setTotalInicial] = useState(0);
  const [totalFinal, setTotalFinal] = useState(0);
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

    const cargarMovimientos = async () => {
      const cuentaRef = doc(db, "cuentas", uid);
      const cuentaSnap = await getDoc(cuentaRef);
      const totalActual = cuentaSnap.exists() ? cuentaSnap.data().total || 0 : 0;

      const ingresosSnap = await getDocs(collection(db, "ingresos"));
      const egresosSnap = await getDocs(collection(db, "egresos"));
      const deudoresSnap = await getDocs(collection(db, "deudores"));

      const ingresosFiltrados = ingresosSnap.docs
        .map((d) => d.data())
        .filter((m) => m.usuario_id === uid && estaEnRango(m.fecha));
      setIngresos(ingresosFiltrados);

      const egresosFiltrados = egresosSnap.docs
        .map((d) => d.data())
        .filter((m) => m.usuario_id === uid && estaEnRango(m.fecha));
      setEgresos(egresosFiltrados);

      const pagosTemp = [];

      for (const docDeudor of deudoresSnap.docs) {
        const data = docDeudor.data();
        if (data.usuario_id !== uid) continue;

        const historialRef = collection(db, "deudores", docDeudor.id, "historial");
        const historialSnap = await getDocs(historialRef);

        historialSnap.forEach((mov) => {
          const movData = mov.data();
          if (estaEnRango(movData.fecha)) {
            pagosTemp.push({ ...movData, nombre: data.nombre });
          }
        });
      }

      setPagos(pagosTemp);

      const totalIngresos = ingresosFiltrados.reduce((acc, cur) => acc + cur.monto, 0);
      const totalEgresos = egresosFiltrados.reduce((acc, cur) => acc + cur.monto, 0);
      const totalPagos = pagosTemp.filter(p => p.tipo === "pago").reduce((acc, cur) => acc + cur.monto, 0);
      const totalAumentos = pagosTemp.filter(p => p.tipo === "aumento").reduce((acc, cur) => acc + cur.monto, 0);

      const movimientosSemana = totalPagos + totalIngresos - totalEgresos - totalAumentos;
      setTotalInicial(totalActual - movimientosSemana);
      setTotalFinal(totalActual);
    };

    cargarMovimientos();
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
  <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">📊 Estado de Cuenta Semanal</h2>

  {/* Fecha y botón */}
  <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="font-medium text-sm sm:text-base">📅 Fecha:</span>
      <DatePicker
        selected={fechaSeleccionada}
        onChange={(date) => setFechaSeleccionada(date)}
        className="border px-3 py-1 rounded shadow-sm text-sm"
      />
    </div>
    <button
      onClick={generarImagen}
      className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 text-sm"
    >
      🖨️ Imprimir resumen
    </button>
  </div>

  <div ref={refResumen} className="bg-white p-4 sm:p-6 rounded shadow space-y-6 border text-sm sm:text-base overflow-auto">
    <h3 className="text-lg sm:text-xl font-bold text-center">
      Semana del {inicioSemana.toLocaleDateString()} al {finSemana.toLocaleDateString()}
    </h3>

    {/* Totales */}
    <div className="text-center text-gray-700 space-y-1">
      <p>💼 Total antes de la semana: <strong>${totalInicial.toLocaleString()}</strong></p>
      <p>💼 Total después de la semana: <strong>${totalFinal.toLocaleString()}</strong></p>
    </div>

    {/* Ingresos y Egresos */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <section>
        <h4 className="font-semibold text-base sm:text-lg mb-2 text-green-600">💰 Ingresos</h4>
        <ul className="space-y-2">
          {ingresos.length === 0 ? (
            <li className="text-gray-500">Sin registros</li>
          ) : (
            ingresos.map((i, idx) => (
              <li key={idx}>
                <span className="font-medium">{i.descripcion}</span> - ${i.monto.toLocaleString()}<br />
                <span className="text-xs text-gray-500">{i.fecha.toDate().toLocaleDateString()}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h4 className="font-semibold text-base sm:text-lg mb-2 text-red-600">💸 Egresos</h4>
        <ul className="space-y-2">
          {egresos.length === 0 ? (
            <li className="text-gray-500">Sin registros</li>
          ) : (
            egresos.map((e, idx) => (
              <li key={idx}>
                <span className="font-medium">{e.descripcion}</span> - ${e.monto.toLocaleString()}<br />
                <span className="text-xs text-gray-500">{e.fecha.toDate().toLocaleDateString()}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>

    {/* Pagos / historial */}
    <section>
      <h4 className="font-semibold text-base sm:text-lg mb-2 text-indigo-600">📄 Historial de Deudores</h4>
      <ul className="space-y-2">
        {pagos.length === 0 ? (
          <li className="text-gray-500">Sin movimientos</li>
        ) : (
          pagos.map((p, idx) => (
            <li key={idx}>
              <span className="font-medium">{p.tipo}</span> - {p.nombre} - ${p.monto.toLocaleString()}<br />
              <span className="text-xs text-gray-500">{p.fecha.toDate().toLocaleDateString()}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  </div>
</div>

    </Layout>
  );
}
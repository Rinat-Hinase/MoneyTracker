import React, { useEffect, useState, Fragment } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../services/firebaseConfig";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Dialog, Transition } from "@headlessui/react";
import { onAuthStateChanged } from "firebase/auth";
import { actualizarTotalCuenta } from "../utils/actualizarCuenta";

export default function Deudores() {
  const [deudores, setDeudores] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [montoPago, setMontoPago] = useState("");
  const [deudorActivo, setDeudorActivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [nuevoDeudor, setNuevoDeudor] = useState({
    nombre: "",
    monto_total: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    notas: "",
    categoria: "",
  });
  const [modalAumentarAbierto, setModalAumentarAbierto] = useState(false);
  const [montoAumento, setMontoAumento] = useState("");
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [historialDeudor, setHistorialDeudor] = useState([]);
  const [deudorNombreHistorial, setDeudorNombreHistorial] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuario) => {
      if (!usuario) navigate("/");
      else obtenerDeudores(usuario.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  const obtenerDeudores = async (uid) => {
    setCargando(true);
    try {
      const snapshot = await getDocs(collection(db, "deudores"));
      const filtrados = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.usuario_id === uid);
      setDeudores(filtrados);
    } catch (e) {
      console.error("Error al obtener deudores:", e);
    } finally {
      setCargando(false);
    }
  };

  const crearCategoriaSiNoExiste = async (nombre, usuarioId) => {
    const q = query(
      collection(db, "categorias"),
      where("usuario_id", "==", usuarioId),
      where("nombre", "==", nombre)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const docRef = await addDoc(collection(db, "categorias"), {
        nombre,
        usuario_id: usuarioId,
        creado: Timestamp.now(),
      });
      return docRef.id;
    } else {
      return snapshot.docs[0].id;
    }
  };

  const abrirModalAumentar = (deudor) => {
    setDeudorActivo(deudor);
    setMontoAumento("");
    setModalAumentarAbierto(true);
  };

  const abrirModalPago = (deudor) => {
    setDeudorActivo(deudor);
    setMontoPago("");
    setModalAbierto(true);
  };

  const abrirHistorial = async (deudor) => {
    try {
      setDeudorNombreHistorial(deudor.nombre);
      const ref = collection(db, "deudores", deudor.id, "historial");
      const snapshot = await getDocs(ref);
      const movimientos = snapshot.docs.map((doc) => doc.data());
      const ordenado = movimientos.sort(
        (a, b) => b.fecha.seconds - a.fecha.seconds
      );
      setHistorialDeudor(ordenado);
      setModalHistorialAbierto(true);
    } catch (err) {
      console.error("Error al obtener historial:", err);
    }
  };

  const realizarPago = async () => {
  if (!montoPago || isNaN(montoPago)) return;
  try {
    const nuevoMonto = deudorActivo.monto_total - parseFloat(montoPago);
    const estadoActualizado = nuevoMonto <= 0 ? "pagado" : "pendiente";
    const refDeudor = doc(db, "deudores", deudorActivo.id);

    await updateDoc(refDeudor, {
      monto_total: nuevoMonto,
      estado: estadoActualizado,
      fecha_ultimo_pago: Timestamp.now(),
    });

    await addDoc(collection(refDeudor, "historial"), {
      tipo: "pago",
      monto: parseFloat(montoPago),
      fecha: Timestamp.now(),
    });

    // Movimiento global
    await addDoc(collection(db, "movimientos"), {
  descripcion: `Pago a ${deudorActivo.nombre}`,
  monto: parseFloat(montoPago),
  fecha: Timestamp.now(),
  tipo: "ingreso",
  categoria_id: deudorActivo.categoria_id,
  usuario_id: auth.currentUser.uid,
});

    await actualizarTotalCuenta(
      auth.currentUser.uid,
      parseFloat(montoPago),
      "sumar"
    );

    setModalAbierto(false);
    window.location.reload();
  } catch (err) {
    console.error("Error al registrar pago:", err);
  }
};


  const realizarAumento = async () => {
  if (!montoAumento || isNaN(montoAumento)) return;

  try {
    const nuevoMonto = deudorActivo.monto_total + parseFloat(montoAumento);
    const refDeudor = doc(db, "deudores", deudorActivo.id);

    await updateDoc(refDeudor, {
      monto_total: nuevoMonto,
      estado: "pendiente",
    });

    await addDoc(collection(refDeudor, "historial"), {
      tipo: "aumento",
      monto: parseFloat(montoAumento),
      fecha: Timestamp.now(),
    });

    // Movimiento global
    await addDoc(collection(db, "movimientos"), {
  descripcion: `Aumento de deuda a ${deudorActivo.nombre}`,
  monto: parseFloat(montoAumento),
  fecha: Timestamp.now(),
  tipo: "egreso",
  categoria_id: deudorActivo.categoria_id,
  usuario_id: auth.currentUser.uid,
});
    await actualizarTotalCuenta(
      auth.currentUser.uid,
      parseFloat(montoAumento),
      "restar"
    );

    setModalAumentarAbierto(false);
    window.location.reload();
  } catch (err) {
    console.error("Error al aumentar deuda:", err);
  }
};


  const registrarNuevoDeudor = async (e) => {
  e.preventDefault();
  const usuario = auth.currentUser;
  if (!usuario) return;

  try {
    const categoriaId = await crearCategoriaSiNoExiste(
      nuevoDeudor.categoria,
      usuario.uid
    );

    const docRef = await addDoc(collection(db, "deudores"), {
      nombre: nuevoDeudor.nombre,
      monto_total: parseFloat(nuevoDeudor.monto_total),
      fecha_inicio: Timestamp.fromDate(new Date(nuevoDeudor.fecha_inicio)),
      fecha_ultimo_pago: null,
      estado: "pendiente",
      notas: nuevoDeudor.notas,
      usuario_id: usuario.uid,
      categoria_id: categoriaId,
    });

    await addDoc(collection(docRef, "historial"), {
      tipo: "aumento",
      monto: parseFloat(nuevoDeudor.monto_total),
      fecha: Timestamp.now(),
    });

    // Movimiento global
    await addDoc(collection(db, "movimientos"), {
  descripcion: `Deuda inicial de ${nuevoDeudor.nombre}`,
  monto: parseFloat(nuevoDeudor.monto_total),
  fecha: Timestamp.now(),
  tipo: "egreso",
  categoria_id: categoriaId,
  usuario_id: usuario.uid,
});

    await actualizarTotalCuenta(
      usuario.uid,
      parseFloat(nuevoDeudor.monto_total),
      "restar"
    );

    setModalNuevoAbierto(false);
    window.location.reload();
  } catch (err) {
    console.error("Error al agregar deudor:", err);
  }
};


  return (
  <Layout>
    <h2 className="text-2xl font-bold mb-6">Lista de Deudores</h2>

    <div className="flex gap-4 mb-4">
      {["todos", "pendiente", "pagado"].map((estado) => (
        <button
          key={estado}
          onClick={() => setFiltroEstado(estado)}
          className={`px-4 py-2 rounded ${
            filtroEstado === estado
              ? estado === "pagado"
                ? "bg-green-600 text-white"
                : estado === "pendiente"
                ? "bg-yellow-500 text-white"
                : "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          {estado.charAt(0).toUpperCase() + estado.slice(1)}
        </button>
      ))}
    </div>

    {deudores.length === 0 ? (
      <p className="text-gray-600">No hay deudores registrados.</p>
    ) : (
      <div className="overflow-auto rounded-md shadow">
        <table className="min-w-full text-sm text-left text-gray-700 bg-white">
          <thead className="text-xs uppercase bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Monto Total</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Inicio</th>
              <th className="px-6 py-3">Último Pago</th>
              <th className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {deudores
              .filter((d) =>
                filtroEstado === "todos" ? true : d.estado === filtroEstado
              )
              .map((d) => (
                <tr key={d.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium">{d.nombre}</td>
                  <td className="px-6 py-4 text-green-600 font-semibold">
                    ${d.monto_total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-white text-xs ${
                        d.estado === "pagado" ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {d.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {d.fecha_inicio
                      ? new Date(d.fecha_inicio.seconds * 1000).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4">
                    {d.fecha_ultimo_pago
                      ? new Date(
                          d.fecha_ultimo_pago.seconds * 1000
                        ).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                      onClick={() => abrirHistorial(d)}
                    >
                      Ver historial
                    </button>
                    <button
                      className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition"
                      onClick={() => abrirModalPago(d)}
                    >
                      Pagar
                    </button>
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition"
                      onClick={() => abrirModalAumentar(d)}
                    >
                      Aumentar deuda
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    )}

    {/* Botón flotante */}
    <button
      onClick={() => setModalNuevoAbierto(true)}
      className="fixed bottom-6 right-6 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition"
    >
      + Agregar Deudor
    </button>

    {/* Modales */}
    {modalAbierto && (
      <Transition appear show={modalAbierto} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setModalAbierto(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Registrar pago para {deudorActivo?.nombre}
                </Dialog.Title>
                <input
                  type="number"
                  placeholder="Monto del pago"
                  className="w-full border px-3 py-2 rounded mb-4"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setModalAbierto(false)}
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={realizarPago}
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    )}

    {modalAumentarAbierto && (
      <Transition appear show={modalAumentarAbierto} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setModalAumentarAbierto(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Aumentar deuda de {deudorActivo?.nombre}
                </Dialog.Title>
                <input
                  type="number"
                  placeholder="Monto a aumentar"
                  className="w-full border px-3 py-2 rounded mb-4"
                  value={montoAumento}
                  onChange={(e) => setMontoAumento(e.target.value)}
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setModalAumentarAbierto(false)}
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={realizarAumento}
                    className="px-4 py-2 rounded bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    Confirmar aumento
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    )}

    {modalNuevoAbierto && (
      <Transition appear show={modalNuevoAbierto} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setModalNuevoAbierto(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Registrar nuevo deudor
                </Dialog.Title>
                <form onSubmit={registrarNuevoDeudor} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nombre del deudor"
                    className="w-full border px-3 py-2 rounded"
                    value={nuevoDeudor.nombre}
                    onChange={(e) =>
                      setNuevoDeudor({ ...nuevoDeudor, nombre: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Monto total"
                    className="w-full border px-3 py-2 rounded"
                    value={nuevoDeudor.monto_total}
                    onChange={(e) =>
                      setNuevoDeudor({ ...nuevoDeudor, monto_total: e.target.value })
                    }
                    required
                  />
                  <input
                    type="date"
                    className="w-full border px-3 py-2 rounded"
                    value={nuevoDeudor.fecha_inicio}
                    onChange={(e) =>
                      setNuevoDeudor({ ...nuevoDeudor, fecha_inicio: e.target.value })
                    }
                    required
                  />
                  <textarea
                    placeholder="Notas"
                    className="w-full border px-3 py-2 rounded"
                    value={nuevoDeudor.notas}
                    onChange={(e) =>
                      setNuevoDeudor({ ...nuevoDeudor, notas: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Categoría"
                    className="w-full border px-3 py-2 rounded"
                    value={nuevoDeudor.categoria}
                    onChange={(e) =>
                      setNuevoDeudor({ ...nuevoDeudor, categoria: e.target.value })
                    }
                    required
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                      onClick={() => setModalNuevoAbierto(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    )}

    {modalHistorialAbierto && (
      <Transition appear show={modalHistorialAbierto} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setModalHistorialAbierto(false)}>
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex items-center justify-center min-h-full p-4 text-center">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded bg-white p-6 shadow-xl">
                <Dialog.Title className="text-lg font-bold mb-4">
                  Historial de pagos de {deudorNombreHistorial}
                </Dialog.Title>
                {historialDeudor.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Este deudor aún no tiene historial.
                  </p>
                ) : (
                  <table className="w-full text-sm text-left mt-4">
                    <thead className="text-xs uppercase bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Monto</th>
                        <th className="px-4 py-2">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historialDeudor.map((m, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-4 py-2">{m.tipo}</td>
                          <td className="px-4 py-2 text-green-600 font-semibold">
                            ${m.monto.toLocaleString()}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(m.fecha.seconds * 1000).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setModalHistorialAbierto(false)}
                    className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    )}
  </Layout>
);

}

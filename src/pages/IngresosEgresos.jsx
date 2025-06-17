import React, { useState, useEffect } from "react";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { actualizarTotalCuenta } from "../utils/actualizarCuenta";

export default function IngresosEgresos() {
  const [tipo, setTipo] = useState("ingreso");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [categoria, setCategoria] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [listaCategorias, setListaCategorias] = useState([]);
  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/");
      return;
    }

    const cargarCategorias = async () => {
      try {
        const q = query(
          collection(db, "categorias"),
          where("usuario_id", "==", auth.currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const nombres = snapshot.docs.map((doc) => doc.data().nombre);
        setListaCategorias(nombres);
      } catch (err) {
        console.error("Error al cargar categorías:", err);
      }
    };

    cargarCategorias();
  }, [navigate]);

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    const usuario = auth.currentUser;
    if (!usuario) {
      navigate("/");
      return;
    }

    if (isNaN(monto) || parseFloat(monto) <= 0) {
      setMensaje("❌ Ingresa un monto válido.");
      return;
    }

    if (!fecha) {
      setMensaje("❌ Selecciona una fecha.");
      return;
    }

    if (categoria === "__nueva__" && nuevaCategoria.trim() === "") {
      setMensaje("❌ Ingresa el nombre de la nueva categoría.");
      return;
    }

    try {
      // Procesar la fecha con hora local actual
      const [y, m, d] = fecha.split("-");
      const fechaLocal = new Date(y, m - 1, d);
      const ahora = new Date();
      fechaLocal.setHours(ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());

      let categoriaId = "";

      if (categoria === "__nueva__") {
        const nuevaRef = await addDoc(collection(db, "categorias"), {
          nombre: nuevaCategoria.trim(),
          tipo: "general",
          usuario_id: usuario.uid,
          creada_en: Timestamp.now(),
        });
        categoriaId = nuevaRef.id;
      } else {
        const q = query(
          collection(db, "categorias"),
          where("usuario_id", "==", usuario.uid),
          where("nombre", "==", categoria)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          categoriaId = snapshot.docs[0].id;
        }
      }

      await addDoc(collection(db, "movimientos"), {
        descripcion,
        monto: parseFloat(monto),
        fecha: Timestamp.fromDate(fechaLocal),
        tipo,
        categoria_id: categoriaId || null,
        usuario_id: usuario.uid
      });

      await actualizarTotalCuenta(
        usuario.uid,
        parseFloat(monto),
        tipo === "ingreso" ? "sumar" : "restar"
      );

      setMensaje(`✅ ${tipo} guardado exitosamente`);
      setDescripcion("");
      setMonto("");
      setFecha("");
      setCategoria("");
      setNuevaCategoria("");
    } catch (err) {
      setMensaje(`❌ Error: ${err.message}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto bg-white shadow p-8 rounded">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Registrar {tipo === "ingreso" ? "Ingreso" : "Egreso"}
        </h2>

        {mensaje && <p className="text-sm mb-3 text-center">{mensaje}</p>}

        <form onSubmit={guardarMovimiento} className="space-y-4">
          {/* Botones tipo */}
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setTipo("ingreso")}
              className={`px-4 py-2 rounded ${tipo === "ingreso" ? "bg-green-500 text-white" : "bg-gray-200"}`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo("egreso")}
              className={`px-4 py-2 rounded ${tipo === "egreso" ? "bg-red-500 text-white" : "bg-gray-200"}`}
            >
              Egreso
            </button>
          </div>

          {/* Descripción */}
          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />

          {/* Monto */}
          <input
            type="number"
            className="w-full border px-3 py-2 rounded"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />

          {/* Fecha */}
          <input
            type="date"
            className="w-full border px-3 py-2 rounded"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            >
              <option value="">Selecciona una opción</option>
              {listaCategorias.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
              <option value="__nueva__">➕ Agregar nueva categoría</option>
            </select>

            {categoria === "__nueva__" && (
              <input
                type="text"
                className="w-full border px-3 py-2 rounded mt-2"
                placeholder="Nueva categoría"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                required
              />
            )}
          </div>

          {/* Botón submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Guardar
          </button>
        </form>
      </div>
    </Layout>
  );
}

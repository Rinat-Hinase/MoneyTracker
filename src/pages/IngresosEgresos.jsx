import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { actualizarTotalCuenta } from '../utils/actualizarCuenta';

export default function IngresosEgresos() {
  const [tipo, setTipo] = useState('ingreso');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha, setFecha] = useState('');
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/');
    }
  }, [navigate]);

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    const usuario = auth.currentUser;
    if (!usuario) {
      navigate('/');
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

    try {
      const [año, mes, día] = fecha.split("-");
      const fechaObjeto = new Date(año, mes - 1, día); // Mes - 1 porque los meses en JS van de 0 a 11

      const coleccion = tipo === 'ingreso' ? 'ingresos' : 'egresos';

      await addDoc(collection(db, coleccion), {
        descripcion,
        monto: parseFloat(monto),
        fecha: Timestamp.fromDate(fechaObjeto),
        usuario_id: usuario.uid
      });

      await actualizarTotalCuenta(
        usuario.uid,
        parseFloat(monto),
        tipo === 'ingreso' ? 'sumar' : 'restar'
      );

      setMensaje(`✅ ${tipo} guardado exitosamente`);
      setDescripcion('');
      setMonto('');
      setFecha('');
    } catch (err) {
      setMensaje(`❌ Error: ${err.message}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto bg-white shadow p-8 rounded">
        <h2 className="text-2xl font-bold mb-4 text-center">
          Registrar {tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
        </h2>

        {mensaje && <p className="text-sm mb-3 text-center">{mensaje}</p>}

        <form onSubmit={guardarMovimiento} className="space-y-4">
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`px-4 py-2 rounded ${tipo === 'ingreso' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`px-4 py-2 rounded ${tipo === 'egreso' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
            >
              Egreso
            </button>
          </div>

          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            placeholder="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />

          <input
            type="number"
            className="w-full border px-3 py-2 rounded"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />

          <input
            type="date"
            className="w-full border px-3 py-2 rounded"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />

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

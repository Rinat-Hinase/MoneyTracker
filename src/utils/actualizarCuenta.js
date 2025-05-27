import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebaseConfig";

// acción = "sumar" o "restar"
// monto = número
// uid = usuario actual
export const actualizarTotalCuenta = async (uid, monto, accion) => {
  const cuentaRef = doc(db, "cuentas", uid);
  const snapshot = await getDoc(cuentaRef);

  let nuevoTotal = 0;

  if (snapshot.exists()) {
    const actual = snapshot.data().total || 0;
    nuevoTotal = accion === "sumar" ? actual + monto : actual - monto;
    await updateDoc(cuentaRef, {
      total: nuevoTotal,
      actualizado: serverTimestamp(),
    });
  } else {
    nuevoTotal = accion === "sumar" ? monto : -monto;
    await setDoc(cuentaRef, {
      total: nuevoTotal,
      actualizado: serverTimestamp(),
    });
  }

  return nuevoTotal;
};

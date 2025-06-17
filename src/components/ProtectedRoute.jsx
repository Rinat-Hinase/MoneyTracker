export default function ProtectedRoute({ children }) {
  // 🔥 DEV MODE: siempre pasa como autenticado
  const devMode = true;

  if (devMode) {
    return children;
  }

  const [cargando, setCargando] = useState(true);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioAutenticado(!!user);
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Verificando sesión...</p>
      </div>
    );
  }

  return usuarioAutenticado ? children : <Navigate to="/" />;
}

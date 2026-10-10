import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { Usuario } from "@/types";

const CLAVE_VISTA = "inventiq_vista_vendedor";

interface AuthContextValue {
  /** Usuario "efectivo": si el administrador activó la vista de vendedor, aparece con rol VENDEDOR. */
  usuario: Usuario | null;
  /** El administrador puede alternar entre su vista y la de vendedor. */
  puedeCambiarVista: boolean;
  viendoComoVendedor: boolean;
  setViendoComoVendedor: (valor: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuarioReal, setUsuarioReal] = useState<Usuario | null>(() => {
    const stored = localStorage.getItem("inventiq_user");
    return stored ? (JSON.parse(stored) as Usuario) : null;
  });
  const [vistaVendedor, setVistaVendedor] = useState(
    () => sessionStorage.getItem(CLAVE_VISTA) === "1",
  );
  const [isLoading, setIsLoading] = useState(false);

  const puedeCambiarVista = usuarioReal?.rol === "ADMIN";
  const viendoComoVendedor = puedeCambiarVista && vistaVendedor;

  // Solo cambia lo que ve la interfaz (menú, pantallas, botones). Los permisos reales los sigue
  // decidiendo el servidor con el rol verdadero de la cuenta.
  const usuario = useMemo(
    () =>
      usuarioReal && viendoComoVendedor
        ? { ...usuarioReal, rol: "VENDEDOR" as const }
        : usuarioReal,
    [usuarioReal, viendoComoVendedor],
  );

  function setViendoComoVendedor(valor: boolean) {
    if (valor) sessionStorage.setItem(CLAVE_VISTA, "1");
    else sessionStorage.removeItem(CLAVE_VISTA);
    setVistaVendedor(valor);
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("inventiq_token", data.accessToken);
      localStorage.setItem("inventiq_user", JSON.stringify(data.usuario));
      setUsuarioReal(data.usuario);
    } finally {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("inventiq_token");
    localStorage.removeItem("inventiq_user");
    setViendoComoVendedor(false);
    setUsuarioReal(null);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        puedeCambiarVista,
        viendoComoVendedor,
        setViendoComoVendedor,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}

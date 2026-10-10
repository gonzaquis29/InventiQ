import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Wallet,
  BarChart3,
  LogOut,
  Receipt,
  Building2,
  Settings,
  ScrollText,
  Eye,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/cn";
import { LogoIQ } from "@/components/ui/LogoIQ";

interface NavItemDef {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}

interface NavGroupDef {
  label: string | null;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    label: null,
    items: [
      {
        to: "/",
        label: "Inicio",
        icon: LayoutDashboard,
        roles: ["ADMIN", "VENDEDOR"],
      },
      {
        to: "/pos",
        label: "Punto de venta",
        icon: ShoppingCart,
        roles: ["ADMIN", "VENDEDOR"],
      },
      {
        to: "/ventas",
        label: "Ventas",
        icon: Receipt,
        roles: ["ADMIN", "VENDEDOR"],
      },
    ],
  },
  {
    label: "Negocio",
    items: [
      {
        to: "/inventario",
        label: "Inventario",
        icon: Package,
        roles: ["ADMIN", "VENDEDOR"],
      },
      { to: "/compras", label: "Compras", icon: Truck, roles: ["ADMIN"] },
      {
        to: "/proveedores",
        label: "Proveedores",
        icon: Building2,
        roles: ["ADMIN"],
      },
      {
        to: "/caja",
        label: "Caja del día",
        icon: Wallet,
        roles: ["ADMIN", "VENDEDOR"],
      },
      { to: "/reportes", label: "Reportes", icon: BarChart3, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        to: "/configuracion",
        label: "Configuración",
        icon: Settings,
        roles: ["ADMIN"],
      },
      {
        to: "/auditoria",
        label: "Auditoría",
        icon: ScrollText,
        roles: ["ADMIN"],
      },
    ],
  },
];

function NavItem({ item }: { item: NavItemDef }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-navy-800 text-white"
            : "text-ink-400 hover:bg-white/5 hover:text-ink-100",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-brand-500" />
          )}
          <item.icon size={18} className={isActive ? "text-brand-500" : ""} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function AppLayout() {
  const {
    usuario,
    logout,
    puedeCambiarVista,
    viendoComoVendedor,
    setViendoComoVendedor,
  } = useAuth();
  const { pathname } = useLocation();
  const rol = usuario?.rol ?? "";
  const grupos = NAV_GROUPS.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => item.roles.includes(rol)),
  })).filter((grupo) => grupo.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <aside className="flex w-64 shrink-0 flex-col bg-navy-900">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <LogoIQ size={36} className="rounded-xl ring-1 ring-white/15" />
          <span className="font-display text-lg font-bold text-white">
            InventiQ
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {grupos.map((grupo) => (
            <div key={grupo.label ?? "primario"}>
              {grupo.label && (
                <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                  {grupo.label}
                </p>
              )}
              {grupo.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-navy-900">
              {usuario?.nombre
                ?.split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {usuario?.nombre}
              </p>
              <p className="text-xs text-ink-400">
                {usuario?.rol === "ADMIN"
                  ? "Administrador"
                  : viendoComoVendedor
                    ? "Administrador · vista Vendedor"
                    : "Vendedor"}
              </p>
            </div>
          </div>
          {puedeCambiarVista && (
            <button
              onClick={() => setViendoComoVendedor(!viendoComoVendedor)}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {viendoComoVendedor ? (
                <ShieldCheck size={18} />
              ) : (
                <Eye size={18} />
              )}
              {viendoComoVendedor
                ? "Volver a Administrador"
                : "Ver como vendedor"}
            </button>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {viendoComoVendedor && (
          <div className="sticky top-0 z-30 flex items-center justify-center gap-3 bg-amber-warn px-4 py-2 text-sm font-medium text-white">
            <Eye size={16} />
            Estás viendo InventiQ como un Vendedor.
            <button
              onClick={() => setViendoComoVendedor(false)}
              className="rounded-md bg-white/20 px-2.5 py-0.5 font-semibold hover:bg-white/30"
            >
              Volver a Administrador
            </button>
          </div>
        )}
        <div
          key={pathname}
          className="animar-entrada mx-auto max-w-7xl px-10 py-10"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

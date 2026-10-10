import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Rol, Usuario } from "@/types";

const ETIQUETA_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
};

interface Formulario {
  nombre: string;
  email: string;
  rol: Rol;
  password: string;
}

const VACIO: Formulario = {
  nombre: "",
  email: "",
  rol: "VENDEDOR",
  password: "",
};

export function UsuariosPanel() {
  const { usuario: yo } = useAuth();
  const { notify } = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ editando: Usuario | null } | null>(null);
  const [form, setForm] = useState<Formulario>(VACIO);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    api
      .get<Usuario[]>("/usuarios")
      .then((res) => setUsuarios(res.data))
      .finally(() => setCargando(false));
  }

  useEffect(cargar, []);

  function abrirNuevo() {
    setForm(VACIO);
    setModal({ editando: null });
  }

  function abrirEdicion(u: Usuario) {
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, password: "" });
    setModal({ editando: u });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!modal) return;
    setGuardando(true);
    try {
      if (modal.editando) {
        const { password, ...resto } = form;
        await api.patch(`/usuarios/${modal.editando.id}`, {
          ...resto,
          ...(password ? { password } : {}),
        });
        notify("Usuario actualizado", "success");
      } else {
        await api.post("/usuarios", form);
        notify("Usuario creado", "success");
      }
      setModal(null);
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, "No se pudo guardar el usuario"), "error");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarActivo(u: Usuario) {
    try {
      await api.patch(`/usuarios/${u.id}`, { activo: !u.activo });
      notify(
        u.activo
          ? `${u.nombre} ya no puede ingresar`
          : `${u.nombre} puede ingresar de nuevo`,
        "success",
      );
      cargar();
    } catch (err) {
      notify(apiErrorMessage(err, "No se pudo cambiar el estado"), "error");
    }
  }

  const esMiCuenta = modal?.editando?.id === yo?.id;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl text-sm text-ink-500">
          <p>
            <strong className="text-ink-700">Administrador:</strong> todo el
            sistema (compras, reportes, usuarios, auditoría).{" "}
            <strong className="text-ink-700">Vendedor:</strong> vende, consulta
            el inventario y registra gastos y cuadre de la caja del día.
          </p>
          <p className="mt-1">
            Si desactivas a alguien, pierde el acceso al instante. Para ver cómo
            lo ve un vendedor usa «Ver como vendedor» en el menú.
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus size={16} />
          Nuevo usuario
        </Button>
      </div>

      {cargando ? (
        <p className="text-sm text-ink-500">Cargando…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                <th className="py-2 font-medium">Nombre</th>
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Rol</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const soyYo = u.id === yo?.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-ink-50 last:border-0"
                  >
                    <td className="py-3 font-medium text-ink-900">
                      {u.nombre}{" "}
                      {soyYo && (
                        <span className="text-xs font-normal text-ink-400">
                          (tú)
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-ink-600">{u.email}</td>
                    <td className="py-3">
                      <Badge variant={u.rol === "ADMIN" ? "brand" : "neutral"}>
                        {ETIQUETA_ROL[u.rol]}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={u.activo ? "positive" : "danger"}>
                        {u.activo ? "Activo" : "Desactivado"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEdicion(u)}
                          aria-label={`Editar ${u.nombre}`}
                        >
                          <Pencil size={14} />
                          Editar
                        </Button>
                        {!soyYo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cambiarActivo(u)}
                          >
                            {u.activo ? (
                              <UserX size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            {u.activo ? "Desactivar" : "Reactivar"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.editando ? "Editar usuario" : "Nuevo usuario"}
      >
        <form onSubmit={guardar} className="space-y-4">
          <div>
            <Label htmlFor="u-nombre">Nombre</Label>
            <Input
              id="u-nombre"
              required
              minLength={2}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="u-email">Email (con el que ingresa)</Label>
            <Input
              id="u-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="u-rol">Rol</Label>
            <Select
              id="u-rol"
              value={form.rol}
              disabled={esMiCuenta}
              onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
            >
              <option value="VENDEDOR">Vendedor</option>
              <option value="ADMIN">Administrador</option>
            </Select>
            {esMiCuenta && (
              <p className="mt-1 text-xs text-ink-500">
                No puedes cambiar tu propio rol.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="u-pass">
              {modal?.editando ? "Nueva contraseña (opcional)" : "Contraseña"}
            </Label>
            <Input
              id="u-pass"
              type="password"
              autoComplete="new-password"
              required={!modal?.editando}
              minLength={6}
              placeholder={
                modal?.editando
                  ? "Déjala vacía para no cambiarla"
                  : "Mínimo 6 caracteres"
              }
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModal(null)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

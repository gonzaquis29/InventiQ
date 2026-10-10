import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import type { EventoAuditoria } from "@/types";

const PAGE_SIZE = 25;

type Variante = "neutral" | "brand" | "warn" | "danger" | "positive";

const ACCIONES: Record<string, { etiqueta: string; variante: Variante }> = {
  LOGIN: { etiqueta: "Ingreso", variante: "neutral" },
  LOGIN_FALLIDO: { etiqueta: "Ingreso fallido", variante: "danger" },
  VENTA_CREADA: { etiqueta: "Venta", variante: "positive" },
  VENTA_ANULADA: { etiqueta: "Venta anulada", variante: "danger" },
  STOCK_AJUSTADO: { etiqueta: "Ajuste de stock", variante: "warn" },
  PRODUCTO_CREADO: { etiqueta: "Producto creado", variante: "brand" },
  PRODUCTO_EDITADO: { etiqueta: "Producto editado", variante: "brand" },
  PRODUCTO_ELIMINADO: { etiqueta: "Producto eliminado", variante: "danger" },
  PRODUCTOS_IMPORTADOS: { etiqueta: "Importación", variante: "brand" },
  COMPRA_REGISTRADA: { etiqueta: "Compra", variante: "brand" },
  GASTO_REGISTRADO: { etiqueta: "Gasto de caja", variante: "warn" },
  GASTO_ELIMINADO: { etiqueta: "Gasto eliminado", variante: "warn" },
  CUADRE_REGISTRADO: { etiqueta: "Cuadre de caja", variante: "neutral" },
  USUARIO_CREADO: { etiqueta: "Usuario creado", variante: "brand" },
  USUARIO_EDITADO: { etiqueta: "Usuario editado", variante: "warn" },
};

export default function Auditoria() {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    const params: Record<string, string | number> = {
      page,
      pageSize: PAGE_SIZE,
    };
    if (accion) params.accion = accion;
    if (desde) params.desde = new Date(`${desde}T00:00:00`).toISOString();
    if (hasta) params.hasta = new Date(`${hasta}T23:59:59`).toISOString();
    api
      .get<{ data: EventoAuditoria[]; total: number }>("/auditoria", { params })
      .then((res) => {
        setEventos(res.data.data);
        setTotal(res.data.total);
      })
      .finally(() => setCargando(false));
  }, [page, accion, desde, hasta]);

  const totalPaginas = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  function filtrar(cambio: () => void) {
    cambio();
    setPage(1);
  }

  return (
    <div>
      <PageHeader
        title="Auditoría"
        description={`${total} registro${total === 1 ? "" : "s"} — quién hizo qué y cuándo.`}
        ayuda="auditoria"
        actions={
          <>
            <div>
              <Label htmlFor="a-accion">Acción</Label>
              <Select
                id="a-accion"
                value={accion}
                onChange={(e) => filtrar(() => setAccion(e.target.value))}
              >
                <option value="">Todas</option>
                {Object.entries(ACCIONES).map(([clave, { etiqueta }]) => (
                  <option key={clave} value={clave}>
                    {etiqueta}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="a-desde">Desde</Label>
              <Input
                id="a-desde"
                type="date"
                value={desde}
                onChange={(e) => filtrar(() => setDesde(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="a-hasta">Hasta</Label>
              <Input
                id="a-hasta"
                type="date"
                value={hasta}
                onChange={(e) => filtrar(() => setHasta(e.target.value))}
              />
            </div>
          </>
        }
      />

      <Card>
        <CardContent>
          {cargando && eventos.length === 0 ? (
            <p className="text-sm text-ink-500">Cargando…</p>
          ) : eventos.length === 0 ? (
            <p className="text-sm text-ink-500">
              No hay registros con esos filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-500">
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium">Usuario</th>
                    <th className="py-2 font-medium">Acción</th>
                    <th className="py-2 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e) => {
                    const info = ACCIONES[e.accion] ?? {
                      etiqueta: e.accion,
                      variante: "neutral" as Variante,
                    };
                    return (
                      <tr
                        key={e.id}
                        className="border-b border-ink-50 align-top last:border-0"
                      >
                        <td className="whitespace-nowrap py-3 pr-4 text-ink-500">
                          {formatDateTime(e.createdAt)}
                        </td>
                        <td className="py-3 pr-4 font-medium text-ink-900">
                          {e.usuarioNombre}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4">
                          <Badge variant={info.variante}>{info.etiqueta}</Badge>
                        </td>
                        <td className="py-3 text-ink-700">{e.detalle}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4 text-sm text-ink-500">
              <span>
                Página {page} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPaginas}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

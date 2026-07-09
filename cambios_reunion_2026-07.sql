-- Ejecutar en Supabase → SQL Editor (proyecto Jose Acosta)
-- Cambios de la reunion de julio 2026

-- 1) Fecha de boda en la ficha de cliente
alter table crm_clients
  add column if not exists fecha_boda date;

-- 2) Firma del contrato (comercio + cliente) guardada en el propio pedido
alter table crm_orders
  add column if not exists signatures jsonb;

-- 3) Migrar encargos que se quedaron "huerfanos":
--    - status 'pendiente' (bug de "Guardar + Taller") -> 'presupuesto'
--    - status 'prueba' (columna eliminada del kanban) -> 'ajustes'
update crm_orders set status='presupuesto' where status='pendiente';
update crm_orders set status='ajustes' where status='prueba';

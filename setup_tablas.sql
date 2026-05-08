-- ══════════════════════════════════════════════════════
-- JOSE ACOSTA STYLE — Tablas panel
-- Ejecutar en Supabase > SQL Editor
-- ══════════════════════════════════════════════════════

-- ── CLIENTES (migrados de Holded) ──
CREATE TABLE IF NOT EXISTS ja_clientes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  biz_slug text DEFAULT 'jose-acosta',
  holded_id text UNIQUE,
  nombre text NOT NULL,
  email text,
  telefono text,
  movil text,
  ciudad text,
  provincia text,
  direccion text,
  medidas jsonb DEFAULT '{}',
  notas text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ja_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ja_clientes_open" ON ja_clientes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS ja_clientes_slug_idx ON ja_clientes(biz_slug);
CREATE INDEX IF NOT EXISTS ja_clientes_nombre_idx ON ja_clientes(nombre);

-- ── PRODUCTOS (migrados de Holded) ──
CREATE TABLE IF NOT EXISTS ja_productos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  biz_slug text DEFAULT 'jose-acosta',
  holded_id text UNIQUE,
  nombre text NOT NULL,
  categoria text DEFAULT 'General',
  precio decimal(10,2) DEFAULT 0,
  precio_coste decimal(10,2) DEFAULT 0,
  stock integer DEFAULT 0,
  emoji text DEFAULT '🧵',
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ja_productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ja_productos_open" ON ja_productos FOR ALL USING (true) WITH CHECK (true);

-- ── ENCARGOS ──
CREATE TABLE IF NOT EXISTS ja_encargos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  biz_slug text DEFAULT 'jose-acosta',
  cliente_id uuid REFERENCES ja_clientes(id) ON DELETE SET NULL,
  cliente_nombre text,
  titulo text NOT NULL,
  descripcion text,
  estado text DEFAULT 'presupuesto' CHECK (estado IN ('presupuesto','produccion','listo_prueba','prueba','ajustes','listo','entregado')),
  precio decimal(10,2) DEFAULT 0,
  fecha_entrega date,
  medidas jsonb DEFAULT '{}',
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ja_encargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ja_encargos_open" ON ja_encargos FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS ja_encargos_estado_idx ON ja_encargos(estado);

-- ── FACTURAS (historial de Holded) ──
CREATE TABLE IF NOT EXISTS ja_facturas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  biz_slug text DEFAULT 'jose-acosta',
  holded_id text UNIQUE,
  numero text,
  cliente_nombre text,
  cliente_id uuid REFERENCES ja_clientes(id) ON DELETE SET NULL,
  total decimal(10,2) DEFAULT 0,
  base_imponible decimal(10,2) DEFAULT 0,
  igic decimal(10,2) DEFAULT 0,
  estado integer DEFAULT 0,
  fecha date,
  lineas jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ja_facturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ja_facturas_open" ON ja_facturas FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS ja_facturas_fecha_idx ON ja_facturas(fecha);

-- ── VENTAS TPV ──
CREATE TABLE IF NOT EXISTS ja_ventas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  biz_slug text DEFAULT 'jose-acosta',
  cliente_nombre text,
  cliente_id uuid REFERENCES ja_clientes(id) ON DELETE SET NULL,
  lineas jsonb DEFAULT '[]',
  subtotal decimal(10,2) DEFAULT 0,
  igic decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  metodo_pago text DEFAULT 'efectivo',
  notas text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ja_ventas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ja_ventas_open" ON ja_ventas FOR ALL USING (true) WITH CHECK (true);

-- ── VERIFACTU — añadir columnas a crm_invoices (tabla existente del panel) ──
ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS verifactu_csv text;
ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS verifactu_qr text;
ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS verifactu_at timestamptz;
ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS client_nif text;

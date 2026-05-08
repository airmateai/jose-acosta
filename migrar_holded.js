// ══════════════════════════════════════════════════════
// MIGRACIÓN HOLDED → SUPABASE — Jose Acosta Style
// node migrar_holded.js
// ══════════════════════════════════════════════════════
const https = require('https');

const HOLDED_KEY = '36b92686213c3974569efc5959a08263';
const SUPA_URL   = 'https://vjofxmfwdybktpwiuanc.supabase.co';
const SUPA_KEY   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqb2Z4bWZ3ZHlia3Rwd2l1YW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ3NTk0NiwiZXhwIjoyMDkwMDUxOTQ2fQ.08g-CtdJ0BvgE3U4v9JppA_114EN24KBs7iBpUaw9cs';
const BIZ_SLUG   = 'jose-acosta';

function req(url, opts={}) {
  return new Promise((res,rej) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname, path: u.pathname+u.search,
      method: opts.method||'GET', headers: opts.headers||{}
    };
    const r = https.request(options, resp => {
      let d=''; resp.on('data',c=>d+=c); resp.on('end',()=>{
        try { res(JSON.parse(d)); } catch(e){ res(d); }
      });
    });
    r.on('error',rej);
    if(opts.body) r.write(opts.body);
    r.end();
  });
}

const holded = path => req(`https://api.holded.com/api/invoicing/v1${path}`, { headers:{'key':HOLDED_KEY} });

const supa = (path, data, method='POST') => req(`${SUPA_URL}/rest/v1${path}`, {
  method, body: JSON.stringify(data),
  headers: {
    'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
  }
});

function parsearMedidas(nota='') {
  const m = {};
  const p = [
    [/cuello\s*[:\s]?\s*(\d+)/i,'cuello'], [/pecho\s*[:\s]?\s*(\d+)/i,'pecho'],
    [/cintura\s*[:\s]?\s*(\d+)/i,'cintura'], [/cadera\s*[:\s]?\s*(\d+)/i,'cadera'],
    [/hombros?\s*[:\s]?\s*(\d+)/i,'hombros'], [/espalda\s*[:\s]?\s*(\d+)/i,'espalda'],
    [/manga\s*[:\s]?\s*(\d+)/i,'manga'], [/chaqueta\s*[:\s]?\s*(\d+)/i,'largo_chaqueta'],
    [/largo\s*pantal[oó]n\s*[:\s]?\s*(\d+)/i,'largo_pantalon'],
    [/altura\s*[:\s]?\s*(\d+)/i,'altura'], [/peso\s*[:\s]?\s*(\d+)/i,'peso'],
    [/b[ií]ceps?\s*[:\s]?\s*(\d+)/i,'bicep'], [/muslo\s*[:\s]?\s*(\d+)/i,'muslo'],
    [/talla\s*[:\s]?\s*(\d+)/i,'talla'],
  ];
  for (const [re,key] of p) { const m2=nota.match(re); if(m2) m[key]=parseInt(m2[1]); }
  return m;
}

function categorizar(nombre='') {
  const n = nombre.toLowerCase();
  if (n.includes('zapat')) return 'Zapatos';
  if (n.includes('corbat')) return 'Corbatas';
  if (n.includes('calcet')) return 'Calcetines';
  if (n.includes('pajari')||n.includes('lazo')) return 'Pajaritas';
  if (n.includes('tirante')) return 'Tirantes';
  if (n.includes('pañuelo')) return 'Complementos';
  if (n.includes('polo')) return 'Polos';
  if (n.includes('chaleco')) return 'Chalecos';
  if (n.includes('traje')) return 'Trajes';
  return 'Otros';
}

async function migrarClientes() {
  console.log('\n📥 Extrayendo contactos de Holded...');
  const contactos = await holded('/contacts?limit=500');
  console.log(`   ${contactos.length} contactos`);

  // Primero ver cuántos ya existen
  const existentes = await req(`${SUPA_URL}/rest/v1/crm_clients?business_slug=eq.${BIZ_SLUG}&select=id`, {
    headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`}
  });
  console.log(`   Ya en Supabase: ${existentes.length} clientes`);

  const clientes = contactos
    .filter(c => c.name?.trim())
    .map(c => {
      const notaCompleta = (c.notes||[]).map(n=>n.description).join('\n\n');
      const medidas = parsearMedidas(notaCompleta);
      return {
        business_slug: BIZ_SLUG,
        name: c.name.trim(),
        phone: c.phone || (c.mobile ? String(c.mobile) : null),
        email: c.email || null,
        notes: notaCompleta.slice(0,1000) || null,
        measurements: Object.keys(medidas).length ? medidas : null
      };
    });

  console.log(`   Subiendo ${clientes.length} clientes...`);
  let ok=0;
  for (let i=0; i<clientes.length; i+=50) {
    const lote = clientes.slice(i,i+50);
    const res = await supa('/crm_clients', lote);
    if (res?.code) console.log(`\n   ⚠️  ${res.message}`);
    else { ok+=lote.length; process.stdout.write('.'); }
  }
  console.log(`\n   ✅ ${ok} clientes migrados`);
}

async function migrarInventario() {
  console.log('\n📥 Extrayendo productos de Holded...');
  const productos = await holded('/products?limit=100');
  const validos = productos.filter(p => p.name?.trim() && p.price > 0);
  console.log(`   ${validos.length} productos válidos`);

  const items = validos.map(p => ({
    business_slug: BIZ_SLUG,
    name: p.name.trim(),
    category: categorizar(p.name),
    stock: Math.max(0, p.stock || 0),
    min_stock: 2,
    unit: 'ud',
    precio_venta: Math.round(p.price * 100) / 100,
    precio_compra: null
  }));

  // Limpiar productos de prueba primero
  await req(`${SUPA_URL}/rest/v1/crm_inventory?business_slug=eq.${BIZ_SLUG}`, {
    method:'DELETE',
    headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`,'Content-Type':'application/json'}
  });

  const res = await supa('/crm_inventory', items);
  if (res?.code) console.log(`   ⚠️  ${res.message}`);
  else console.log(`   ✅ ${items.length} productos migrados`);
}

async function migrarFacturas() {
  console.log('\n📥 Extrayendo facturas de Holded...');
  const facturas = await holded('/documents/invoice?limit=200');
  const lista = Array.isArray(facturas) ? facturas : [];
  console.log(`   ${lista.length} facturas`);
  if (!lista.length) return;

  // Obtener clientes de Supabase para cruzar IDs
  const clientes = await req(`${SUPA_URL}/rest/v1/crm_clients?business_slug=eq.${BIZ_SLUG}&select=id,name`, {
    headers:{'apikey':SUPA_KEY,'Authorization':`Bearer ${SUPA_KEY}`}
  });
  const clienteMap = {};
  (clientes||[]).forEach(c => clienteMap[c.name?.toLowerCase()] = c.id);

  const items = lista.map(f => {
    const clienteId = clienteMap[f.contactName?.toLowerCase()] || null;
    return {
      business_slug: BIZ_SLUG,
      client_id: clienteId,
      client_name: f.contactName || '',
      type: 'factura',
      status: f.status === 1 ? 'pagado' : 'pendiente',
      total: f.total || 0,
      invoice_number: f.docNumber || null,
      issue_date: f.date ? new Date(f.date*1000).toISOString().split('T')[0] : null,
      items: f.items || [],
      notes: null
    };
  });

  let ok=0;
  for (let i=0; i<items.length; i+=50) {
    const lote = items.slice(i,i+50);
    const res = await supa('/crm_invoices', lote);
    if (res?.code) console.log(`\n   ⚠️  ${res.message}`);
    else { ok+=lote.length; process.stdout.write('.'); }
  }
  console.log(`\n   ✅ ${ok} facturas migradas`);
}

async function main() {
  console.log('🚀 Migración Holded → Supabase — Jose Acosta Style');
  await migrarClientes();
  await migrarInventario();
  await migrarFacturas();
  console.log('\n🎉 Todo migrado. El panel ya usa datos reales.');
}

main().catch(console.error);

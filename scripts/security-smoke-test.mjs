import fs from 'node:fs';
import path from 'node:path';

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const BASE_URL = (process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const LIMITED_USER_TOKEN = process.env.TEST_LIMITED_USER_BEARER_TOKEN || '';
const FAKE_ID = '00000000-0000-0000-0000-000000000000';

let failures = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`PASS  ${message}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${message}`);
  }
}

function scanServiceRoleKeyUsage(dir) {
  const clientFindings = [];
  const serverFindings = [];
  if (!fs.existsSync(dir)) return { clientFindings, serverFindings };

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = scanServiceRoleKeyUsage(fullPath);
      clientFindings.push(...sub.clientFindings);
      serverFindings.push(...sub.serverFindings);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      const text = fs.readFileSync(fullPath, 'utf8');
      if (text.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        const isClientComponent =
          text.includes("'use client'") ||
          text.includes('"use client"') ||
          rel.startsWith('src/app/components/');
        if (isClientComponent) {
          clientFindings.push(rel);
        } else {
          serverFindings.push(rel);
        }
      }
    }
  }
  return { clientFindings, serverFindings };
}

async function runTests() {
  console.log(`\n=== GOS Security Smoke Test (${BASE_URL}) ===\n`);

  const { clientFindings, serverFindings } = scanServiceRoleKeyUsage(
    path.resolve(process.cwd(), 'src')
  );
  assert(
    clientFindings.length === 0,
    clientFindings.length === 0
      ? 'Nessun uso di SUPABASE_SERVICE_ROLE_KEY in componenti/moduli client'
      : `SUPABASE_SERVICE_ROLE_KEY trovata in codice client: ${clientFindings.join(', ')}`
  );
  if (serverFindings.length > 0) {
    console.log(
      `INFO  SUPABASE_SERVICE_ROLE_KEY rilevata solo in moduli server-side: ${serverFindings.join(', ')}`
    );
  }

  try {
    const res = await fetch(`${BASE_URL}/api/aziende/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [FAKE_ID] }),
    });
    assert(
      res.status === 401 || res.status === 403,
      `POST /api/aziende/delete senza auth bloccato (ricevuto HTTP ${res.status})`
    );
  } catch (err) {
    assert(false, `Errore chiamando /api/aziende/delete senza auth: ${err.message}`);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/aziende/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: [FAKE_ID],
        actorUserId: '00000000-0000-0000-0000-000000000001',
        actorEmail: 'admin@example.com',
      }),
    });
    assert(
      res.status === 401 || res.status === 403,
      `Tentativo spoofing actorUserId/actorEmail su /api/aziende/delete bloccato (ricevuto HTTP ${res.status})`
    );
  } catch (err) {
    assert(false, `Errore nel test spoofing aziende: ${err.message}`);
  }

  try {
    const res = await fetch(`${BASE_URL}/api/utenti/${FAKE_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorRole: 'superadmin',
        updates: { ruolo: 'superadmin' },
      }),
    });
    assert(
      res.status === 401 || res.status === 403,
      `Tentativo PATCH /api/utenti/[id] con actorRole finto bloccato (ricevuto HTTP ${res.status})`
    );
  } catch (err) {
    assert(false, `Errore nel test PATCH /api/utenti/[id]: ${err.message}`);
  }

  if (LIMITED_USER_TOKEN) {
    try {
      const res = await fetch(`${BASE_URL}/api/aziende/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LIMITED_USER_TOKEN}`,
        },
        body: JSON.stringify({ ids: [FAKE_ID] }),
      });
      assert(
        res.status === 401 || res.status === 403,
        `Utente limitato bloccato su /api/aziende/delete (ricevuto HTTP ${res.status})`
      );
    } catch (err) {
      assert(false, `Errore nel test utente limitato: ${err.message}`);
    }
  } else {
    console.log('SKIP  TEST_LIMITED_USER_BEARER_TOKEN non impostato (opzionale per test ruolo limitato)');
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gos_profiles?select=id,email,ruolo&limit=5`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        console.log(
          `INFO  REST anon su gos_profiles ha restituito ${Array.isArray(rows) ? rows.length : 0} righe (verifica che sia 0 se RLS blocca anon)`
        );
      } else {
        console.log(`INFO  REST anon su gos_profiles respinta con HTTP ${res.status}`);
      }
    } catch (err) {
      console.log(`INFO  Verifica REST Supabase non eseguita: ${err.message}`);
    }
  }

  console.log('\n----------------------------------------------');
  if (failures > 0) {
    console.error(`Test completato con ${failures} criticità.`);
    process.exit(1);
  } else {
    console.log('Test completato: tutti i controlli di base sono passati.');
    process.exit(0);
  }
}

runTests();

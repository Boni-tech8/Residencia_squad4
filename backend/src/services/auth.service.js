import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const scrypt = promisify(scryptCallback);
const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'accessforge.json');
const SECRET = process.env.ADMIN_SESSION_SECRET || 'change-this-development-secret-before-deploying';
const TOKEN_TTL = 60 * 60 * 24 * 7;

async function readStore() {
  try { return JSON.parse(await readFile(DATA_FILE, 'utf8')); }
  catch { return { users: [], teams: [] }; }
}
async function writeStore(data) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}
async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64);
  return { salt, hash: Buffer.from(key).toString('hex') };
}
async function verifyPassword(password, user) {
  const key = Buffer.from(await scrypt(password, user.salt, 64));
  const expected = Buffer.from(user.passwordHash, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest();
  let actual;
  try { actual = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function publicUser(user) {
  const { passwordHash, salt, ...safe } = user;
  return safe;
}
export async function initializeAuth() {
  const data = await readStore();
  if (!data.users.some(u => u.role === 'admin')) {
    const email = (process.env.ADMIN_EMAIL || 'admin@acessforge.local').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'AcessForge@2026';
    const credentials = await hashPassword(password);
    data.users.push({
      id: randomBytes(12).toString('hex'), name: 'Administrador', email,
      role: 'admin', teamId: null, active: true, createdAt: new Date().toISOString(),
      ...{ salt: credentials.salt, passwordHash: credentials.hash }
    });
    await writeStore(data);
    console.log(`[AcessForge] Conta administrativa inicial criada: ${email}`);
  }
}
export async function login({ email, password, teamCode }) {
  const data = await readStore();
  const user = data.users.find(u => u.email === String(email || '').trim().toLowerCase() && u.active);
  if (!user || !(await verifyPassword(String(password || ''), user))) return null;
  if (teamCode) {
    const team = data.teams.find(t => t.id === user.teamId && t.code.toLowerCase() === String(teamCode).trim().toLowerCase());
    if (!team) return null;
  }
  if (user.role === 'employee' && !teamCode) return null;
  const token = sign({ sub: user.id, role: user.role, exp: Date.now() + TOKEN_TTL });
  const team = data.teams.find(t => t.id === user.teamId);
  return { token, user: publicUser(user), team: team || null };
}
export async function getSession(token) {
  const payload = verify(token);
  if (!payload) return null;
  const data = await readStore();
  const user = data.users.find(u => u.id === payload.sub && u.active);
  if (!user) return null;
  const team = data.teams.find(t => t.id === user.teamId);
  return { user: publicUser(user), team: team || null };
}
export async function listTeams() {
  const data = await readStore();
  return data.teams.map(team => ({ ...team, members: data.users.filter(u => u.teamId === team.id && u.role === 'employee').length }));
}
export async function createTeam({ name, description = '' }) {
  const data = await readStore();
  const team = {
    id: randomBytes(10).toString('hex'),
    name: String(name).trim(),
    description: String(description).trim(),
    code: randomBytes(3).toString('hex').toUpperCase(),
    active: true,
    createdAt: new Date().toISOString()
  };
  data.teams.push(team); await writeStore(data); return { ...team, members: 0 };
}
export async function listUsers(teamId = null) {
  const data = await readStore();
  return data.users.filter(u => !teamId || u.teamId === teamId).map(publicUser)
    .map(u => ({ ...u, teamName: data.teams.find(t => t.id === u.teamId)?.name || '—' }));
}
export async function createEmployee({ name, email, password, teamId }) {
  const data = await readStore();
  const normalized = String(email).trim().toLowerCase();
  if (data.users.some(u => u.email === normalized)) {
    const error = new Error('Já existe um usuário cadastrado com este e-mail.'); error.status = 409; throw error;
  }
  const team = data.teams.find(t => t.id === teamId && t.active);
  if (!team) { const error = new Error('Equipe não encontrada ou inativa.'); error.status = 404; throw error; }
  const credentials = await hashPassword(password);
  const user = {
    id: randomBytes(12).toString('hex'), name: String(name).trim(), email: normalized,
    role: 'employee', teamId, active: true, createdAt: new Date().toISOString(),
    salt: credentials.salt, passwordHash: credentials.hash
  };
  data.users.push(user); await writeStore(data); return publicUser(user);
}

export async function registerEmployee({ name, email, password, teamCode }) {
  const data = await readStore();
  const normalized = String(email || '').trim().toLowerCase();
  const normalizedCode = String(teamCode || '').trim().toUpperCase();

  if (data.users.some(u => u.email === normalized)) {
    const error = new Error('Já existe uma conta cadastrada com este e-mail. Faça login ou use outro e-mail.');
    error.status = 409;
    throw error;
  }

  const team = data.teams.find(t => t.active && String(t.code).toUpperCase() === normalizedCode);
  if (!team) {
    const error = new Error('Código de equipe inválido ou equipe inativa. Confira o código com o administrador.');
    error.status = 400;
    throw error;
  }

  const credentials = await hashPassword(String(password));
  const user = {
    id: randomBytes(12).toString('hex'),
    name: String(name).trim(),
    email: normalized,
    role: 'employee',
    teamId: team.id,
    active: true,
    createdAt: new Date().toISOString(),
    salt: credentials.salt,
    passwordHash: credentials.hash
  };

  data.users.push(user);
  await writeStore(data);

  const token = sign({ sub: user.id, role: user.role, exp: Date.now() + TOKEN_TTL });
  return { token, user: publicUser(user), team };
}

export async function setUserActive(userId, active) {
  const data = await readStore();
  const user = data.users.find(u => u.id === userId && u.role !== 'admin');
  if (!user) return null;
  user.active = Boolean(active); await writeStore(data); return publicUser(user);
}


export async function registerAdmin({ name, email, password, adminCode }) {
  const configuredCode = String(process.env.ADMIN_REGISTRATION_CODE || '');
  const suppliedCode = String(adminCode || '');
  if (configuredCode.length < 16) {
    const error = new Error('O cadastro administrativo ainda não foi habilitado. Configure ADMIN_REGISTRATION_CODE no backend/.env com pelo menos 16 caracteres.');
    error.status = 503;
    throw error;
  }
  const expected = Buffer.from(configuredCode);
  const supplied = Buffer.from(suppliedCode);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    const error = new Error('Código de autorização administrativa inválido.');
    error.status = 403;
    throw error;
  }

  const data = await readStore();
  const normalized = String(email || '').trim().toLowerCase();
  if (data.users.some(u => u.email === normalized)) {
    const error = new Error('Já existe uma conta cadastrada com este e-mail. Faça login ou use outro e-mail.');
    error.status = 409;
    throw error;
  }

  const credentials = await hashPassword(String(password));
  const user = {
    id: randomBytes(12).toString('hex'),
    name: String(name).trim(),
    email: normalized,
    role: 'admin',
    teamId: null,
    active: true,
    createdAt: new Date().toISOString(),
    salt: credentials.salt,
    passwordHash: credentials.hash
  };

  data.users.push(user);
  await writeStore(data);
  const token = sign({ sub: user.id, role: user.role, exp: Date.now() + TOKEN_TTL });
  return { token, user: publicUser(user), team: null };
}

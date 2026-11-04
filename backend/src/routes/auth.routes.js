import { Router } from 'express';
import { login, getSession, listTeams, createTeam, listUsers, createEmployee, registerEmployee, registerAdmin, setUserActive } from '../services/auth.service.js';

const router = Router();
function requireAuth(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  getSession(token).then(session => {
    if (!session) return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' });
    req.session = session; next();
  }).catch(next);
}
function requireAdmin(req, res, next) {
  if (req.session?.user?.role !== 'admin') return res.status(403).json({ ok: false, message: 'Apenas administradores podem realizar esta ação.' });
  next();
}
router.post('/login', async (req, res, next) => {
  try {
    const result = await login(req.body || {});
    if (!result) return res.status(401).json({ ok: false, message: 'E-mail, senha ou código da equipe inválidos.' });
    res.json({ ok: true, ...result });
  } catch (e) { next(e); }
});
router.get('/session', requireAuth, (req, res) => res.json({ ok: true, ...req.session }));

// Cadastro público protegido: funcionário usa código de equipe; administrador usa segredo configurado no backend.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, teamCode } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanPassword = String(password || '');
    const cleanTeamCode = String(teamCode || '').trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ ok: false, message: 'Informe seu nome completo (de 2 a 100 caracteres).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 180) {
      return res.status(400).json({ ok: false, message: 'Informe um endereço de e-mail válido.' });
    }
    if (cleanPassword.length < 8 || cleanPassword.length > 128) {
      return res.status(400).json({ ok: false, message: 'A senha precisa ter entre 8 e 128 caracteres.' });
    }
    const role = String(req.body?.role || 'employee');
    let result;
    if (role === 'admin') {
      result = await registerAdmin({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        adminCode: req.body?.adminCode
      });
    } else if (role === 'employee') {
      if (!cleanTeamCode) {
        return res.status(400).json({ ok: false, message: 'Informe o código de acesso fornecido pelo administrador da equipe.' });
      }
      result = await registerEmployee({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        teamCode: cleanTeamCode
      });
    } else {
      return res.status(400).json({ ok: false, message: 'Tipo de conta inválido. Escolha administrador ou funcionário.' });
    }
    res.status(201).json({ ok: true, ...result });
  } catch (e) { next(e); }
});

router.get('/teams', requireAuth, requireAdmin, async (req, res, next) => {
  try { res.json({ ok: true, teams: await listTeams() }); } catch (e) { next(e); }
});
router.post('/teams', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2) return res.status(400).json({ ok: false, message: 'Informe um nome para a equipe.' });
    res.status(201).json({ ok: true, team: await createTeam(req.body) });
  } catch (e) { next(e); }
});
router.get('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try { res.json({ ok: true, users: await listUsers(req.query.teamId || null) }); } catch (e) { next(e); }
});
router.post('/users', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, teamId } = req.body || {};
    if (!name || !email || !password || String(password).length < 8 || !teamId)
      return res.status(400).json({ ok: false, message: 'Informe nome, e-mail, equipe e senha com pelo menos 8 caracteres.' });
    res.status(201).json({ ok: true, user: await createEmployee({ name, email, password, teamId }) });
  } catch (e) { next(e); }
});
router.patch('/users/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const user = await setUserActive(req.params.id, req.body?.active);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuário não encontrado.' });
    res.json({ ok: true, user });
  } catch (e) { next(e); }
});
export default router;

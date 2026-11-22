import { Router } from 'express';
import { analyzeController, validateController } from '../controllers/analyze.controller.js';
import { accessibleNameController, altTextController, clarificationController, aiStatusController, chatController } from '../controllers/ai.controller.js';
import { getSession } from '../services/auth.service.js';
const router = Router();
async function requireChatSession(req, res, next) {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const session = await getSession(token);
    if (!session) return res.status(401).json({ ok: false, message: 'Sessão inválida ou expirada. Entre novamente.' });
    req.session = session;
    next();
  } catch (error) { next(error); }
}
router.post('/analyze', analyzeController);
router.post('/validate', validateController);
router.get('/ai/status', aiStatusController);
router.post('/ai/chat', requireChatSession, chatController);
router.post('/ai/accessible-name', accessibleNameController);
router.post('/ai/alt-text', altTextController);
router.post('/ai/clarification', clarificationController);
export default router;

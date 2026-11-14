import { generateAccessibleName, generateAltText, clarifyIssue, getAIStatus } from '../services/ai.service.js';

function validNode(req, res) {
  const { nodeName, nodeType } = req.body ?? {};
  if (typeof nodeName !== 'string' || typeof nodeType !== 'string') {
    res.status(400).json({ ok: false, error: 'INVALID_INPUT', message: 'Informe nodeName e nodeType como textos.' });
    return false;
  }
  return true;
}

export async function accessibleNameController(req, res, next) {
  if (!validNode(req, res)) return;
  try { res.json({ ok: true, kind: 'accessibleName', ...(await generateAccessibleName(req.body)) }); }
  catch (error) { next(error); }
}

export async function altTextController(req, res, next) {
  if (!validNode(req, res)) return;
  try { res.json({ ok: true, kind: 'altText', ...(await generateAltText(req.body)) }); }
  catch (error) { next(error); }
}

export async function clarificationController(req, res, next) {
  const body = req.body ?? {};
  if (typeof body.issueTitle !== 'string' || typeof body.issueDescription !== 'string') {
    return res.status(400).json({ ok: false, error: 'INVALID_INPUT', message: 'Informe issueTitle e issueDescription.' });
  }
  try { res.json({ ok: true, ...(await clarifyIssue(body)) }); }
  catch (error) { next(error); }
}

export async function aiStatusController(req, res, next) {
  try { res.json({ ok: true, ...(await getAIStatus()) }); }
  catch (error) { next(error); }
}

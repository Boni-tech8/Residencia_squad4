import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeNodes } from '../src/services/accessibility.service.js';
import { analyzeController, validateController } from '../src/controllers/analyze.controller.js';

 test('detecta contraste abaixo de 4.5:1 (V-01)', () => {
  const result = analyzeNodes([{ id: 'text-1', name: 'Texto', type: 'TEXT', contrastRatio: 3.2 }]);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].code, 'V-01');
});

test('detecta controle sem nome acessível (V-02)', () => {
  const result = analyzeNodes([{ id: 'button-1', name: 'Botão', type: 'BUTTON' }]);
  assert.equal(result.issues[0].code, 'V-02');
});

test('detecta imagem sem texto alternativo (V-03)', () => {
  const result = analyzeNodes([{ id: 'image-1', name: 'Foto', type: 'IMAGE' }]);
  assert.equal(result.issues[0].code, 'V-03');
});

test('percorre nós filhos e netos', () => {
  const result = analyzeNodes([{ id: 'root', children: [{ id: 'child', children: [{ id: 'grandchild', type: 'IMAGE' }] }] }]);
  assert.equal(result.summary.totalNodes, 3);
  assert.equal(result.issues[0].nodeId, 'grandchild');
});

test('não sinaliza imagem decorativa sem alt', () => {
  const result = analyzeNodes([{ type: 'IMAGE', role: 'presentation' }]);
  assert.equal(result.issues.length, 0);
});

test('controller retorna 400 quando nodes não é array', () => {
  const response = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  analyzeController({ body: { nodes: {} } }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, 'INVALID_INPUT');
});

test('validateController informa validade e resumo', () => {
  const response = { body: null, json(body) { this.body = body; return this; } };
  validateController({ body: { nodes: [] } }, response);
  assert.equal(response.body.valid, true);
  assert.equal(response.body.summary.totalNodes, 0);
});

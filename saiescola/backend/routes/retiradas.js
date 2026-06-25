const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function nowISO() {
  return new Date().toISOString();
}

// POST /api/retiradas/solicitar — pai
router.post('/solicitar', authMiddleware, requireRole('pai'), (req, res) => {
  const { aluno_id } = req.body;
  const db = getDb();
  const usuarioId = req.usuario.id;

  if (!aluno_id) {
    return res.status(400).json({ error: 'aluno_id é obrigatório' });
  }

  // Check pai is responsavel for this aluno
  const responsavel = db.prepare(
    'SELECT * FROM responsaveis WHERE usuario_id = ? AND aluno_id = ?'
  ).get(usuarioId, aluno_id);

  if (!responsavel) {
    return res.status(403).json({ error: 'Você não é responsável por este aluno' });
  }

  // Check for active retirada
  const today = todayStr();
  const retiradaAtiva = db.prepare(`
    SELECT * FROM retiradas
    WHERE aluno_id = ? AND DATE(horario_solicitacao) = ? AND status != 'saiu'
  `).get(aluno_id, today);

  if (retiradaAtiva) {
    return res.status(400).json({ error: 'Já existe uma retirada ativa para este aluno' });
  }

  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(aluno_id);
  if (!aluno) {
    return res.status(404).json({ error: 'Aluno não encontrado' });
  }

  // Create retirada
  const result = db.prepare(`
    INSERT INTO retiradas (aluno_id, responsavel_id, status, horario_solicitacao, escola_id)
    VALUES (?, ?, 'responsavel_chegou', ?, ?)
  `).run(aluno_id, responsavel.id, nowISO(), aluno.escola_id);

  const retirada = db.prepare('SELECT * FROM retiradas WHERE id = ?').get(result.lastInsertRowid);

  // Get turma info
  const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(aluno.turma_id);
  const usuario = db.prepare('SELECT id, nome, foto_inicial FROM usuarios WHERE id = ?').get(usuarioId);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('nova_solicitacao', {
      retirada,
      aluno: { id: aluno.id, nome: aluno.nome, turma_id: aluno.turma_id },
      responsavel: {
        id: responsavel.id,
        usuario_id: usuario.id,
        nome: usuario.nome,
        foto_inicial: usuario.foto_inicial,
        grau_parentesco: responsavel.grau_parentesco,
      },
      turma: { id: turma.id, nome: turma.nome },
    });
  }

  return res.status(201).json({ retirada, message: 'Solicitação criada com sucesso' });
});

// POST /api/retiradas/liberar — professora
router.post('/liberar', authMiddleware, requireRole('professora'), (req, res) => {
  const { retirada_id } = req.body;
  const db = getDb();

  if (!retirada_id) {
    return res.status(400).json({ error: 'retirada_id é obrigatório' });
  }

  const retirada = db.prepare('SELECT * FROM retiradas WHERE id = ?').get(retirada_id);
  if (!retirada) {
    return res.status(404).json({ error: 'Retirada não encontrada' });
  }

  if (retirada.status !== 'responsavel_chegou') {
    return res.status(400).json({ error: 'Retirada não está no status correto para liberação' });
  }

  // Verify aluno is in professora's turma
  const aluno = db.prepare('SELECT * FROM alunos WHERE id = ?').get(retirada.aluno_id);
  if (aluno.turma_id !== req.usuario.turma_id) {
    return res.status(403).json({ error: 'Este aluno não pertence à sua turma' });
  }

  db.prepare(`
    UPDATE retiradas SET status = 'liberado', horario_liberacao = ? WHERE id = ?
  `).run(nowISO(), retirada_id);

  const updated = db.prepare('SELECT * FROM retiradas WHERE id = ?').get(retirada_id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('aluno_liberado', {
      retirada_id: updated.id,
      aluno_id: updated.aluno_id,
      retirada: updated,
    });
  }

  return res.json({ retirada: updated, message: 'Aluno liberado com sucesso' });
});

// POST /api/retiradas/confirmar-saida — portao
router.post('/confirmar-saida', authMiddleware, requireRole('portao'), (req, res) => {
  const { retirada_id } = req.body;
  const db = getDb();

  if (!retirada_id) {
    return res.status(400).json({ error: 'retirada_id é obrigatório' });
  }

  const retirada = db.prepare('SELECT * FROM retiradas WHERE id = ?').get(retirada_id);
  if (!retirada) {
    return res.status(404).json({ error: 'Retirada não encontrada' });
  }

  if (retirada.status !== 'liberado') {
    return res.status(400).json({ error: 'Aluno ainda não foi liberado pela professora' });
  }

  db.prepare(`
    UPDATE retiradas SET status = 'saiu', horario_saida = ? WHERE id = ?
  `).run(nowISO(), retirada_id);

  const updated = db.prepare('SELECT * FROM retiradas WHERE id = ?').get(retirada_id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('saida_confirmada', {
      retirada_id: updated.id,
      aluno_id: updated.aluno_id,
      retirada: updated,
    });
  }

  return res.json({ retirada: updated, message: 'Saída confirmada com sucesso' });
});

// GET /api/retiradas/ativas
router.get('/ativas', authMiddleware, (req, res) => {
  const db = getDb();
  const today = todayStr();
  const { papel, escola_id, turma_id } = req.usuario;

  let query = `
    SELECT ret.*,
      a.nome as aluno_nome, a.turma_id,
      t.nome as turma_nome,
      u.nome as responsavel_nome, u.foto_inicial as responsavel_foto,
      resp.grau_parentesco
    FROM retiradas ret
    JOIN alunos a ON ret.aluno_id = a.id
    JOIN turmas t ON a.turma_id = t.id
    JOIN responsaveis resp ON ret.responsavel_id = resp.id
    JOIN usuarios u ON resp.usuario_id = u.id
    WHERE ret.status != 'saiu' AND DATE(ret.horario_solicitacao) = ? AND ret.escola_id = ?
  `;

  const params = [today, escola_id];

  if (papel === 'professora' && turma_id) {
    query += ' AND a.turma_id = ?';
    params.push(turma_id);
  }

  query += ' ORDER BY ret.horario_solicitacao DESC';

  const retiradas = db.prepare(query).all(...params);
  return res.json(retiradas);
});

// GET /api/retiradas/historico
router.get('/historico', authMiddleware, (req, res) => {
  const db = getDb();
  const today = todayStr();
  const { papel, escola_id, turma_id } = req.usuario;

  let query = `
    SELECT ret.*,
      a.nome as aluno_nome, a.turma_id,
      t.nome as turma_nome,
      u.nome as responsavel_nome, u.foto_inicial as responsavel_foto,
      resp.grau_parentesco
    FROM retiradas ret
    JOIN alunos a ON ret.aluno_id = a.id
    JOIN turmas t ON a.turma_id = t.id
    JOIN responsaveis resp ON ret.responsavel_id = resp.id
    JOIN usuarios u ON resp.usuario_id = u.id
    WHERE DATE(ret.horario_solicitacao) = ? AND ret.escola_id = ?
  `;

  const params = [today, escola_id];

  if (papel === 'professora' && turma_id) {
    query += ' AND a.turma_id = ?';
    params.push(turma_id);
  }

  query += ' ORDER BY ret.horario_solicitacao DESC';

  const retiradas = db.prepare(query).all(...params);
  return res.json(retiradas);
});

module.exports = router;

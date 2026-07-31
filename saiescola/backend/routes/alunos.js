const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Helper to get today's date string
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Helper to get current status of an aluno today
function getAlunoStatus(db, alunoId) {
  const today = todayStr();
  const retirada = db.prepare(`
    SELECT * FROM retiradas
    WHERE aluno_id = ? AND DATE(horario_solicitacao) = ? AND status != 'saiu'
    ORDER BY horario_solicitacao DESC LIMIT 1
  `).get(alunoId, today);

  if (!retirada) return { status: 'na_escola', retirada: null };
  return { status: retirada.status, retirada };
}

// GET /api/alunos/meus — pai only
router.get('/meus', authMiddleware, requireRole('pai'), (req, res) => {
  const db = getDb();
  const usuarioId = req.usuario.id;

  const alunos = db.prepare(`
    SELECT a.*, t.nome as turma_nome, r.id as responsavel_id, r.grau_parentesco
    FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    JOIN responsaveis r ON r.aluno_id = a.id
    WHERE r.usuario_id = ?
  `).all(usuarioId);

  const result = alunos.map(aluno => {
    const { status, retirada } = getAlunoStatus(db, aluno.id);
    return {
      id: aluno.id,
      nome: aluno.nome,
      turma_id: aluno.turma_id,
      turma_nome: aluno.turma_nome,
      escola_id: aluno.escola_id,
      responsavel_id: aluno.responsavel_id,
      grau_parentesco: aluno.grau_parentesco,
      status,
      retirada_ativa: retirada,
    };
  });

  return res.json(result);
});

// GET /api/alunos/turma — professora only
router.get('/turma', authMiddleware, requireRole('professora'), (req, res) => {
  const db = getDb();
  const turmaId = req.usuario.turma_id;

  if (!turmaId) {
    return res.status(400).json({ error: 'Professora não associada a nenhuma turma' });
  }

  const alunos = db.prepare(`
    SELECT a.*, t.nome as turma_nome
    FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    WHERE a.turma_id = ?
  `).all(turmaId);

  const today = todayStr();

  const result = alunos.map(aluno => {
    const retirada = db.prepare(`
      SELECT ret.*, u.nome as responsavel_nome, u.foto_inicial as responsavel_foto, resp.grau_parentesco
      FROM retiradas ret
      JOIN responsaveis resp ON ret.responsavel_id = resp.id
      JOIN usuarios u ON resp.usuario_id = u.id
      WHERE ret.aluno_id = ? AND DATE(ret.horario_solicitacao) = ? AND ret.status != 'saiu'
      ORDER BY ret.horario_solicitacao DESC LIMIT 1
    `).get(aluno.id, today);

    return {
      id: aluno.id,
      nome: aluno.nome,
      turma_id: aluno.turma_id,
      turma_nome: aluno.turma_nome,
      status: retirada ? retirada.status : 'na_escola',
      retirada_ativa: retirada || null,
    };
  });

  return res.json(result);
});

// GET /api/alunos/escola — portao/admin
router.get('/escola', authMiddleware, requireRole('portao', 'admin'), (req, res) => {
  const db = getDb();
  const escolaId = req.usuario.escola_id;

  const alunos = db.prepare(`
    SELECT a.*, t.nome as turma_nome
    FROM alunos a
    JOIN turmas t ON a.turma_id = t.id
    WHERE a.escola_id = ?
    ORDER BY t.nome, a.nome
  `).all(escolaId);

  const today = todayStr();

  const result = alunos.map(aluno => {
    const retirada = db.prepare(`
      SELECT ret.*, u.nome as responsavel_nome, u.foto_inicial as responsavel_foto, resp.grau_parentesco
      FROM retiradas ret
      JOIN responsaveis resp ON ret.responsavel_id = resp.id
      JOIN usuarios u ON resp.usuario_id = u.id
      WHERE ret.aluno_id = ? AND DATE(ret.horario_solicitacao) = ? AND ret.status != 'saiu'
      ORDER BY ret.horario_solicitacao DESC LIMIT 1
    `).get(aluno.id, today);

    // Get all responsaveis for admin view
    const responsaveis = db.prepare(`
      SELECT u.nome, u.foto_inicial, resp.grau_parentesco
      FROM responsaveis resp
      JOIN usuarios u ON resp.usuario_id = u.id
      WHERE resp.aluno_id = ?
    `).all(aluno.id);

    return {
      id: aluno.id,
      nome: aluno.nome,
      turma_id: aluno.turma_id,
      turma_nome: aluno.turma_nome,
      status: retirada ? retirada.status : 'na_escola',
      retirada_ativa: retirada || null,
      responsaveis,
    };
  });

  return res.json(result);
});

module.exports = router;

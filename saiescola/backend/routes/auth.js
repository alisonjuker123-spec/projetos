const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const db = getDb();
  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  if (!usuario) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const senhaValida = bcrypt.compareSync(senha, usuario.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const payload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    escola_id: usuario.escola_id,
    foto_inicial: usuario.foto_inicial,
  };

  // Include turma_id for professora
  if (usuario.papel === 'professora' && usuario.turma_id) {
    payload.turma_id = usuario.turma_id;

    // Get turma info
    const turma = db.prepare('SELECT * FROM turmas WHERE id = ?').get(usuario.turma_id);
    if (turma) {
      payload.turma_nome = turma.nome;
    }
  }

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

  return res.json({
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      foto_inicial: usuario.foto_inicial,
      turma_id: usuario.turma_id || null,
      turma_nome: payload.turma_nome || null,
      escola_id: usuario.escola_id,
    },
  });
});

module.exports = router;

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

async function seed() {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM escolas').get();
  if (existing.count > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const SALT_ROUNDS = 10;
  const senhaHash = await bcrypt.hash('123456', SALT_ROUNDS);

  // Escola
  const escolaResult = db.prepare('INSERT INTO escolas (nome, cidade) VALUES (?, ?)').run(
    'Escola Municipal João Paulo',
    'São Paulo'
  );
  const escolaId = escolaResult.lastInsertRowid;

  // Turmas
  const turma1Result = db.prepare('INSERT INTO turmas (nome, professor_nome, escola_id) VALUES (?, ?, ?)').run(
    '3º ano A', 'Ana Lima', escolaId
  );
  const turma1Id = turma1Result.lastInsertRowid; // 1

  const turma2Result = db.prepare('INSERT INTO turmas (nome, professor_nome, escola_id) VALUES (?, ?, ?)').run(
    '4º ano B', 'Carlos Souza', escolaId
  );
  const turma2Id = turma2Result.lastInsertRowid; // 2

  const turma3Result = db.prepare('INSERT INTO turmas (nome, professor_nome, escola_id) VALUES (?, ?, ?)').run(
    '2º ano C', 'Maria Reis', escolaId
  );
  const turma3Id = turma3Result.lastInsertRowid; // 3

  // Usuarios
  const paiResult = db.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, foto_inicial, escola_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('João Silva', 'pai@teste.com', senhaHash, 'pai', 'JS', escolaId);
  const paiId = paiResult.lastInsertRowid;

  const professoraResult = db.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, foto_inicial, turma_id, escola_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run('Ana Lima', 'professora@teste.com', senhaHash, 'professora', 'AL', turma1Id, escolaId);
  const professoraId = professoraResult.lastInsertRowid;

  const portaoResult = db.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, foto_inicial, escola_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('Supervisora Ana', 'portao@teste.com', senhaHash, 'portao', 'SA', escolaId);
  const portaoId = portaoResult.lastInsertRowid;

  const adminResult = db.prepare(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, foto_inicial, escola_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).run('Diretor Pedro', 'admin@teste.com', senhaHash, 'admin', 'DP', escolaId);
  const adminId = adminResult.lastInsertRowid;

  // Alunos - 10 alunos distributed across turmas
  const alunosData = [
    { nome: 'Lucas Oliveira', turma_id: turma1Id },
    { nome: 'Sofia Mendes', turma_id: turma1Id },
    { nome: 'Gabriel Costa', turma_id: turma1Id },
    { nome: 'Isabella Ferreira', turma_id: turma1Id },
    { nome: 'Mateus Santos', turma_id: turma2Id },
    { nome: 'Laura Rodrigues', turma_id: turma2Id },
    { nome: 'Pedro Almeida', turma_id: turma2Id },
    { nome: 'Ana Beatriz Lima', turma_id: turma3Id },
    { nome: 'Thiago Pereira', turma_id: turma3Id },
    { nome: 'Valentina Souza', turma_id: turma3Id },
  ];

  const insertAluno = db.prepare('INSERT INTO alunos (nome, turma_id, escola_id) VALUES (?, ?, ?)');
  const alunoIds = [];
  for (const aluno of alunosData) {
    const result = insertAluno.run(aluno.nome, aluno.turma_id, escolaId);
    alunoIds.push(result.lastInsertRowid);
  }

  // Responsaveis - pai linked to 2 alunos in different turmas
  // Lucas Oliveira (turma1) and Mateus Santos (turma2)
  db.prepare('INSERT INTO responsaveis (usuario_id, aluno_id, grau_parentesco) VALUES (?, ?, ?)').run(
    paiId, alunoIds[0], 'pai' // Lucas Oliveira - turma1
  );
  db.prepare('INSERT INTO responsaveis (usuario_id, aluno_id, grau_parentesco) VALUES (?, ?, ?)').run(
    paiId, alunoIds[4], 'pai' // Mateus Santos - turma2
  );

  console.log('Seed completed successfully!');
  console.log(`Escola ID: ${escolaId}`);
  console.log(`Turmas: ${turma1Id}, ${turma2Id}, ${turma3Id}`);
  console.log(`Usuarios: pai=${paiId}, professora=${professoraId}, portao=${portaoId}, admin=${adminId}`);
  console.log(`Alunos criados: ${alunoIds.length}`);
}

seed().catch(console.error);

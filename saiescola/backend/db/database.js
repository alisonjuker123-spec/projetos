const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'saiescola.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS escolas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cidade TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS turmas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      professor_nome TEXT NOT NULL,
      escola_id INTEGER NOT NULL,
      FOREIGN KEY (escola_id) REFERENCES escolas(id)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL CHECK(papel IN ('pai', 'professora', 'portao', 'admin')),
      foto_inicial TEXT,
      turma_id INTEGER,
      escola_id INTEGER,
      FOREIGN KEY (turma_id) REFERENCES turmas(id),
      FOREIGN KEY (escola_id) REFERENCES escolas(id)
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      turma_id INTEGER NOT NULL,
      escola_id INTEGER NOT NULL,
      FOREIGN KEY (turma_id) REFERENCES turmas(id),
      FOREIGN KEY (escola_id) REFERENCES escolas(id)
    );

    CREATE TABLE IF NOT EXISTS responsaveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      aluno_id INTEGER NOT NULL,
      grau_parentesco TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (aluno_id) REFERENCES alunos(id)
    );

    CREATE TABLE IF NOT EXISTS retiradas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL,
      responsavel_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'responsavel_chegou',
      horario_solicitacao TEXT NOT NULL,
      horario_liberacao TEXT,
      horario_saida TEXT,
      escola_id INTEGER NOT NULL,
      FOREIGN KEY (aluno_id) REFERENCES alunos(id),
      FOREIGN KEY (responsavel_id) REFERENCES responsaveis(id),
      FOREIGN KEY (escola_id) REFERENCES escolas(id)
    );
  `);
}

module.exports = { getDb };

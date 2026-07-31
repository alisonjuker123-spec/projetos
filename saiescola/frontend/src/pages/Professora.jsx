import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

function Avatar({ inicial, color = 'purple' }) {
  return (
    <div className={`w-9 h-9 rounded-full bg-${color}-100 text-${color}-700 font-bold text-sm flex items-center justify-center flex-shrink-0`}>
      {inicial}
    </div>
  );
}

export default function Professora() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liberating, setLiberating] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchAlunos = useCallback(async () => {
    try {
      const res = await api.get('/alunos/turma');
      setAlunos(res.data);
      const count = res.data.filter(a => a.status === 'responsavel_chegou').length;
      setPendingCount(count);
    } catch (err) {
      console.error('Erro ao buscar alunos da turma:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  useEffect(() => {
    if (!socket) return;

    function handleNovaSolicitacao(data) {
      const { aluno, responsavel, turma } = data;

      // Only handle if this aluno is in my turma
      if (aluno.turma_id !== user?.turma_id) return;

      setAlunos(prev =>
        prev.map(a =>
          a.id === aluno.id
            ? { ...a, status: 'responsavel_chegou', retirada_ativa: { ...data.retirada, responsavel_nome: responsavel.nome, responsavel_foto: responsavel.foto_inicial, grau_parentesco: responsavel.grau_parentesco } }
            : a
        )
      );

      const notif = {
        id: Date.now(),
        message: `${responsavel.nome} chegou para buscar ${aluno.nome}`,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setNotifications(prev => [notif, ...prev].slice(0, 5));
      setPendingCount(prev => prev + 1);
    }

    function handleAlunoLiberado({ aluno_id }) {
      // This was triggered by this professora's action, already handled
    }

    socket.on('nova_solicitacao', handleNovaSolicitacao);

    return () => {
      socket.off('nova_solicitacao', handleNovaSolicitacao);
    };
  }, [socket, user?.turma_id]);

  async function liberar(retiradaId, alunoId) {
    setLiberating(prev => ({ ...prev, [alunoId]: true }));
    try {
      await api.post('/retiradas/liberar', { retirada_id: retiradaId });
      setAlunos(prev =>
        prev.map(a =>
          a.id === alunoId ? { ...a, status: 'liberado', retirada_ativa: { ...a.retirada_ativa, status: 'liberado' } } : a
        )
      );
      setPendingCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao liberar aluno');
    } finally {
      setLiberating(prev => ({ ...prev, [alunoId]: false }));
    }
  }

  function dismissNotif(id) {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  const aguardandoLiberacao = alunos.filter(a => a.status === 'responsavel_chegou');
  const demaisAlunos = alunos.filter(a => a.status !== 'responsavel_chegou');

  return (
    <div className="min-h-screen bg-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Turma {user?.turma_nome || '—'}</h1>
              <p className="text-xs text-gray-500">{user?.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell with count */}
            <div className="relative">
              <button className="p-2 rounded-lg hover:bg-purple-50 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-purple-600 text-white rounded-xl p-3 flex items-center justify-between shadow">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-sm font-medium">{notif.message}</span>
                  <span className="text-xs text-purple-200">{notif.time}</span>
                </div>
                <button onClick={() => dismissNotif(notif.id)} className="text-purple-200 hover:text-white ml-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando turma...</div>
        ) : (
          <>
            {/* Aguardando liberação */}
            {aguardandoLiberacao.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
                  Aguardando Liberação ({aguardandoLiberacao.length})
                </h2>
                <div className="space-y-3">
                  {aguardandoLiberacao.map(aluno => (
                    <div key={aluno.id} className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar inicial={aluno.nome.charAt(0)} color="purple" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{aluno.nome}</h3>
                            {aluno.retirada_ativa && (
                              <p className="text-xs text-gray-500">
                                {aluno.retirada_ativa.responsavel_nome} • {aluno.retirada_ativa.grau_parentesco}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => liberar(aluno.retirada_ativa?.id, aluno.id)}
                          disabled={liberating[aluno.id] || !aluno.retirada_ativa}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition"
                        >
                          {liberating[aluno.id] ? 'Liberando...' : `Liberar ${aluno.nome.split(' ')[0]}`}
                        </button>
                      </div>
                      {aluno.retirada_ativa?.horario_solicitacao && (
                        <div className="mt-2 text-xs text-gray-400">
                          Solicitado às {new Date(aluno.retirada_ativa.horario_solicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Demais alunos */}
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Todos os Alunos ({alunos.length})
              </h2>
              <div className="space-y-2">
                {alunos.map(aluno => (
                  <div key={aluno.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar inicial={aluno.nome.charAt(0)} color="purple" />
                      <div>
                        <p className="font-medium text-gray-900">{aluno.nome}</p>
                        {aluno.retirada_ativa?.responsavel_nome && (
                          <p className="text-xs text-gray-400">{aluno.retirada_ativa.responsavel_nome}</p>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={aluno.status} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

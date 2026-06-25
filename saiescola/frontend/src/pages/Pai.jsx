import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

function Avatar({ inicial, size = 'md' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  return (
    <div className={`${sizes[size]} rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0`}>
      {inicial}
    </div>
  );
}

export default function Pai() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [soliciting, setSoliciting] = useState({});
  const [notification, setNotification] = useState(null);

  const fetchAlunos = useCallback(async () => {
    try {
      const res = await api.get('/alunos/meus');
      setAlunos(res.data);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos]);

  useEffect(() => {
    if (!socket) return;

    function handleAlunoLiberado({ aluno_id }) {
      setAlunos(prev =>
        prev.map(a =>
          a.id === aluno_id
            ? { ...a, status: 'liberado', retirada_ativa: { ...a.retirada_ativa, status: 'liberado' } }
            : a
        )
      );
      setNotification('Seu filho foi liberado e está a caminho do portão!');
      setTimeout(() => setNotification(null), 5000);
    }

    function handleSaidaConfirmada({ aluno_id }) {
      setAlunos(prev =>
        prev.map(a =>
          a.id === aluno_id
            ? { ...a, status: 'saiu', retirada_ativa: null }
            : a
        )
      );
    }

    socket.on('aluno_liberado', handleAlunoLiberado);
    socket.on('saida_confirmada', handleSaidaConfirmada);

    return () => {
      socket.off('aluno_liberado', handleAlunoLiberado);
      socket.off('saida_confirmada', handleSaidaConfirmada);
    };
  }, [socket]);

  async function solicitar(aluno) {
    setSoliciting(prev => ({ ...prev, [aluno.id]: true }));
    try {
      await api.post('/retiradas/solicitar', { aluno_id: aluno.id });
      await fetchAlunos();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao solicitar retirada');
    } finally {
      setSoliciting(prev => ({ ...prev, [aluno.id]: false }));
    }
  }

  const statusMessage = {
    na_escola: null,
    responsavel_chegou: 'Aguardando liberação da professora...',
    liberado: 'A caminho do portão!',
    saiu: 'Saiu da escola',
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Olá, {user?.nome?.split(' ')[0]}!</h1>
              <p className="text-xs text-gray-500">Portal do Responsável</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-600 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Notification */}
        {notification && (
          <div className="mb-4 bg-blue-600 text-white rounded-xl p-4 flex items-center gap-3 shadow-lg">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="font-medium">{notification}</span>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-800 mb-4">Meus Filhos</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : alunos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Nenhum aluno vinculado</div>
        ) : (
          <div className="space-y-4">
            {alunos.map(aluno => (
              <div key={aluno.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar inicial={aluno.nome.charAt(0)} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{aluno.nome}</h3>
                      <p className="text-sm text-gray-500">{aluno.turma_nome}</p>
                    </div>
                  </div>
                  <StatusBadge status={aluno.status} />
                </div>

                {statusMessage[aluno.status] && (
                  <div className="mt-3 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                    {statusMessage[aluno.status]}
                  </div>
                )}

                {aluno.status === 'na_escola' && (
                  <button
                    onClick={() => solicitar(aluno)}
                    disabled={soliciting[aluno.id]}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-4 rounded-xl transition"
                  >
                    {soliciting[aluno.id] ? 'Enviando...' : 'Chegou para buscar'}
                  </button>
                )}

                {aluno.retirada_ativa && (
                  <div className="mt-3 text-xs text-gray-400">
                    Solicitado em: {new Date(aluno.retirada_ativa.horario_solicitacao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

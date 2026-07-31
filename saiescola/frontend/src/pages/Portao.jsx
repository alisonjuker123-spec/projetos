import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function Portao() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [retiradas, setRetiradas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState({});

  const fetchData = useCallback(async () => {
    try {
      const [ativasRes, historicoRes] = await Promise.all([
        api.get('/retiradas/ativas'),
        api.get('/retiradas/historico'),
      ]);
      setRetiradas(ativasRes.data.filter(r => r.status === 'liberado'));
      setHistorico(historicoRes.data.filter(r => r.status === 'saiu'));
    } catch (err) {
      console.error('Erro ao buscar retiradas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    function handleAlunoLiberado(data) {
      const { retirada } = data;
      // Add to "a caminho" list
      fetchData();
    }

    function handleSaidaConfirmada({ retirada_id, aluno_id }) {
      setRetiradas(prev => prev.filter(r => r.id !== retirada_id));
      fetchData(); // refresh historico
    }

    function handleNovaSolicitacao() {
      // No direct action needed at portao for solicitations
    }

    socket.on('aluno_liberado', handleAlunoLiberado);
    socket.on('saida_confirmada', handleSaidaConfirmada);
    socket.on('nova_solicitacao', handleNovaSolicitacao);

    return () => {
      socket.off('aluno_liberado', handleAlunoLiberado);
      socket.off('saida_confirmada', handleSaidaConfirmada);
      socket.off('nova_solicitacao', handleNovaSolicitacao);
    };
  }, [socket, fetchData]);

  async function confirmarSaida(retiradaId) {
    setConfirming(prev => ({ ...prev, [retiradaId]: true }));
    try {
      await api.post('/retiradas/confirmar-saida', { retirada_id: retiradaId });
      setRetiradas(prev => prev.filter(r => r.id !== retiradaId));
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao confirmar saída');
    } finally {
      setConfirming(prev => ({ ...prev, [retiradaId]: false }));
    }
  }

  function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Portão</h1>
              <p className="text-xs text-gray-500">{user?.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xl font-bold text-green-600">{historico.length}</div>
              <div className="text-xs text-gray-400">saídas hoje</div>
            </div>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <>
            {/* A Caminho */}
            <section className="mb-8">
              <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse"></span>
                A Caminho do Portão ({retiradas.length})
              </h2>

              {retiradas.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                  Nenhum aluno a caminho do portão
                </div>
              ) : (
                <div className="space-y-3">
                  {retiradas.map(r => (
                    <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900">{r.aluno_nome}</h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.turma_nome}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">
                              {r.responsavel_foto || r.responsavel_nome?.charAt(0)}
                            </div>
                            <span>{r.responsavel_nome}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 capitalize">{r.grau_parentesco}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Chegou às {formatTime(r.horario_solicitacao)} • Liberado às {formatTime(r.horario_liberacao)}
                          </div>
                        </div>
                        <button
                          onClick={() => confirmarSaida(r.id)}
                          disabled={confirming[r.id]}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition whitespace-nowrap"
                        >
                          {confirming[r.id] ? 'Confirmando...' : 'Confirmar Saída'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Histórico do dia */}
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Histórico do Dia ({historico.length})
              </h2>

              {historico.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                  Nenhuma saída registrada hoje
                </div>
              ) : (
                <div className="space-y-2">
                  {historico.map(r => (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{r.aluno_nome}</span>
                            <span className="text-xs text-gray-400">{r.turma_nome}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.responsavel_nome} • Saiu às {formatTime(r.horario_saida)}
                          </div>
                        </div>
                        <StatusBadge status="saiu" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

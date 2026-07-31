import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function Admin() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState('alunos');
  const [alunos, setAlunos] = useState([]);
  const [retiradas, setRetiradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, ativas: 0, saiu: 0 });

  const fetchAlunos = useCallback(async () => {
    try {
      const res = await api.get('/alunos/escola');
      setAlunos(res.data);
    } catch (err) {
      console.error('Erro ao buscar alunos:', err);
    }
  }, []);

  const fetchRetiradas = useCallback(async () => {
    try {
      const res = await api.get('/retiradas/historico');
      setRetiradas(res.data);
      setCounts({
        total: res.data.length,
        ativas: res.data.filter(r => r.status !== 'saiu').length,
        saiu: res.data.filter(r => r.status === 'saiu').length,
      });
    } catch (err) {
      console.error('Erro ao buscar retiradas:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAlunos(), fetchRetiradas()]).finally(() => setLoading(false));
  }, [fetchAlunos, fetchRetiradas]);

  useEffect(() => {
    if (!socket) return;

    function handleUpdate() {
      fetchRetiradas();
      fetchAlunos();
    }

    socket.on('nova_solicitacao', handleUpdate);
    socket.on('aluno_liberado', handleUpdate);
    socket.on('saida_confirmada', handleUpdate);

    return () => {
      socket.off('nova_solicitacao', handleUpdate);
      socket.off('aluno_liberado', handleUpdate);
      socket.off('saida_confirmada', handleUpdate);
    };
  }, [socket, fetchRetiradas, fetchAlunos]);

  function formatTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const tabs = [
    { id: 'alunos', label: 'Alunos' },
    { id: 'retiradas', label: 'Retiradas de Hoje' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Painel Admin</h1>
              <p className="text-xs text-gray-500">{user?.nome}</p>
            </div>
          </div>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-red-600 transition">
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-100">
            <div className="text-2xl font-bold text-slate-700">{counts.total}</div>
            <div className="text-xs text-gray-500 mt-1">Retiradas Hoje</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-yellow-100">
            <div className="text-2xl font-bold text-yellow-600">{counts.ativas}</div>
            <div className="text-xs text-gray-500 mt-1">Em Andamento</div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border border-green-100">
            <div className="text-2xl font-bold text-green-600">{counts.saiu}</div>
            <div className="text-xs text-gray-500 mt-1">Concluídas</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-slate-700 text-slate-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : activeTab === 'alunos' ? (
          /* Alunos Tab */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Aluno</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Turma</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Responsáveis</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, idx) => (
                  <tr key={aluno.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{aluno.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{aluno.turma_nome}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {aluno.responsaveis?.map(r => (
                        <span key={r.nome} className="inline-flex items-center gap-1 mr-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                            {r.foto_inicial}
                          </span>
                          <span className="text-xs">{r.nome} <span className="text-gray-400">({r.grau_parentesco})</span></span>
                        </span>
                      ))}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={aluno.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Retiradas Tab */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            {retiradas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">Nenhuma retirada hoje</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Aluno</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Turma</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Responsável</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Solicitado</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Liberado</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Saiu</th>
                  </tr>
                </thead>
                <tbody>
                  {retiradas.map((r, idx) => (
                    <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.aluno_nome}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.turma_nome}</td>
                      <td className="px-4 py-3 text-gray-600">{r.responsavel_nome}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(r.horario_solicitacao)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(r.horario_liberacao)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatTime(r.horario_saida)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

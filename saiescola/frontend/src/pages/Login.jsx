import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TEST_CREDENTIALS = [
  { email: 'pai@teste.com', role: 'Pai' },
  { email: 'professora@teste.com', role: 'Professora' },
  { email: 'portao@teste.com', role: 'Portão' },
  { email: 'admin@teste.com', role: 'Admin' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const roleRoutes = {
    pai: '/pai',
    professora: '/professora',
    portao: '/portao',
    admin: '/admin',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const result = await login(email, senha);
    if (result.success) {
      navigate(roleRoutes[result.usuario.papel] || '/');
    } else {
      setError(result.error);
    }
  }

  function fillCredentials(cred) {
    setEmail(cred.email);
    setSenha('123456');
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-indigo-700">SaiEscola</h1>
          <p className="text-gray-500 mt-1">Sistema de Retirada de Alunos</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar no sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Test Credentials */}
        <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
            Credenciais de Teste (senha: 123456)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {TEST_CREDENTIALS.map(cred => (
              <button
                key={cred.email}
                onClick={() => fillCredentials(cred)}
                className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition group"
              >
                <div className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                  {cred.role}
                </div>
                <div className="text-xs text-gray-500 truncate">{cred.email}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Clique em um perfil para preencher automaticamente</p>
        </div>
      </div>
    </div>
  );
}

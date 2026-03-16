'use client';

import { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';

export default function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setIsLoading(false);
        return;
      }

      if (isRegistering) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: email.split('@')[0], // Default name from email
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message === 'User already registered'
            ? 'Este e-mail já está cadastrado. Tente entrar.'
            : signUpError.message);
        } else if (data.user) {
          setError('Cadastro realizado! Por favor, entre com suas credenciais.');
          setIsRegistering(false);
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError('E-mail ou senha incorretos. Por favor, tente novamente.');
          console.debug('Auth info:', authError.message);
        } else if (data.user) {
          onLogin();
        }
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar processar sua solicitação.');
      console.error('Erro inesperado:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f6f8] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="bg-[#1241a1] p-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold">Segurança EPI</h1>
          <p className="mt-1 text-sm text-blue-100">Gerenciamento de Segurança Industrial</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">E-mail</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 focus:border-[#1241a1] focus:ring-[#1241a1] transition-all"
                  placeholder="Seu e-mail"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 focus:border-[#1241a1] focus:ring-[#1241a1] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-2 rounded-lg p-3 text-sm ${error.includes('sucesso') || error.includes('Cadastro') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
              >
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              disabled={isLoading}
              type="submit"
              className="group relative w-full overflow-hidden rounded-xl bg-[#1241a1] py-3 font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#1241a1]/90 active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>{isRegistering ? 'Cadastrando...' : 'Autenticando...'}</span>
                </div>
              ) : (
                <span>{isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-sm font-medium text-[#1241a1] hover:underline"
            >
              {isRegistering ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
            </button>
            <p className="text-xs text-slate-400">
              Esqueceu sua senha? Entre em contato com o administrador do sistema.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

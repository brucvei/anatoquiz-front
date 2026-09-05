import { supabase } from '../../lib/supabaseClient';

export interface RankingItem {
  usuario_id: string;
  nomeExibicao: string;
  pontosTotal: number;
  quizzesJogados: number;
}

export async function listRankingGeral(quizId?: string): Promise<RankingItem[]> {
  let query = supabase.from('pontuacao_quiz').select('usuario_id, pontos_total, perfil(nome)');
  if (quizId) query = query.eq('quiz_id', quizId);
  const { data, error } = await query;
  if (error) throw error;

  const porUsuario = new Map<string, { nome: string; pontos: number; quizzes: number }>();
  for (const row of data as unknown as { usuario_id: string; pontos_total: number; perfil: { nome: string } | null }[]) {
    const atual = porUsuario.get(row.usuario_id) ?? { nome: row.perfil?.nome || '?', pontos: 0, quizzes: 0 };
    atual.pontos += row.pontos_total;
    atual.quizzes += 1;
    porUsuario.set(row.usuario_id, atual);
  }

  return Array.from(porUsuario.entries())
    .map(([usuario_id, v]) => ({ usuario_id, nomeExibicao: v.nome, pontosTotal: v.pontos, quizzesJogados: v.quizzes }))
    .sort((a, b) => b.pontosTotal - a.pontosTotal);
}

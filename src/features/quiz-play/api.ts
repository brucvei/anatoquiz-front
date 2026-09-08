import { supabase } from '../../lib/supabaseClient';
import type { CorrigirRespostaResult, Hotspot, Modo, Pergunta, PontuacaoQuiz, TentativaResposta } from '../../types/database';

export const TAMANHO_PAGINA = 10;

export async function getPerguntaDoHotspot(hotspotId: string) {
  const { data, error } = await supabase.from('pergunta').select('*').eq('hotspot_id', hotspotId).maybeSingle();
  if (error) throw error;
  return data as Pergunta | null;
}

/** Nunca seleciona a coluna `correta` — o client não pode saber a resposta certa antes de responder. */
export async function listAlternativasJogo(perguntaId: string) {
  const { data, error } = await supabase.from('alternativa').select('id, texto').eq('pergunta_id', perguntaId);
  if (error) throw error;
  return data as { id: string; texto: string }[];
}

export async function corrigirResposta(input: {
  pergunta_id: string;
  modo: Modo;
  alternativa_id?: string;
  resposta_texto?: string;
  sessao_id: string;
}) {
  const { data, error } = await supabase.rpc('corrigir_resposta', {
    p_pergunta_id: input.pergunta_id,
    p_modo: input.modo,
    p_alternativa_id: input.alternativa_id ?? null,
    p_resposta_texto: input.resposta_texto ?? null,
    p_sessao_id: input.sessao_id,
  });
  if (error) throw error;
  return data[0] as CorrigirRespostaResult;
}

/** Todos os hotspots de uma peça, atravessando todas as vistas dela, em ordem estável (define a sequência do jogo). */
export async function listHotspotsDaPeca(pecaId: string): Promise<Hotspot[]> {
  const { data: vistas, error: vistasError } = await supabase.from('imagem_vista').select('id').eq('peca_id', pecaId);
  if (vistasError) throw vistasError;
  if (!vistas || vistas.length === 0) return [];

  const { data: hotspots, error: hotspotsError } = await supabase
    .from('hotspot')
    .select('*')
    .in(
      'imagem_id',
      vistas.map((v) => v.id),
    )
    .order('imagem_id')
    .order('id');
  if (hotspotsError) throw hotspotsError;
  return (hotspots ?? []) as Hotspot[];
}

export async function getMinhaPontuacao(quizId: string, usuarioId: string) {
  const { data, error } = await supabase
    .from('pontuacao_quiz')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data as PontuacaoQuiz | null;
}

export async function listMinhasTentativas(quizId: string, usuarioId: string) {
  const { data, error } = await supabase
    .from('tentativa_resposta')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('usuario_id', usuarioId)
    .order('respondido_em', { ascending: false });
  if (error) throw error;
  return data as TentativaResposta[];
}

export interface TentativaComEstrutura extends TentativaResposta {
  estruturaNome: string;
  vistaAngulo: string | null;
}

/** Junta o nome da estrutura e a vista de cada tentativa, pra revisão mostrar "Fêmur · vista anterior" de verdade. */
export async function listMinhasTentativasComEstrutura(
  quizId: string,
  usuarioId: string,
): Promise<TentativaComEstrutura[]> {
  const tentativas = await listMinhasTentativas(quizId, usuarioId);
  return Promise.all(
    tentativas.map(async (t) => {
      const { data } = await supabase
        .from('pergunta')
        .select('hotspot(estrutura_anatomica(nome), imagem_vista(angulo))')
        .eq('id', t.pergunta_id)
        .maybeSingle();
      const hotspot = (
        data as unknown as { hotspot: { estrutura_anatomica: { nome: string }; imagem_vista: { angulo: string } } } | null
      )?.hotspot;
      return { ...t, estruturaNome: hotspot?.estrutura_anatomica?.nome ?? '?', vistaAngulo: hotspot?.imagem_vista?.angulo ?? null };
    }),
  );
}

export interface HistoricoItem {
  quiz_id: string;
  pontos_total: number;
  atualizado_em: string;
  quiz: { titulo: string } | null;
}

export async function listMeuHistorico(usuarioId: string, pagina = 0) {
  const inicio = pagina * TAMANHO_PAGINA;
  const { data, error } = await supabase
    .from('pontuacao_quiz')
    .select('quiz_id, pontos_total, atualizado_em, quiz(titulo)')
    .eq('usuario_id', usuarioId)
    .order('atualizado_em', { ascending: false })
    .range(inicio, inicio + TAMANHO_PAGINA - 1);
  if (error) throw error;
  return data as unknown as HistoricoItem[];
}

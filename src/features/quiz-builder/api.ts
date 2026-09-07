import { supabase } from '../../lib/supabaseClient';
import type {
  Alternativa,
  AlternativaInsert,
  AlternativaUpdate,
  Angulo,
  EstruturaAnatomica,
  Hotspot,
  HotspotInsert,
  ImagemVista,
  PecaAnatomica,
  Pergunta,
  PerguntaInsert,
  Quiz,
  QuizInsert,
  QuizUpdate,
  SistemaAnatomico,
} from '../../types/database';

export const TAMANHO_PAGINA = 10;

export async function listMeusQuizzes(autorId: string, pagina = 0) {
  const inicio = pagina * TAMANHO_PAGINA;
  const { data, error } = await supabase
    .from('quiz')
    .select('*')
    .eq('autor_id', autorId)
    .order('criado_em', { ascending: false })
    .range(inicio, inicio + TAMANHO_PAGINA - 1);
  if (error) throw error;
  return data as Quiz[];
}

export async function buscarQuizzesPublicos(termo: string, pagina = 0) {
  const inicio = pagina * TAMANHO_PAGINA;
  let query = supabase.from('quiz').select('*').eq('publico', true).order('criado_em', { ascending: false });
  if (termo.trim()) {
    query = query.or(`titulo.ilike.%${termo.trim()}%,descricao.ilike.%${termo.trim()}%`);
  }
  const { data, error } = await query.range(inicio, inicio + TAMANHO_PAGINA - 1);
  if (error) throw error;
  return data as Quiz[];
}

export async function getQuiz(id: string) {
  const { data, error } = await supabase.from('quiz').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Quiz;
}

export async function createQuiz(input: QuizInsert) {
  const { data, error } = await supabase.from('quiz').insert(input).select().single();
  if (error) throw error;
  return data as Quiz;
}

export async function updateQuiz(id: string, input: QuizUpdate) {
  const { data, error } = await supabase.from('quiz').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as Quiz;
}

const BUCKET = 'pecas-anatomicas';

/** Apaga também os arquivos do Storage sob "<quiz_id>/" — cascade do banco não alcança o Storage. */
export async function deleteQuiz(id: string) {
  const { data: arquivos } = await supabase.storage.from(BUCKET).list(id);
  if (arquivos && arquivos.length > 0) {
    await supabase.storage.from(BUCKET).remove(arquivos.map((a) => `${id}/${a.name}`));
  }

  const { error } = await supabase.from('quiz').delete().eq('id', id);
  if (error) throw error;
}

/** Convenção obrigatória de path: "<quiz_id>/..." — é o que a policy de Storage usa pra achar o dono. */
export async function uploadImagemPeca(quizId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${quizId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
}

export async function createPeca(input: { quiz_id: string; nome: string; descricao?: string; sistema_id?: string }) {
  const { data, error } = await supabase.from('peca_anatomica').insert(input).select().single();
  if (error) throw error;
  return data as PecaAnatomica;
}

export async function getSistemaDaPeca(sistemaId: string | null) {
  if (!sistemaId) return null;
  const { data } = await supabase.from('sistema_anatomico').select('nome').eq('id', sistemaId).maybeSingle();
  return data?.nome ?? null;
}

export async function listSistemas() {
  const { data, error } = await supabase.from('sistema_anatomico').select('*').order('nome');
  if (error) throw error;
  return data as SistemaAnatomico[];
}

export async function findOrCreateSistema(nome: string): Promise<SistemaAnatomico> {
  const nomeTrim = nome.trim();
  const { data: existente, error: buscaError } = await supabase
    .from('sistema_anatomico')
    .select('*')
    .ilike('nome', nomeTrim)
    .maybeSingle();
  if (buscaError) throw buscaError;
  if (existente) return existente as SistemaAnatomico;

  const { data, error } = await supabase.from('sistema_anatomico').insert({ nome: nomeTrim }).select().single();
  if (error) throw error;
  return data as SistemaAnatomico;
}

export interface QuizCardInfo {
  thumbnailUrl: string | null;
  sistemaNome: string | null;
  totalPecas: number;
  totalPerguntas: number;
  totalJogadores: number;
}

/** Info extra pra exibir o card de um quiz na busca: imagem, sistema anatômico, nº de peças/perguntas/jogadores. */
export async function getInfoCardQuiz(quizId: string): Promise<QuizCardInfo> {
  const { data: pecas } = await supabase.from('peca_anatomica').select('id, sistema_id').eq('quiz_id', quizId);
  const { count: totalJogadores } = await supabase
    .from('pontuacao_quiz')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId);

  if (!pecas || pecas.length === 0) {
    return { thumbnailUrl: null, sistemaNome: null, totalPecas: 0, totalPerguntas: 0, totalJogadores: totalJogadores ?? 0 };
  }

  const primeira = pecas[0];
  let thumbnailUrl: string | null = null;
  let sistemaNome: string | null = null;

  const { data: vistas } = await supabase
    .from('imagem_vista')
    .select('id, storage_path')
    .eq('peca_id', primeira.id);
  if (vistas && vistas[0]) thumbnailUrl = await getImagemUrl(vistas[0].storage_path);

  if (primeira.sistema_id) {
    const { data: sistema } = await supabase
      .from('sistema_anatomico')
      .select('nome')
      .eq('id', primeira.sistema_id)
      .maybeSingle();
    sistemaNome = sistema?.nome ?? null;
  }

  const { data: todasVistas } = await supabase
    .from('imagem_vista')
    .select('id')
    .in(
      'peca_id',
      pecas.map((p) => p.id),
    );
  let totalPerguntas = 0;
  if (todasVistas && todasVistas.length > 0) {
    const { count } = await supabase
      .from('hotspot')
      .select('id', { count: 'exact', head: true })
      .in(
        'imagem_id',
        todasVistas.map((v) => v.id),
      );
    totalPerguntas = count ?? 0;
  }

  return { thumbnailUrl, sistemaNome, totalPecas: pecas.length, totalPerguntas, totalJogadores: totalJogadores ?? 0 };
}

export async function listPecas(quizId: string) {
  const { data, error } = await supabase.from('peca_anatomica').select('*').eq('quiz_id', quizId);
  if (error) throw error;
  return data as PecaAnatomica[];
}

/** Apaga as imagens dessa peça no Storage antes de apagar a linha (cascade cuida do resto no banco). */
export async function deletePeca(id: string) {
  const { data: vistas } = await supabase.from('imagem_vista').select('storage_path').eq('peca_id', id);
  if (vistas && vistas.length > 0) {
    await supabase.storage.from(BUCKET).remove(vistas.map((v) => v.storage_path));
  }

  const { error } = await supabase.from('peca_anatomica').delete().eq('id', id);
  if (error) throw error;
}

export async function contarVistas(pecaId: string): Promise<number> {
  const { count } = await supabase
    .from('imagem_vista')
    .select('id', { count: 'exact', head: true })
    .eq('peca_id', pecaId);
  return count ?? 0;
}

export async function listVistas(pecaId: string) {
  const { data, error } = await supabase.from('imagem_vista').select('*').eq('peca_id', pecaId);
  if (error) throw error;
  return data as ImagemVista[];
}

export async function createVista(input: { peca_id: string; angulo: Angulo; storage_path: string }) {
  const { data, error } = await supabase.from('imagem_vista').insert(input).select().single();
  if (error) throw error;
  return data as ImagemVista;
}

export async function getVista(id: string) {
  const { data, error } = await supabase.from('imagem_vista').select('*').eq('id', id).single();
  if (error) throw error;
  return data as ImagemVista;
}

/** Bucket é privado — resolve sempre por signed URL. */
export async function getImagemUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function listHotspots(imagemId: string) {
  const { data, error } = await supabase.from('hotspot').select('*').eq('imagem_id', imagemId);
  if (error) throw error;
  return data as Hotspot[];
}

export async function listEstruturas() {
  const { data, error } = await supabase.from('estrutura_anatomica').select('*').order('nome');
  if (error) throw error;
  return data as EstruturaAnatomica[];
}

export async function findOrCreateEstrutura(nome: string): Promise<EstruturaAnatomica> {
  const nomeTrim = nome.trim();
  const { data: existente, error: buscaError } = await supabase
    .from('estrutura_anatomica')
    .select('*')
    .ilike('nome', nomeTrim)
    .maybeSingle();
  if (buscaError) throw buscaError;
  if (existente) return existente as EstruturaAnatomica;

  const { data, error } = await supabase.from('estrutura_anatomica').insert({ nome: nomeTrim }).select().single();
  if (error) throw error;
  return data as EstruturaAnatomica;
}

export async function createHotspot(input: HotspotInsert) {
  const { data, error } = await supabase.from('hotspot').insert(input).select().single();
  if (error) throw error;
  return data as Hotspot;
}

export async function deleteHotspot(id: string) {
  const { error } = await supabase.from('hotspot').delete().eq('id', id);
  if (error) throw error;
}

export async function getPerguntaDoHotspot(hotspotId: string) {
  const { data, error } = await supabase.from('pergunta').select('*').eq('hotspot_id', hotspotId).maybeSingle();
  if (error) throw error;
  return data as Pergunta | null;
}

export async function listAlternativas(perguntaId: string) {
  const { data, error } = await supabase.from('alternativa').select('*').eq('pergunta_id', perguntaId).order('id');
  if (error) throw error;
  return data as Alternativa[];
}

export async function createPergunta(input: PerguntaInsert) {
  const { data, error } = await supabase.from('pergunta').insert(input).select().single();
  if (error) throw error;
  return data as Pergunta;
}

export async function updatePergunta(id: string, enunciado: string) {
  const { error } = await supabase.from('pergunta').update({ enunciado }).eq('id', id);
  if (error) throw error;
}

export async function createAlternativa(input: AlternativaInsert) {
  const { data, error } = await supabase.from('alternativa').insert(input).select().single();
  if (error) throw error;
  return data as Alternativa;
}

export async function updateAlternativa(id: string, input: AlternativaUpdate) {
  const { error } = await supabase.from('alternativa').update(input).eq('id', id);
  if (error) throw error;
}

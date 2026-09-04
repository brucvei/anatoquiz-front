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
} from '../../types/database';

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

export async function deleteQuiz(id: string) {
  const { error } = await supabase.from('quiz').delete().eq('id', id);
  if (error) throw error;
}

const BUCKET = 'pecas-anatomicas';

/** Convenção obrigatória de path: "<quiz_id>/..." — é o que a policy de Storage usa pra achar o dono. */
export async function uploadImagemPeca(quizId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${quizId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file);
  if (error) throw error;

  return path;
}

export async function createPeca(input: { quiz_id: string; nome: string; descricao?: string }) {
  const { data, error } = await supabase.from('peca_anatomica').insert(input).select().single();
  if (error) throw error;
  return data as PecaAnatomica;
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

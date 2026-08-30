// Tipos derivados manualmente de db/schema.sql. Manter em sincronia com o schema.

export type Angulo = 'anterior' | 'posterior' | 'lateral_direita' | 'lateral_esquerda' | 'dorsal' | 'ventral';
export type Modo = 'multipla' | 'livre';

export interface Perfil {
  id: string;
  nome: string;
  instituicao: string | null;
  criado_em: string;
}

export interface Quiz {
  id: string;
  autor_id: string;
  titulo: string;
  descricao: string | null;
  publico: boolean;
  criado_em: string;
}

export interface SistemaAnatomico {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface PecaAnatomica {
  id: string;
  quiz_id: string;
  sistema_id: string | null;
  nome: string;
  descricao: string | null;
}

export interface ImagemVista {
  id: string;
  peca_id: string;
  angulo: Angulo;
  storage_path: string;
}

export interface EstruturaAnatomica {
  id: string;
  sistema_id: string | null;
  nome: string;
  descricao: string | null;
}

export interface Hotspot {
  id: string;
  imagem_id: string;
  estrutura_id: string;
  coord_x: number;
  coord_y: number;
}

export interface Pergunta {
  id: string;
  hotspot_id: string;
  enunciado: string;
}

export interface Alternativa {
  id: string;
  pergunta_id: string;
  texto: string;
  correta: boolean;
}

export interface TentativaResposta {
  id: string;
  usuario_id: string;
  quiz_id: string;
  pergunta_id: string;
  alternativa_id: string | null;
  modo: Modo;
  resposta_texto: string | null;
  acertou: boolean;
  pontos: number;
  respondido_em: string;
}

export interface PontuacaoQuiz {
  id: string;
  usuario_id: string;
  quiz_id: string;
  pontos_total: number;
  atualizado_em: string;
}

export interface CorrigirRespostaResult {
  acertou: boolean;
  pontos: number;
  estrutura_correta: string;
}

export interface Database {
  public: {
    Tables: {
      perfil: { Row: Perfil; Insert: Partial<Perfil> & Pick<Perfil, 'id' | 'nome'>; Update: Partial<Perfil> };
      quiz: { Row: Quiz; Insert: Partial<Quiz> & Pick<Quiz, 'autor_id' | 'titulo'>; Update: Partial<Quiz> };
      sistema_anatomico: { Row: SistemaAnatomico; Insert: Partial<SistemaAnatomico> & Pick<SistemaAnatomico, 'nome'>; Update: Partial<SistemaAnatomico> };
      peca_anatomica: { Row: PecaAnatomica; Insert: Partial<PecaAnatomica> & Pick<PecaAnatomica, 'quiz_id' | 'nome'>; Update: Partial<PecaAnatomica> };
      imagem_vista: { Row: ImagemVista; Insert: Partial<ImagemVista> & Pick<ImagemVista, 'peca_id' | 'angulo' | 'storage_path'>; Update: Partial<ImagemVista> };
      estrutura_anatomica: { Row: EstruturaAnatomica; Insert: Partial<EstruturaAnatomica> & Pick<EstruturaAnatomica, 'nome'>; Update: Partial<EstruturaAnatomica> };
      hotspot: { Row: Hotspot; Insert: Partial<Hotspot> & Pick<Hotspot, 'imagem_id' | 'estrutura_id' | 'coord_x' | 'coord_y'>; Update: Partial<Hotspot> };
      pergunta: { Row: Pergunta; Insert: Partial<Pergunta> & Pick<Pergunta, 'hotspot_id' | 'enunciado'>; Update: Partial<Pergunta> };
      alternativa: { Row: Alternativa; Insert: Partial<Alternativa> & Pick<Alternativa, 'pergunta_id' | 'texto'>; Update: Partial<Alternativa> };
      tentativa_resposta: { Row: TentativaResposta; Insert: Partial<TentativaResposta> & Pick<TentativaResposta, 'usuario_id' | 'quiz_id' | 'pergunta_id' | 'modo' | 'acertou'>; Update: Partial<TentativaResposta> };
      pontuacao_quiz: { Row: PontuacaoQuiz; Insert: Partial<PontuacaoQuiz> & Pick<PontuacaoQuiz, 'usuario_id' | 'quiz_id'>; Update: Partial<PontuacaoQuiz> };
    };
    Functions: {
      corrigir_resposta: {
        Args: {
          p_pergunta_id: string;
          p_modo: Modo;
          p_alternativa_id?: string | null;
          p_resposta_texto?: string | null;
        };
        Returns: CorrigirRespostaResult[];
      };
    };
  };
}

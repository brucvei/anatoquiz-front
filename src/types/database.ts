// Tipos derivados manualmente de db/schema.sql. Manter em sincronia com o schema.

export type Angulo = 'anterior' | 'posterior' | 'lateral_direita' | 'lateral_esquerda' | 'dorsal' | 'ventral';
export type Modo = 'multipla' | 'livre';

export type Perfil = {
  id: string;
  nome: string;
  instituicao: string | null;
  criado_em: string;
}
export type PerfilInsert = {
  id: string;
  nome: string;
  instituicao?: string | null;
}
export type PerfilUpdate = {
  nome?: string;
  instituicao?: string | null;
}

export type Quiz = {
  id: string;
  autor_id: string;
  titulo: string;
  descricao: string | null;
  publico: boolean;
  criado_em: string;
}
export type QuizInsert = {
  autor_id: string;
  titulo: string;
  descricao?: string | null;
  publico?: boolean;
}
export type QuizUpdate = {
  titulo?: string;
  descricao?: string | null;
  publico?: boolean;
}

export type SistemaAnatomico = {
  id: string;
  nome: string;
  descricao: string | null;
}
export type SistemaAnatomicoInsert = {
  nome: string;
  descricao?: string | null;
}
export type SistemaAnatomicoUpdate = {
  nome?: string;
  descricao?: string | null;
}

export type PecaAnatomica = {
  id: string;
  quiz_id: string;
  sistema_id: string | null;
  nome: string;
  descricao: string | null;
}
export type PecaAnatomicaInsert = {
  quiz_id: string;
  sistema_id?: string | null;
  nome: string;
  descricao?: string | null;
}
export type PecaAnatomicaUpdate = {
  sistema_id?: string | null;
  nome?: string;
  descricao?: string | null;
}

export type ImagemVista = {
  id: string;
  peca_id: string;
  angulo: Angulo;
  storage_path: string;
}
export type ImagemVistaInsert = {
  peca_id: string;
  angulo: Angulo;
  storage_path: string;
}
export type ImagemVistaUpdate = {
  angulo?: Angulo;
  storage_path?: string;
}

export type EstruturaAnatomica = {
  id: string;
  sistema_id: string | null;
  nome: string;
  descricao: string | null;
}
export type EstruturaAnatomicaInsert = {
  sistema_id?: string | null;
  nome: string;
  descricao?: string | null;
}
export type EstruturaAnatomicaUpdate = {
  sistema_id?: string | null;
  nome?: string;
  descricao?: string | null;
}

export type TipoHotspot = 'ponto' | 'regiao';

export type Hotspot = {
  id: string;
  imagem_id: string;
  estrutura_id: string;
  tipo: TipoHotspot;
  coord_x: number;
  coord_y: number;
  largura: number | null;
  altura: number | null;
}
export type HotspotInsert = {
  imagem_id: string;
  estrutura_id: string;
  tipo?: TipoHotspot;
  coord_x: number;
  coord_y: number;
  largura?: number | null;
  altura?: number | null;
}
export type HotspotUpdate = {
  estrutura_id?: string;
  tipo?: TipoHotspot;
  coord_x?: number;
  coord_y?: number;
  largura?: number | null;
  altura?: number | null;
}

export type Pergunta = {
  id: string;
  hotspot_id: string;
  enunciado: string;
}
export type PerguntaInsert = {
  hotspot_id: string;
  enunciado: string;
}
export type PerguntaUpdate = {
  enunciado?: string;
}

export type Alternativa = {
  id: string;
  pergunta_id: string;
  texto: string;
  correta: boolean;
}
export type AlternativaInsert = {
  pergunta_id: string;
  texto: string;
  correta?: boolean;
}
export type AlternativaUpdate = {
  texto?: string;
  correta?: boolean;
}

export type TentativaResposta = {
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
export type TentativaRespostaInsert = {
  usuario_id: string;
  quiz_id: string;
  pergunta_id: string;
  alternativa_id?: string | null;
  modo: Modo;
  resposta_texto?: string | null;
  acertou: boolean;
  pontos?: number;
}
export type TentativaRespostaUpdate = {
  acertou?: boolean;
  pontos?: number;
}

export type PontuacaoQuiz = {
  id: string;
  usuario_id: string;
  quiz_id: string;
  pontos_total: number;
  atualizado_em: string;
}
export type PontuacaoQuizInsert = {
  usuario_id: string;
  quiz_id: string;
  pontos_total?: number;
}
export type PontuacaoQuizUpdate = {
  pontos_total?: number;
}

export type CorrigirRespostaResult = {
  acertou: boolean;
  pontos: number;
  estrutura_correta: string;
}

export type Database = {
  public: {
    Tables: {
      perfil: { Row: Perfil; Insert: PerfilInsert; Update: PerfilUpdate; Relationships: [] };
      quiz: { Row: Quiz; Insert: QuizInsert; Update: QuizUpdate; Relationships: [] };
      sistema_anatomico: { Row: SistemaAnatomico; Insert: SistemaAnatomicoInsert; Update: SistemaAnatomicoUpdate; Relationships: [] };
      peca_anatomica: { Row: PecaAnatomica; Insert: PecaAnatomicaInsert; Update: PecaAnatomicaUpdate; Relationships: [] };
      imagem_vista: { Row: ImagemVista; Insert: ImagemVistaInsert; Update: ImagemVistaUpdate; Relationships: [] };
      estrutura_anatomica: { Row: EstruturaAnatomica; Insert: EstruturaAnatomicaInsert; Update: EstruturaAnatomicaUpdate; Relationships: [] };
      hotspot: { Row: Hotspot; Insert: HotspotInsert; Update: HotspotUpdate; Relationships: [] };
      pergunta: { Row: Pergunta; Insert: PerguntaInsert; Update: PerguntaUpdate; Relationships: [] };
      alternativa: { Row: Alternativa; Insert: AlternativaInsert; Update: AlternativaUpdate; Relationships: [] };
      tentativa_resposta: { Row: TentativaResposta; Insert: TentativaRespostaInsert; Update: TentativaRespostaUpdate; Relationships: [] };
      pontuacao_quiz: { Row: PontuacaoQuiz; Insert: PontuacaoQuizInsert; Update: PontuacaoQuizUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
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
};

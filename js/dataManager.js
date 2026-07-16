class DataManager {
  constructor() {
    this.dados = {
      categorias: null,
      perguntas: null,
      opcoes: null
    };
    this.carregado = false;
    this.listeners = new Set();
  }

  async carregarTodos() {
    try {
      console.log('🔄 Carregando dados...');
      
      const [categorias, perguntas, opcoes] = await Promise.all([
        this.carregarArquivo('data/categorias.json'),
        this.carregarArquivo('data/perguntas.json'),
        this.carregarArquivo('data/opcoes.json')
      ]);

      this.dados = { categorias, perguntas, opcoes };
      this.carregado = true;
      
      console.log('✅ Dados carregados com sucesso!');
      this.notificarListeners('dadosCarregados');
      
      return this.dados;
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      this.carregarDadosPadrao();
      throw error;
    }
  }

  async carregarArquivo(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erro ao carregar ${url}: ${response.status}`);
    }
    return await response.json();
  }

  carregarDadosPadrao() {
    // Dados de fallback caso os arquivos não carreguem
    this.dados = {
      categorias: {
        metadata: { version: "1.0.0" },
        classificacoes: {
          "Geral": {
            "tipo1": "DAR",
            "tipo2": "RECEBER",
            "icone1": "🔥",
            "icone2": "💖",
            "cor1": "#e74c3c",
            "cor2": "#27ae60"
          }
        },
        categorias: {
          "Geral": {
            id: "geral",
            nome: "Geral", 
            icone: "📋",
            ativa: true,
            ordem: 1,
            cor: "#667eea"
          }
        }
      },
      perguntas: {
        perguntas: {
          "Geral": ["Pergunta padrão"]
        }
      },
      opcoes: {
        respostas: ["N/A", "Nunca experimentei", "Adoro", "Aceito", "Limite rígido"],
        perfil: {
          posicoes: ["Top", "Switch", "bottom"],
          toleranciaDor: ["Baixa", "Média", "Alta"],
          experiencia: ["0-3 anos", "3-5 anos", "5+ anos"]
        },
        relacionamentos: ["Monogamia", "Não-monogamia"],
        locais: ["Privado", "Público"]
      }
    };
    
    this.carregado = true;
    this.notificarListeners('dadosPadraoCarregados');
  }

  // Getters para facilitar o acesso
  get categoriasAtivas() {
    return Object.entries(this.dados.categorias?.categorias || {})
      .filter(([_, cat]) => cat.ativa)
      .sort(([_, a], [__, b]) => (a.ordem || 0) - (b.ordem || 0));
  }

  get classificacoes() {
    return this.dados.categorias?.classificacoes || {};
  }

  get respostas() {
    return this.dados.opcoes?.respostas || [];
  }

  get perguntas() {
    return this.dados.perguntas?.perguntas || {};
  }

  get opcoesPerfil() {
    return this.dados.opcoes?.perfil || {};
  }

  get opcoesRelacionamentos() {
    return this.dados.opcoes?.relacionamentos || [];
  }

  get opcoesLocais() {
    return this.dados.opcoes?.locais || [];
  }

  // Sistema de listeners
  adicionarListener(callback) {
    this.listeners.add(callback);
  }

  removerListener(callback) {
    this.listeners.delete(callback);
  }

  notificarListeners(evento, dados = null) {
    this.listeners.forEach(callback => {
      try {
        callback(evento, dados);
      } catch (error) {
        console.error('Erro no listener:', error);
      }
    });
  }

  // Métodos utilitários
  obterCategoria(nome) {
    return this.dados.categorias?.categorias?.[nome];
  }

  obterClassificacao(categoria) {
    return this.dados.categorias?.classificacoes?.[categoria];
  }

  obterPerguntasCategoria(categoria) {
    return this.dados.perguntas?.perguntas?.[categoria] || [];
  }

  // Método para recarregar dados
  async recarregar() {
    this.carregado = false;
    return await this.carregarTodos();
  }
}
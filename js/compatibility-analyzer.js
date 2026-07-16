/**
 * CompatibilityAnalyzer
 * ----------------------
 * Compara dois perfis reais (profile1, profile2) e calcula compatibilidade
 * com base nas respostas efetivamente dadas por cada pessoa, ao invés de
 * gerar valores aleatórios.
 *
 * Formato confirmado em main.js (função proximaPergunta, linha ~457):
 *   respostasUsuario[indice] = {
 *     categoria: atual.categoria,
 *     pergunta: atual.texto,
 *     dar: respostaDarAtual,
 *     receber: respostaReceberAtual
 *   }
 *
 * E os valores possíveis de dar/receber, confirmados em main.js e
 * dataManager.js: 'Adoro', 'Aproveito', 'Aceito', 'Tolero',
 * 'Nunca experimentei', 'Limite rígido', 'N/A'.
 */

const FIELD_MAP = {
  practiceKeys: ['pergunta'],
  darKeys: ['dar'],
  receberKeys: ['receber']
};

// Escala de intensidade das respostas. Usada para decidir se há match,
// potencial, ou conflito entre duas respostas.
const RESPONSE_SCALE = {
  'Limite rígido': -2,
  'Nunca experimentei': 0,
  'Tolero': 1,
  'Aceito': 2,
  'Aproveito': 3,
  'Adoro': 4,
  'N/A': null
};

function getField(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return null;
}

function getScale(value) {
  if (value === null || value === undefined) return null;
  return Object.prototype.hasOwnProperty.call(RESPONSE_SCALE, value)
    ? RESPONSE_SCALE[value]
    : null;
}

class CompatibilityAnalyzer {
  constructor() {
    this.COMPATIBILITY_STORAGE = 'kinklistbr_comparisons';
  }

  analyzeCompatibility(profile1, profile2) {
    const analysis = {
      overallScore: 0,
      categoryScores: {},
      recommendations: []
    };

    const categories = this.getUniqueCategories(profile1, profile2);

    categories.forEach(category => {
      const categoryAnalysis = this.analyzeCategoryCompatibility(
        (profile1.respostas || []).filter(r => r.categoria === category),
        (profile2.respostas || []).filter(r => r.categoria === category)
      );
      analysis.categoryScores[category] = categoryAnalysis;
    });

    analysis.overallScore = this.calculateOverallScore(analysis.categoryScores);
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Compara as respostas reais de duas pessoas para a mesma categoria.
   * Para cada prática presente nos dois perfis, cruza DAR de um com
   * RECEBER do outro (e vice-versa) para achar complementaridade real.
   */
  analyzeCategoryCompatibility(responses1, responses2) {
    const matches = { perfect: [], good: [], potential: [], conflicts: [] };

    const map2 = new Map();
    responses2.forEach(r => {
      const name = getField(r, FIELD_MAP.practiceKeys);
      if (name) map2.set(name, r);
    });

    let scoredPairs = 0;
    let scoreSum = 0;

    responses1.forEach(r1 => {
      const name = getField(r1, FIELD_MAP.practiceKeys);
      const r2 = name ? map2.get(name) : null;
      if (!r2) return; // prática não respondida pelos dois, não dá pra comparar

      const dar1 = getScale(getField(r1, FIELD_MAP.darKeys));
      const receber1 = getScale(getField(r1, FIELD_MAP.receberKeys));
      const dar2 = getScale(getField(r2, FIELD_MAP.darKeys));
      const receber2 = getScale(getField(r2, FIELD_MAP.receberKeys));

      // Direção A: pessoa 1 dá, pessoa 2 recebe
      this.evaluatePair(name, dar1, receber2, matches, result => {
        if (result !== null) { scoredPairs++; scoreSum += result; }
      });

      // Direção B: pessoa 2 dá, pessoa 1 recebe
      this.evaluatePair(name, dar2, receber1, matches, result => {
        if (result !== null) { scoredPairs++; scoreSum += result; }
      });
    });

    // Score da categoria: média normalizada (0-100) dos pares avaliados.
    // Escala vai de -2 (limite rígido) a 4 (adora); normalizamos para 0-100.
    const score = scoredPairs > 0
      ? Math.round(((scoreSum / scoredPairs) + 2) / 6 * 100)
      : 0;

    return { score, matches };
  }

  /**
   * Classifica um par (quem dá x quem recebe) em perfect / good / potential / conflict
   * com base na escala real de respostas, e devolve o valor numérico do par
   * (para entrar na média do score) via callback.
   */
  evaluatePair(practice, giveScale, receiveScale, matches, onScored) {
    if (giveScale === null || receiveScale === null) {
      onScored(null);
      return;
    }

    const pairValue = (giveScale + receiveScale) / 2;
    onScored(pairValue);

    const entry = {
      practice,
      reason: '',
      suggestion: 'Comunicação recomendada'
    };

    if (giveScale === -2 || receiveScale === -2) {
      entry.reason = 'Um quer fazer/receber algo que o outro tem como limite rígido';
      matches.conflicts.push(entry);
    } else if (giveScale >= 3 && receiveScale >= 3) {
      entry.reason = 'Alta compatibilidade - um adora fazer, outro adora receber';
      matches.perfect.push(entry);
    } else if (giveScale >= 2 && receiveScale >= 2) {
      entry.reason = 'Boa compatibilidade - interesse mútuo presente';
      matches.good.push(entry);
    } else if (giveScale >= 1 && receiveScale >= 0) {
      entry.reason = 'Ambos aceitam - potencial para desenvolvimento';
      matches.potential.push(entry);
    }
    // Combinações neutras/baixas (ex: ambos "Nunca experimentei") não geram
    // entrada em nenhuma lista, pois não são nem match nem conflito real.
  }

  calculateOverallScore(categoryScores) {
    const scores = Object.values(categoryScores).map(cat => cat.score);
    return scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.overallScore >= 70) {
      recommendations.push({
        type: 'success',
        title: 'Alta Compatibilidade! 🎉',
        message: 'Vocês têm excelente sintonia. Foquem na comunicação para explorar os interesses mútuos.'
      });
    } else if (analysis.overallScore >= 50) {
      recommendations.push({
        type: 'good',
        title: 'Boa Compatibilidade 👍',
        message: 'Há potencial real aqui. Conversem sobre expectativas e explorem gradualmente.'
      });
    } else if (analysis.overallScore > 0) {
      recommendations.push({
        type: 'moderate',
        title: 'Compatibilidade Moderada ⚖️',
        message: 'Há áreas de interesse comum. Foquem nos pontos positivos e respeitem as diferenças.'
      });
    } else {
      recommendations.push({
        type: 'moderate',
        title: 'Dados insuficientes',
        message: 'Não há práticas em comum respondidas pelos dois perfis para calcular compatibilidade ainda.'
      });
    }

    return recommendations;
  }

  getUniqueCategories(profile1, profile2) {
    const categories1 = profile1.respostas?.map(r => r.categoria) || [];
    const categories2 = profile2.respostas?.map(r => r.categoria) || [];
    return [...new Set([...categories1, ...categories2])];
  }

  saveComparison(profile1, profile2, analysis) {
    try {
      const comparison = {
        id: Date.now().toString(36),
        timestamp: new Date().toISOString(),
        profile1Summary: this.createProfileSummary(profile1),
        profile2Summary: this.createProfileSummary(profile2),
        analysis
      };

      const saved = JSON.parse(localStorage.getItem(this.COMPATIBILITY_STORAGE) || '[]');
      saved.push(comparison);

      if (saved.length > 10) saved.splice(0, saved.length - 10);
      localStorage.setItem(this.COMPATIBILITY_STORAGE, JSON.stringify(saved));

      return comparison.id;
    } catch (error) {
      console.error('Erro ao salvar comparação:', error);
      return null;
    }
  }

  createProfileSummary(profile) {
    return {
      posicao: profile.perfil?.posicao || 'N/A',
      experiencia: profile.perfil?.pratica || 'N/A',
      toleranciaDor: profile.perfil?.dor || 'N/A',
      totalRespostas: profile.respostas?.length || 0
    };
  }
}

// Instância global
const compatibilityAnalyzer = new CompatibilityAnalyzer();

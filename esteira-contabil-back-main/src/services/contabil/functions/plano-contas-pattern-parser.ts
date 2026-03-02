/**
 * Quebra a string 'code' em segmentos de acordo com o array 'pattern' (padrão de plano de contas),
 * onde cada elemento de 'pattern' representa quantos dígitos pertencem ao nível de conta correspondente
 *
 * Exemplo:
 *   pattern = [1,1,1,2,3]
 *   code    = "11101001"
 *   retorno = ["1", "1", "1", "01", "001"]
 */
export const patternParser = (
  code: string,
  pattern: number[]
): { segments: string[]; ds_classificacao: string } => {
  const segments: string[] = [];
  let index = 0;

  for (let i = 0; i < pattern.length; i++) {
    const segmentLength = pattern[i];
    // Se não tiver dígitos suficientes para o próximo nível, interrompe
    if (index + segmentLength > code.length) {
      break;
    }
    let segment = code.substring(index, index + segmentLength);
    // Se ocorrer de vier uma classificação incorreto, ele ajusta para o padrão enviado no pattern, adicionando 0 a esquerda
    if (segment.length < segmentLength) {
      segment = segment.padStart(segmentLength, '0');
    }
    segments.push(segment);
    index += segmentLength;
  }
  const ds_classificacao = segments.join('');
  return { segments, ds_classificacao };
};

/**
 * Retorna a string do "pai" removendo o último segmento do código.
 * Se houver apenas um (ou nenhum) segmento, retorna null para que ela não tenha pai
 *
 * Exemplo:
 *   pattern = [1,1,1,2,3]
 *   code    = "11101001"
 *   parseHierarchicalCode(code, pattern) = ["1", "1", "1", "01", "001"]
 *   Removendo o último nível => ["1", "1", "1", "01"]
 *   Retorno final = "11101"
 */
export const getClassPai = (
  code: string,
  pattern: number[]
): [string | null, number, string | null] => {
  const { segments, ds_classificacao } = patternParser(code, pattern);
  const nivel = segments.length;
  if (segments.length <= 1) {
    return [null, nivel, code];
  }
  segments.pop();
  return [segments.join(''), nivel, ds_classificacao];
};

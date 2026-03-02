/** Informações de UF: sigla → código IBGE */
export type UfIbgeMap = Record<
  | 'RO'
  | 'AC'
  | 'AM'
  | 'RR'
  | 'PA'
  | 'AP'
  | 'TO'
  | 'MA'
  | 'PI'
  | 'CE'
  | 'RN'
  | 'PB'
  | 'PE'
  | 'AL'
  | 'SE'
  | 'BA'
  | 'MG'
  | 'ES'
  | 'RJ'
  | 'SP'
  | 'PR'
  | 'SC'
  | 'RS'
  | 'MS'
  | 'MT'
  | 'GO'
  | 'DF',
  string
>;

export const UF_IBGE: UfIbgeMap = {
  RO: '11',
  AC: '12',
  AM: '13',
  RR: '14',
  PA: '15',
  AP: '16',
  TO: '17',
  MA: '21',
  PI: '22',
  CE: '23',
  RN: '24',
  PB: '25',
  PE: '26',
  AL: '27',
  SE: '28',
  BA: '29',
  MG: '31',
  ES: '32',
  RJ: '33',
  SP: '35',
  PR: '41',
  SC: '42',
  RS: '43',
  MS: '50',
  MT: '51',
  GO: '52',
  DF: '53',
};

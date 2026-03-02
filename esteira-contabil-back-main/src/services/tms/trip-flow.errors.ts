/**
 * Erro de regra de negócio do fluxo da viagem (esteira sequencial).
 * Controllers devem retornar HTTP 422 com a mensagem para o usuário.
 */
export class TripFlowRuleError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'TRIP_FLOW_RULE'
  ) {
    super(message);
    this.name = 'TripFlowRuleError';
    Object.setPrototypeOf(this, TripFlowRuleError.prototype);
  }
}

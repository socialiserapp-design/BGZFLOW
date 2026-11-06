// Only fixed categories may enter automatic diagnostics. Never retain provider
// response bodies, arbitrary exceptions, request text or credentials here.
const internal=new Set([
 'routing-cancelled-or-timed-out','routing-call-budget-reached',
 'malformed-routing-response','out-of-catalogue-routing-response',
 'complete-procedure-comparison-too-large','complete-winner-comparison-too-large',
 'comparison-did-not-reduce','invalid-execution-strategy',
 'unavailable-model-selected','invalid-complement-selection',
]);
const external=new Set(['provider-request-rejected','provider-authentication','provider-rate-limit','provider-connection','method-file-unavailable','selection-error']);
export const validRoutingFailure=value=>typeof value==='string'&&(internal.has(value)||external.has(value));
export function routingFailure(error){
 if(internal.has(error?.message))return error.message;
 if(error?.name==='BadRequestError')return 'provider-request-rejected';
 if(error?.name==='AuthenticationError')return 'provider-authentication';
 if(error?.name==='RateLimitError')return 'provider-rate-limit';
 if(error?.name==='APIConnectionError')return 'provider-connection';
 if(error?.code==='ENOENT')return 'method-file-unavailable';
 return 'selection-error';
}

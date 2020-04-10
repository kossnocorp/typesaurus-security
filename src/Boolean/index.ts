import { SecurityRule, SecurityRuleOr, SecurityRuleNot, proxy } from '..'

export function not(rule: SecurityRule<any>): SecurityRuleNot {
  return ['not', rule]
}

export function or(
  rulesA: SecurityRule<any>[],
  rulesB: SecurityRule<any>[]
): SecurityRuleOr {
  return ['or', rulesA, rulesB]
}

/**
 * Converts strings to booleans.
 * @param str
 * @returns expression proxy
 */
export function bool(str: string) {
  return proxy<(str: string) => boolean>(`bool(${JSON.stringify(str)})`)
}

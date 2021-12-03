import { Collection } from 'typesaurus'

export * from './Boolean'

/**
 * List type represents the Firebase's List
 * https://firebase.google.com/docs/reference/rules/rules.List
 *
 * | Firebase | Typesaurus     | Description                                         |
 * |----------|----------------|-----------------------------------------------------|
 * | x == y   | equal(x, y)    | Compare lists x and y                               |
 * | x[i]     | x[i]           | Index operator, get value index i                   |
 * | x[i:j]   | range(x, y)    | TODO: Range operator, get sublist from index i to j |
 * | v in x   | includes(x, v) | Check if value v exists in list x                   |
 */
export type List<Item> = {
  [index: number]: Item

  /**
   * Determine whether the list contains all elements in another list.
   * https://firebase.google.com/docs/reference/rules/rules.List#hasAll
   */
  hasAll: (keys: Item[]) => boolean

  /**
   * Determine whether the list contains any element in another list.
   * https://firebase.google.com/docs/reference/rules/rules.List#hasAny
   */
  hasAny: (keys: Item[]) => boolean

  /**
   * Determine whether all elements in the list are present in another list.
   * https://firebase.google.com/docs/reference/rules/rules.List#hasAny
   */
  hasOnly: (keys: Item[]) => boolean

  /**
   * Join the elements in the list into a string, with a separator.
   * https://firebase.google.com/docs/reference/rules/rules.List#join
   */
  join: (separator: string) => string

  /**
   * Get the number of values in the list.
   * https://firebase.google.com/docs/reference/rules/rules.List#size
   */
  size: () => number
}

/**
 * Map type, used for simple key-value mappings.
 * https://firebase.google.com/docs/reference/rules/rules.Map
 *
 * | Firebase | Typesaurus     | Description                                         |
 * |----------|----------------|-----------------------------------------------------|
 * | x == y   | equal(x, y)    | Compare maps x and y                                |
 * | x[k]     | x[k]           | Index operator, get value at key name k             |
 * | x.k      | range(x, y)    | Get value at key name k                             |
 * | k in x   | includes(x, k) | Check if key k exists in map x                      |
 */
export type Map<MapSource extends object> = {
  [FieldName in keyof MapSource]: MapSource[FieldName] extends Array<infer Item>
    ? List<Item>
    : MapSource[FieldName] extends object
    ? Map<MapSource[FieldName]>
    : MapSource[FieldName]
} & {
  /**
   * Returns the value associated with a given search key string.
   * https://firebase.google.com/docs/reference/rules/rules.Map#get
   */
  get: <MapKey extends keyof MapSource>(
    key: MapKey,
    defaultValue: MapSource[MapKey]
  ) => MapSource[MapKey]

  /**
   * Get the list of keys in the map.
   * https://firebase.google.com/docs/reference/rules/rules.Map#keys
   */
  keys: () => List<keyof MapSource>

  /**
   * Get the number of entries in the map.
   * https://firebase.google.com/docs/reference/rules/rules.Map#size
   */
  size: () => number

  /**
   * Get the list of values in the map.
   * https://firebase.google.com/docs/reference/rules/rules.Map#values
   */
  values: () => any // TODO?
}

export type Resource<Model extends object> = {
  data: Map<Model>
}

export function resource<Model extends object>(
  initialPath: string
): Resource<Model> {
  return proxy<Resource<Model>>(initialPath)
}

export function proxy<Type>(path: string, data: any = {}): Type {
  return new Proxy(
    Object.assign(() => {}, data),
    {
      apply(target, thisArg, argumentsList) {
        return proxy<any>(`${path}(${argumentsList.map(resolve).join(', ')})`)
      },

      get(target, prop, receiver) {
        if (prop === '__resolve__') return path
        const propStr = prop.toString()
        const propPath = /^\d+$/.test(propStr) ? `[${propStr}]` : `.${propStr}`
        return proxy<any>(`${path}${propPath}`)
      },

      has(target, key) {
        return key === '__resolve__'
      }
    }
  ) as Type
}

export function resolve(value: any): string {
  if (value && typeof value === 'function' && '__resolve__' in value) {
    return value.__resolve__
  } else if (Array.isArray(value)) {
    return `[${value.map(resolve).join(', ')}]`
  } else if (value && typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([k, v]) => `${k}: ${resolve(v)}`)
      .join(', ')} }`
  } else {
    return JSON.stringify(value === undefined ? null : value)
  }
}

export type RulesType = 'list' | 'map' | 'string'

export type SecurityRule<_Model> =
  | SecurityRuleEqual<any>
  | SecurityRuleNotEqual<any>
  | SecurityRuleLess
  | SecurityRuleLessOrEqual
  | SecurityRuleMore
  | SecurityRuleMoreOrEqual
  | SecurityRuleIncludes<any>
  | SecurityRuleIs
  | SecurityRuleNot
  | SecurityRuleOr
  | SecurityRuleAnd
  | boolean
  | null
  | undefined

export type SecurityRuleEqual<Type> = ['==', Type | string, Type | string]

export type SecurityRuleNotEqual<Type> = ['!=', Type | string, Type | string]

export type SecurityRuleLess = ['<', number | string, number | string]

export type SecurityRuleLessOrEqual = ['<=', number | string, number | string]

export type SecurityRuleMore = ['>', number | string, number | string]

export type SecurityRuleMoreOrEqual = ['>=', number | string, number | string]

export type SecurityRuleIncludes<Type> = ['in', string, Type | string]

export type SecurityRuleIs = ['is', string, string]

export type SecurityRuleNot = ['not', SecurityRule<any> | string]

export type SecurityRuleOr = [
  'or',
  SecurityRule<any>[],
  SecurityRule<any>[],
  ...SecurityRule<any>[][]
]

export type SecurityRuleAnd = [
  'and',
  SecurityRule<any>[],
  SecurityRule<any>[],
  ...SecurityRule<any>[][]
]

export function equal<Type>(a: Type, b: Type): SecurityRuleEqual<Type> {
  return ['==', resolve(a), resolve(b)]
}

export function notEqual<Type>(a: Type, b: Type): SecurityRuleNotEqual<Type> {
  return ['!=', resolve(a), resolve(b)]
}

export function less(a: number, b: number): SecurityRuleLess {
  return ['<', resolve(a), resolve(b)]
}

export function lessOrEqual(a: number, b: number): SecurityRuleLessOrEqual {
  return ['<=', resolve(a), resolve(b)]
}

export function more(a: number, b: number): SecurityRuleMore {
  return ['>', resolve(a), resolve(b)]
}

export function moreOrEqual(a: number, b: number): SecurityRuleMoreOrEqual {
  return ['>=', resolve(a), resolve(b)]
}

export function includes<Type, CompareType extends Type | undefined | null>(
  array: List<Type>,
  item: CompareType
): SecurityRuleIncludes<Type>

export function includes<Type extends object>(
  array: Map<Type>,
  item: keyof Type
): SecurityRuleIncludes<Type>

export function includes<Type extends object>(
  array: List<Type> | Map<Type>,
  item: Type | keyof Type
): SecurityRuleIncludes<Type> {
  return ['in', resolve(array), resolve(item)]
}

export function is<Type>(value: Type, type: RulesType): SecurityRuleIs {
  return ['is', resolve(value), type]
}

export function not(value: any): SecurityRuleNot {
  return ['not', isRule(value) ? value : resolve(value)]
}

export function or(
  rulesA: SecurityRule<any> | SecurityRule<any>[],
  rulesB: SecurityRule<any> | SecurityRule<any>[],
  ...restRules: (SecurityRule<any> | SecurityRule<any>[])[]
): SecurityRuleOr {
  return [
    'or',
    normalizeRules(rulesA),
    normalizeRules(rulesB),
    ...restRules.map(normalizeRules)
  ]
}

export function and(
  rulesA: SecurityRule<any> | SecurityRule<any>[],
  rulesB: SecurityRule<any> | SecurityRule<any>[],
  ...restRules: (SecurityRule<any> | SecurityRule<any>[])[]
): SecurityRuleAnd {
  return [
    'and',
    normalizeRules(rulesA),
    normalizeRules(rulesB),
    ...restRules.map(normalizeRules)
  ]
}

function normalizeRules(
  rules: SecurityRule<any> | SecurityRule<any>[]
): SecurityRule<any>[] {
  return isRuleOrRules(rules) ? [rules] : rules
}

function isRuleOrRules(
  maybeRule: SecurityRule<any> | SecurityRule<any>[]
): maybeRule is SecurityRule<any> {
  return !Array.isArray(maybeRule) || typeof maybeRule[0] === 'string'
}

function isRule(maybeRule: any): maybeRule is SecurityRule<any> {
  return (
    maybeRule == null ||
    typeof maybeRule === 'boolean' ||
    (Array.isArray(maybeRule) && typeof maybeRule[0] === 'string')
  )
}

export function get<Model extends object>(
  collection: Collection<Model>,
  id: any
): Resource<Model> {
  const idComponent = typeof id === 'string' ? id : `$(${resolve(id)})`
  return resource<Model>(
    `get(/databases/$(database)/documents/${collection.path}/${idComponent})`
  )
}

export type Request<Model extends object> = {
  auth: Auth
  resource: Resource<Model>
  writeFields: List<keyof Model>
}

type Auth =
  | {
      uid: string
    }
  | {
      uid: null
    }

export type Rules<Model> = {
  [ruleTypes: string]: SecurityRule<Model>[]
}

export type CollectionSecurityRules<Model> = {
  collection: Collection<Model>
  rules: Rules<Model>
}

export function secure<Model extends object>(
  collection: Collection<Model>,
  rules: Rules<Model>[]
): CollectionSecurityRules<Model> {
  const allRules = rules.reduce(
    (allRules, rules) => Object.assign(allRules, rules),
    {} as Rules<Model>
  )
  return { collection, rules: allRules }
}

export type RuleType =
  | 'read'
  | 'get'
  | 'list'
  | 'write'
  | 'create'
  | 'update'
  | 'delete'

export type RuleContext<Model extends object> = {
  request: Request<Model>
  resource: Resource<Model>
  resourceId: string
}

export type RuleResolver<Model extends object> = (
  context: RuleContext<Model>
) => SecurityRule<Model>[]

export function context<Model extends object>() {
  const request = proxy<Request<Model>>('request')
  const rulesResource = resource<Model>('resource')
  return {
    request,
    resource: rulesResource,
    resourceId: proxy<string>('resourceId')
  }
}

export function rule<Model extends object>(
  ruleTypes: RuleType | RuleType[],
  resolver: RuleResolver<Model>
): Rules<Model> {
  const request = proxy<Request<Model>>('request')
  const rulesResource = resource<Model>('resource')
  return {
    [([] as RuleType[]).concat(ruleTypes).join(', ')]: resolver({
      request,
      resource: rulesResource,
      resourceId: proxy<string>('resourceId')
    })
  }
}

export function stringifyRule(rule: SecurityRule<any>): string {
  if (typeof rule === 'boolean') return rule.toString()
  if (rule == null) return 'null'

  switch (rule[0]) {
    case '==':
    case '!=':
    case '<':
    case '<=':
    case '>':
    case '>=':
    case 'is':
      return `${rule[1]} ${rule[0]} ${rule[2]}`

    case 'in':
      return `${rule[2]} in ${rule[1]}`

    case 'not':
      return `!(${isRule(rule[1]) ? stringifyRule(rule[1]) : rule[1]})`

    case 'or': {
      const [_, ...conditions] = rule
      return `(${conditions.map(stringifyRules).join(' || ')})`
    }

    case 'and': {
      const [_, ...conditions] = rule
      return `(${conditions.map(stringifyRules).join(' && ')})`
    }
  }

  // It's ok, the code is actually used because of proxies that pretend to be
  // booleans and other types.
  return resolve(rule)
}

export function stringifyRules(rules: SecurityRule<any>[]) {
  const result = rules.map(stringifyRule).join(' && ')

  if (rules.length > 1) {
    return `(${result})`
  } else {
    return result
  }
}

export function stringifyCollectionRules<Model>({
  collection,
  rules
}: CollectionSecurityRules<Model>): string {
  const allows = Object.entries(rules).map(
    ([ruleTypes, securityRules]) =>
      `allow ${ruleTypes}: if ${stringifyRules(securityRules)}`
  )
  return `
match /${collection.path}/{resourceId} {
${allows.map(str => indent(str)).join('\n\n')}
}
`.trim()
}

export function stringifyDatabaseRules(
  rules: CollectionSecurityRules<any>[]
): string {
  return `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
${rules
  .map(stringifyCollectionRules)
  .map(str => indentAll(str, 2))
  .join('\n\n')}
  }
}
`.trim()
}

function indentAll(str: string, indentSize: number = 1) {
  return str
    .split('\n')
    .map(str => indent(str, indentSize))
    .join('\n')
}

function indent(str: string, indentSize: number = 1) {
  return str ? new Array(indentSize).fill('  ').join('') + str : str
}

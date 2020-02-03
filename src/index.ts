import { Collection } from 'typesaurus'

export function generateRulesAST() {}

export type List<Item, ListSource extends Array<Item>> = {
  [index: number]: Item
  size: () => number
  // TODO: Add the List properties
}

export type Map<MapSource extends object> = {
  [FieldName in keyof MapSource]: MapSource[FieldName] extends Array<infer Item>
    ? List<Item, MapSource[FieldName]>
    : MapSource[FieldName] extends Array<infer Item>
    ? Map<MapSource[FieldName]>
    : MapSource[FieldName]
  // TODO: Add the Map fields
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
  return new Proxy(Object.assign(() => {}, data), {
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
  }) as Type
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

export type SecurityRule =
  | SecurityRuleEqual<any>
  | SecurityRuleNotEqual<any>
  | SecurityRuleIncludes<any>
  | SecurityRuleIs

export type RulesType = 'list' | 'map'

export type SecurityRuleEqual<Type> = ['==', Type | string, Type | string]

export type SecurityRuleNotEqual<Type> = ['!=', Type | string, Type | string]

export type SecurityRuleIncludes<Type> = ['in', string, Type | string]

export type SecurityRuleIs = ['is', string, string]

export function equal<Type>(a: Type, b: Type): SecurityRuleEqual<Type> {
  return ['==', resolve(a), resolve(b)]
}

export function notEqual<Type>(a: Type, b: Type): SecurityRuleNotEqual<Type> {
  return ['!=', resolve(a), resolve(b)]
}

export function includes<Type>(
  array: List<Type, Array<Type>>,
  item: Type
): SecurityRuleIncludes<Type> {
  return ['in', resolve(array), resolve(item)]
}

export function is<Type>(value: Type, type: RulesType): SecurityRuleIs {
  return ['is', resolve(value), type]
}

export function get<Model extends object>(
  collection: Collection<Model>,
  id: any
): Resource<Model> | null {
  const idComponent = typeof id === 'string' ? id : `$(${resolve(id)})`
  return resource<Model>(
    `get(/databases/$(database)/documents/${collection.path}/${idComponent})`
  )
}

type CommonRequest<Model extends object> = {
  auth: Auth
  resource: Resource<Model>
}

export type ReadRequest<Model extends object> = CommonRequest<Model>

export type WriteRequest<Model extends object> = CommonRequest<Model>

export type RequestType = 'read' | 'write'

export function request<Model extends object>(type: 'read'): ReadRequest<Model>

export function request<Model extends object>(
  type: 'write'
): WriteRequest<Model>

export function request<Model extends object>(
  type: RequestType
): RequestType extends 'read' ? ReadRequest<Model> : WriteRequest<Model> {
  if (type === 'read') {
    return proxy<ReadRequest<Model>>('request')
  } else {
    return proxy<WriteRequest<Model>>('request')
  }
}

type SecurityRulesResolver<Model extends object> = {
  read?: ({
    request,
    resource
  }: {
    request: ReadRequest<Model>
    resource: Resource<Model>
  }) => SecurityRule[]

  write?: ({
    request,
    resource
  }: {
    request: WriteRequest<Model>
    resource: Resource<Model>
  }) => SecurityRule[]
}

type Auth =
  | {
      uid: string
    }
  | {
      uid: null
    }

export type CollectionSecurityRules<Model> = {
  collection: Collection<Model>
  read?: SecurityRule[]
  write?: SecurityRule[]
}

export function secure<Model extends object>(
  collection: Collection<Model>,
  rules: SecurityRulesResolver<Model> = {}
): CollectionSecurityRules<Model> {
  const securityRules: CollectionSecurityRules<Model> = { collection }
  const rulesResource = resource<Model>('resource')
  if (rules.read)
    securityRules.read = rules.read({
      request: request('read'),
      resource: rulesResource
    })
  if (rules.write)
    securityRules.write = rules.write({
      request: request('write'),
      resource: rulesResource
    })
  return securityRules
}

export function stringifyRule(rule: SecurityRule): string {
  switch (rule[0]) {
    case '==':
    case '!=':
    case 'is':
      return `${rule[1]} ${rule[0]} ${rule[2]}`

    case 'in':
      return `${rule[2]} in ${rule[1]}`
  }
}

export function stringifyRules(rules: SecurityRule[]) {
  return rules.map(stringifyRule).join(' && ')
}

export function stringifyCollectionRules<Model>(
  rules: CollectionSecurityRules<Model>
): string {
  const allows: string[] = []
  if (rules.read) allows.push(`allow read: if ${stringifyRules(rules.read)}`)
  if (rules.write) allows.push(`allow write: if ${stringifyRules(rules.write)}`)
  return `
match /${rules.collection.path}/{resourceId} {
${allows.map(str => indent(str)).join('\n')}
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
  return new Array(indentSize).fill('  ').join('') + str
}

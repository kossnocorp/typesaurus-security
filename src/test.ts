import {
  clearFirestoreData,
  initializeTestApp,
  loadFirestoreRules
} from '@firebase/rules-unit-testing'
import assert from 'assert'
import { add, collection, update } from 'typesaurus'
import { injectTestingAdaptor, setApp } from 'typesaurus/testing'
import {
  and,
  context,
  equal,
  get,
  includes,
  is,
  less,
  lessOrEqual,
  List,
  more,
  moreOrEqual,
  not,
  notEqual,
  or,
  proxy,
  Request,
  resolve,
  resource,
  Resource,
  rule,
  secure,
  stringifyCollectionRules,
  stringifyDatabaseRules,
  stringifyRule,
  stringifyRules
} from '.'

const projectId = 'project-id'

injectTestingAdaptor(initializeTestApp({ projectId }))

function loginUser(uid: string) {
  setApp(initializeTestApp({ projectId, auth: { uid } }))
}

function logoutUser() {
  setApp(initializeTestApp({ projectId, auth: null }))
}

type User = {
  firstName: string
  lastName?: string
}

type Account = {
  ownerId: string
  memberIds: string[]
}

type Project = {
  title: string
  accountId: string
}

type Todo = {
  projectId: string
  title: string
}

const users = collection<User>('users')
const accounts = collection<Account>('accounts')
const projects = collection<Project>('projects')
const todos = collection<Todo>('todos')

describe('resource', () => {
  it('creates resource proxy of given type', () => {
    const userResource = resource<User>('request.resource')
    assert(
      resolve(userResource.data.firstName),
      'request.resource.data.firstName'
    )
  })
})

describe('proxy', () => {
  it('generates proxy that returns the path on resolve', () => {
    const user = proxy<User>('blahblah')
    assert(resolve(user.firstName) === 'blahblah.firstName')
  })

  it('resolves numeric properties with []', () => {
    const account = proxy<Account>('account')
    assert(resolve(account.memberIds[0]) === 'account.memberIds[0]')
  })

  it('resolves function calls', () => {
    type Foo = { bar: () => string }
    const foo = proxy<Foo>('foo')
    assert(resolve(foo.bar()) === 'foo.bar()')
  })

  it('resolves arguments', () => {
    type Qwe = { asd: () => string; zxc: number }
    type Foo = { bar: (strs: any[], num: number) => string }
    const qwe = proxy<Qwe>('qwe')
    const foo = proxy<Foo>('foo')
    assert(
      resolve(foo.bar([true, 1, 'two', qwe.asd()], qwe.zxc)) ===
        'foo.bar([true, 1, "two", qwe.asd()], qwe.zxc)'
    )
  })
})

describe('resolve', () => {
  it('stringifies primitives', () => {
    assert(resolve(1) === '1')
    assert(resolve(1.5) === '1.5')
    assert(resolve(true) === 'true')
    assert(resolve(null) === 'null')
    assert(resolve('hello') === '"hello"')
  })

  it('stringifies undefined as null', () => {
    assert(resolve(undefined) === 'null')
  })

  it('stringifies arrays', () => {
    assert(resolve([1, 'two', true, null]) === '[1, "two", true, null]')
  })

  it('stringifies objects', () => {
    assert(
      resolve({ a: 1, b: 'two', c: true, d: null }) ===
        '{ a: 1, b: "two", c: true, d: null }'
    )
  })

  it('deeply resolves arrays', () => {
    type Foo = { bar: () => string }
    const foo = proxy<Foo>('foo')
    assert(resolve([1, [2, [foo.bar()]]]) === '[1, [2, [foo.bar()]]]')
  })

  it('deeply resolves objects', () => {
    type Foo = { bar: () => string }
    const foo = proxy<Foo>('foo')
    assert(
      resolve({ a: 1, b: { c: 2, d: foo.bar() } }) ===
        '{ a: 1, b: { c: 2, d: foo.bar() } }'
    )
  })
})

describe('equal', () => {
  it('returns AST for ==', () => {
    assert.deepEqual(equal(1, 2), ['==', 1, 2])
  })

  it('resolves proxies', () => {
    const userResource = resource<User>('request.resource')
    const result = equal(userResource.data.firstName, 'Sasha')
    assert.deepEqual(result, [
      '==',
      'request.resource.data.firstName',
      '"Sasha"'
    ])
  })

  it('allows to pass undefined and null', () => {
    assert.deepEqual(equal(1, undefined), ['==', 1, 'null'])
  })
})

describe('notEqual', () => {
  it('returns AST for !=', () => {
    assert.deepEqual(notEqual(1, 2), ['!=', '1', '2'])
  })

  it('resolves proxies', () => {
    const userResource = resource<User>('request.resource')
    const result = notEqual(userResource.data.firstName, 'Sasha')
    assert.deepEqual(result, [
      '!=',
      'request.resource.data.firstName',
      '"Sasha"'
    ])
  })
})

describe('less', () => {
  it('returns AST for !=', () => {
    assert.deepEqual(less(1, 2), ['<', '1', '2'])
  })

  it('resolves proxies', () => {
    type Bill = { amount: number }
    const bill = proxy<Bill>('bill')
    const result = less(bill.amount, 14)
    assert.deepEqual(result, ['<', 'bill.amount', '14'])
  })
})

describe('lessOrEqual', () => {
  it('returns AST for !=', () => {
    assert.deepEqual(lessOrEqual(1, 2), ['<=', '1', '2'])
  })

  it('resolves proxies', () => {
    type Bill = { amount: number }
    const bill = proxy<Bill>('bill')
    const result = lessOrEqual(bill.amount, 14)
    assert.deepEqual(result, ['<=', 'bill.amount', '14'])
  })
})

describe('more', () => {
  it('returns AST for !=', () => {
    assert.deepEqual(more(1, 2), ['>', '1', '2'])
  })

  it('resolves proxies', () => {
    type Bill = { amount: number }
    const bill = proxy<Bill>('bill')
    const result = more(bill.amount, 14)
    assert.deepEqual(result, ['>', 'bill.amount', '14'])
  })
})

describe('moreOrEqual', () => {
  it('returns AST for !=', () => {
    assert.deepEqual(moreOrEqual(1, 2), ['>=', '1', '2'])
  })

  it('resolves proxies', () => {
    type Bill = { amount: number }
    const bill = proxy<Bill>('bill')
    const result = moreOrEqual(bill.amount, 14)
    assert.deepEqual(result, ['>=', 'bill.amount', '14'])
  })
})

describe('includes', () => {
  it('returns AST for in', () => {
    const accountResource = resource<Account>('request.resource')
    const result = includes(accountResource.data.memberIds, '123')
    assert.deepEqual(result, ['in', 'request.resource.data.memberIds', '"123"'])
  })

  it('allows to search for optional values', () => {
    const accountResource = resource<Account>('request.resource')
    const result = includes(
      accountResource.data.memberIds,
      '123' as string | null | undefined
    )
    assert.deepEqual(result, ['in', 'request.resource.data.memberIds', '"123"'])
  })
})

describe('describe', () => {
  it('generates AST for is', () => {
    const accountResource = resource<Account>('request.resource')
    const result = is(accountResource.data.memberIds, 'list')
    assert.deepEqual(result, ['is', 'request.resource.data.memberIds', 'list'])
  })
})

describe('not', () => {
  it('generates AST for not', () => {
    const accountResource = resource<Account>('request.resource')
    const result = not(is(accountResource.data.memberIds, 'list'))
    assert.deepEqual(result, [
      'not',
      ['is', 'request.resource.data.memberIds', 'list']
    ])
  })

  it('resolves values', () => {
    const userResource = resource<User>('request.resource')
    const result = not(userResource.data.lastName)
    assert.deepEqual(result, ['not', 'request.resource.data.lastName'])
  })

  it('allows to pass null and undefined', () => {
    const result = not(true as boolean | null | undefined)
    assert.deepEqual(result, ['not', true])
  })
})

describe('or', () => {
  it('generates AST for or', () => {
    const accountResource = resource<Account>('request.resource')
    const result = or(
      [not(is(accountResource.data.memberIds, 'list'))],
      [includes(accountResource.data.memberIds, '123')]
    )
    assert.deepEqual(result, [
      'or',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']]
    ])
  })

  it('allows to pass more than two items', () => {
    const accountResource = resource<Account>('request.resource')
    const result = or(
      [not(is(accountResource.data.memberIds, 'list'))],
      [includes(accountResource.data.memberIds, '123')],
      [equal(1, 1)]
    )
    assert.deepEqual(result, [
      'or',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']],
      [['==', 1, 1]]
    ])
  })

  it('normalizes rules', () => {
    const accountResource = resource<Account>('request.resource')
    const result = or(
      not(is(accountResource.data.memberIds, 'list')),
      [includes(accountResource.data.memberIds, '123')],
      equal(1, 1)
    )
    assert.deepEqual(result, [
      'or',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']],
      [['==', 1, 1]]
    ])
  })
})

describe('and', () => {
  it('generates AST for and', () => {
    const accountResource = resource<Account>('request.resource')
    const result = and(
      [not(is(accountResource.data.memberIds, 'list'))],
      [includes(accountResource.data.memberIds, '123')]
    )
    assert.deepEqual(result, [
      'and',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']]
    ])
  })

  it('allows to pass more than two items', () => {
    const accountResource = resource<Account>('request.resource')
    const result = and(
      [not(is(accountResource.data.memberIds, 'list'))],
      [includes(accountResource.data.memberIds, '123')],
      [equal(1, 1)]
    )
    assert.deepEqual(result, [
      'and',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']],
      [['==', 1, 1]]
    ])
  })

  it('normalizes rules', () => {
    const accountResource = resource<Account>('request.resource')
    const result = and(
      not(is(accountResource.data.memberIds, 'list')),
      [includes(accountResource.data.memberIds, '123')],
      equal(1, 1)
    )
    assert.deepEqual(result, [
      'and',
      [['not', ['is', 'request.resource.data.memberIds', 'list']]],
      [['in', 'request.resource.data.memberIds', '"123"']],
      [['==', 1, 1]]
    ])
  })
})

describe('get', () => {
  it('generates proxy for get result', () => {
    const owner = get(users, '123')
    assert(resolve(owner) === 'get(/databases/$(database)/documents/users/123)')
    assert(
      resolve(owner.data.firstName) ===
        'get(/databases/$(database)/documents/users/123).data.firstName'
    )
  })

  it('resolves proxy arguments', () => {
    const accountResource = resource<Account>('request.resource')
    const owner = get(users, accountResource.data.ownerId)
    assert(
      resolve(owner.data.firstName) ===
        'get(/databases/$(database)/documents/users/$(request.resource.data.ownerId)).data.firstName'
    )
  })
})

describe('context', () => {
  it('includes request', () => {
    type Model = { foo: string; bar: number }
    const { request } = context<Model>()
    assertType<string | null>(request.auth.uid)
    assertType<Model>(request.resource.data)
    assertType<List<'foo' | 'bar'>>(request.writeFields)
  })

  it('includes resource', () => {
    type Model = { foo: string; bar: number }
    const { resource } = context<Model>()
    assertType<Model>(resource.data)
  })

  it('includes resourceId', () => {
    const { resourceId } = context()
    assertType<string>(resourceId)
  })
})

function assertType<Type>(_: Type) {}

const usersRules = secure(users, [
  rule(['read', 'write'], ({ request, resourceId }) => {
    return [equal(request.auth.uid, resourceId)]
  }),

  rule('write', ({ request, resourceId }) => {
    return [
      isAuthenticated(request),
      equal(resourceId, request.auth.uid),
      or(
        [not(includes(request.resource.data, 'firstName'))],
        [is(request.resource.data.firstName, 'string')]
      )
    ]
  })
])

const accountsRules = secure(accounts, [
  rule('read', ({ request, resource }) => {
    return [
      isAuthenticated(request),
      includes(resource.data.memberIds, request.auth.uid)
    ]
  }),

  rule('create', ({ request }) => accountWriteRules(request, request.resource)),

  rule('update', ({ request, resource }) =>
    accountWriteRules(request, resource)
  )
])

function accountWriteRules(
  request: Request<Account>,
  resource: Resource<Account>
) {
  return [
    isAuthenticated(request),
    equal(resource.data.ownerId, request.auth.uid),
    is(resource.data.memberIds, 'list'),
    equal(resource.data.memberIds.size(), 1),
    equal(resource.data.memberIds[0], request.auth.uid)
  ]
}

const projectsRules = secure(projects, [
  rule('read', ({ resource, request }) => {
    const account = get(accounts, resource.data.accountId)
    return [
      isAuthenticated(request),
      includes(account.data.memberIds, request.auth.uid)
    ]
  }),

  rule('create', ({ request }) =>
    projectWriteRules(request, request.resource.data.accountId)
  ),

  rule('update', ({ request, resource }) =>
    projectWriteRules(request, resource.data.accountId)
  )
])

function projectWriteRules(request: Request<Project>, accountId: string) {
  const account = get(accounts, accountId)
  return [
    isAuthenticated(request),
    includes(account.data.memberIds, request.auth.uid),
    is(request.resource.data.title, 'string')
  ]
}

const todosRules = secure(todos, [
  rule('read', ({ request, resource }) => {
    const project = get(projects, resource.data.projectId)
    const account = get(accounts, project.data.accountId)
    return [isAuthenticated(request), isMemberOf(request, account)]
  }),

  rule('create', ({ request }) => projectTodoRules(request, request.resource)),

  rule('update', ({ request, resource }) => projectTodoRules(request, resource))
])

function projectTodoRules(request: Request<Todo>, resource: Resource<Todo>) {
  const project = get(projects, resource.data.projectId)
  const account = get(accounts, project.data.accountId)
  return [
    isAuthenticated(request),
    isMemberOf(request, account),
    is(resource.data.title, 'string')
  ]
}

function isMemberOf(request: Request<any>, account: Resource<Account>) {
  return includes(account.data.memberIds, request.auth.uid)
}

function isAuthenticated(request: Request<any>) {
  return notEqual(request.auth.uid, null)
}

describe('secure', () => {
  it('generates security rules', () => {
    expect(todosRules).toMatchSnapshot()
  })
})

describe('stringifyRule', () => {
  it('stringifies booleans', () => {
    assert(stringifyRule(true) === 'true')
    assert(stringifyRule(false) === 'false')
  })

  it('stringifies equal rule', () => {
    assert(stringifyRule(['==', '1', '2']) === '1 == 2')
  })

  it('stringifies not equal rule', () => {
    assert(stringifyRule(['!=', '1', '2']) === '1 != 2')
  })

  it('stringifies less rule', () => {
    assert(stringifyRule(['<', '1', '2']) === '1 < 2')
  })

  it('stringifies less or equal rule', () => {
    assert(stringifyRule(['<=', '1', '2']) === '1 <= 2')
  })

  it('stringifies more rule', () => {
    assert(stringifyRule(['>', '1', '2']) === '1 > 2')
  })

  it('stringifies more or equal rule', () => {
    assert(stringifyRule(['>=', '1', '2']) === '1 >= 2')
  })

  it('stringifies includes rule', () => {
    assert(stringifyRule(['in', '[1, 2, 3]', '1']) === '1 in [1, 2, 3]')
  })

  it('stringifies is rule', () => {
    assert(
      stringifyRule(['is', 'request.resource.data.memberIds', 'list']) ===
        'request.resource.data.memberIds is list'
    )
  })
})

describe('stringifyRules', () => {
  it('stringifies rules and concatenates them with &&', () => {
    assert(
      stringifyRules([
        ['!=', '1', '2'],
        ['in', '[1, 2, 3]', '1']
      ]) === '(1 != 2 && 1 in [1, 2, 3])'
    )
  })

  it('does not wrap single rules in parentheses', () => {
    assert(stringifyRules([['!=', '1', '2']]) === '1 != 2')
  })
})

describe('stringifyCollectionRules', () => {
  it('stringifies collection security rules', () => {
    expect(stringifyCollectionRules(todosRules)).toMatchSnapshot()
  })
})

describe('stringifyDatabaseRules', () => {
  it('stringifies database security rules', () => {
    expect(
      stringifyDatabaseRules([
        usersRules,
        accountsRules,
        projectsRules,
        todosRules
      ])
    ).toMatchSnapshot()
  })

  describe('when the rules are loaded into the Firestore', () => {
    beforeEach(async () => {
      await loadFirestoreRules({
        projectId: 'project-id',
        rules: stringifyDatabaseRules([
          accountsRules,
          projectsRules,
          todosRules
        ])
      })
    })

    afterEach(async () => {
      await clearFirestoreData({ projectId: 'project-id' })
    })

    it('generates working security rules', async () => {
      loginUser('owner-id')
      await expect(
        add(accounts, {
          ownerId: 'wrong-id',
          memberIds: ['wrong-id']
        })
      ).rejects.toMatchSnapshot('Adding an account with a wrong id')
      const account = await add(accounts, {
        ownerId: 'owner-id',
        memberIds: ['owner-id']
      })
      await expect(
        update(account, {
          ownerId: 'owner-id',
          memberIds: ['owner-id']
        })
      )

      await expect(
        add(projects, {
          // @ts-ignore
          title: false,
          accountId: account.id
        })
      ).rejects.toMatchSnapshot('Adding a project with a wrong payload')
      const project = await add(projects, {
        title: 'Demo project',
        accountId: account.id
      })

      const todo = await add(todos, {
        title: 'Hello, world!',
        projectId: project.id
      })
      await update(todo, {
        title: 'Hello, cruel world!'
      })

      loginUser('another-id')
      const anotherAccount = await add(accounts, {
        ownerId: 'another-id',
        memberIds: ['another-id']
      })
      const anotherProject = await add(projects, {
        title: 'Demo project',
        accountId: anotherAccount.id
      })

      await expect(
        update(account, {
          ownerId: 'another-id',
          memberIds: ['another-id']
        })
      ).rejects.toMatchSnapshot(
        'Updating an account not belonging to the current user'
      )

      await expect(
        add(todos, {
          title: 'Hello, world!',
          projectId: project.id
        })
      ).rejects.toMatchSnapshot('Adding a todo to a wrong project')

      await expect(
        update(todo, {
          projectId: anotherProject.id
        })
      ).rejects.toMatchSnapshot(
        'Updating a todo not belonging to the current user'
      )

      await expect(
        update(project, {
          accountId: anotherAccount.id
        })
      ).rejects.toMatchSnapshot(
        'Updating a project not belonging to the current user'
      )
    })
  })
})

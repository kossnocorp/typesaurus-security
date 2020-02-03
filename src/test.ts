import assert from 'assert'
import * as testing from '@firebase/testing'
import {
  equal,
  notEqual,
  resolve,
  resource,
  includes,
  get,
  secure,
  request,
  stringifyCollectionRules,
  stringifyRule,
  stringifyRules,
  stringifyDatabaseRules,
  is,
  proxy
} from '.'
import { collection, set, add } from 'typesaurus'
import { injectTestingAdaptor, app } from 'typesaurus/testing'

injectTestingAdaptor()

type User = {
  firstName: string
  lastName?: string
}

type Account = {
  ownerId: string
  memberIds: string[]
}

type Project = {
  accountId: string
}

type Todo = {
  projectId: string
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

describe('includes', () => {
  it('returns AST for in', () => {
    const accountResource = resource<Account>('request.resource')
    const result = includes(accountResource.data.memberIds, '123')
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

describe('request', () => {
  describe('read', () => {
    it('generates read request proxy', () => {
      const readRequest = request('read')
      assert(resolve(readRequest) === 'request')
      assert(resolve(readRequest.auth) === 'request.auth')
      assert(resolve(readRequest.auth.uid) === 'request.auth.uid')
    })
  })
})

const accountRules = secure(accounts, {
  write: ({ request, resource }) => {
    return [
      notEqual(request.auth.uid, null),
      equal(request.resource.data.ownerId, request.auth.uid),
      is(request.resource.data.memberIds, 'list'),
      equal(request.resource.data.memberIds.size(), 1),
      equal(request.resource.data.memberIds[0], request.auth.uid)
    ]
  }
})

const todoRules = secure(todos, {
  read: ({ request, resource }) => {
    const project = get(projects, resource.data.projectId)
    const account = get(accounts, project.data.accountId)
    return [
      notEqual(request.auth.uid, null),
      includes(account.data.memberIds, request.auth.uid)
    ]
  }
})

describe('secure', () => {
  it('generates security rules', () => {
    assert.deepEqual(todoRules, {
      collection: todos,
      read: [
        ['!=', 'request.auth.uid', 'null'],
        [
          'in',
          'get(/databases/$(database)/documents/accounts/$(get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.accountId)).data.memberIds',
          'request.auth.uid'
        ]
      ]
    })
  })
})

describe('stringifyRule', () => {
  it('stringifies equal rule', () => {
    assert(stringifyRule(['==', '1', '2']) === '1 == 2')
  })

  it('stringifies not equal rule', () => {
    assert(stringifyRule(['!=', '1', '2']) === '1 != 2')
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
      stringifyRules([['!=', '1', '2'], ['in', '[1, 2, 3]', '1']]) ===
        '1 != 2 && 1 in [1, 2, 3]'
    )
  })
})

describe('stringifyCollectionRules', () => {
  it('stringifies collection security rules', () => {
    assert(
      stringifyCollectionRules(todoRules) ==
        `
match /todos/{resourceId} {
  allow read: if request.auth.uid != null && request.auth.uid in get(/databases/$(database)/documents/accounts/$(get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.accountId)).data.memberIds
}
`.trim()
    )
  })
})

describe('stringifyDatabaseRules', () => {
  it('stringifies database security rules', () => {
    assert(
      stringifyDatabaseRules([accountRules, todoRules]) ==
        `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /accounts/{resourceId} {
      allow write: if request.auth.uid != null && request.resource.data.ownerId == request.auth.uid && request.resource.data.memberIds is list && request.resource.data.memberIds.size() == 1 && request.resource.data.memberIds[0] == request.auth.uid
    }

    match /todos/{resourceId} {
      allow read: if request.auth.uid != null && request.auth.uid in get(/databases/$(database)/documents/accounts/$(get(/databases/$(database)/documents/projects/$(resource.data.projectId)).data.accountId)).data.memberIds
    }
  }
}
`.trim()
    )
  })

  describe('when the rules are loaded into the Firestore', () => {
    beforeEach(async () => {
      await testing.loadFirestoreRules({
        projectId: 'project-id',
        rules: stringifyDatabaseRules([accountRules, todoRules])
      })
    })

    afterEach(async () => {
      await testing.clearFirestoreData({ projectId: 'project-id' })
    })

    it('generates working security rules', async () => {
      app('owner-id')
      const account = await add(accounts, {
        ownerId: 'owner-id',
        memberIds: ['owner-id']
      })
    })
  })
})

import assert from 'assert'
import { resource, is, includes, resolve } from '..'
import { not, or, bool } from '.'

type Account = {
  ownerId: string
  memberIds: string[]
}

describe('Boolean', () => {
  describe('not', () => {
    it('generates AST', () => {
      const accountResource = resource<Account>('request.resource')
      const result = not(is(accountResource.data.memberIds, 'list'))
      assert.deepEqual(result, [
        'not',
        ['is', 'request.resource.data.memberIds', 'list']
      ])
    })
  })

  describe('or', () => {
    it('generates AST', () => {
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
  })

  describe('bool', () => {
    it('renerates proxy', () => {
      assert(resolve(bool('true')), 'bool("true")')
    })
  })
})

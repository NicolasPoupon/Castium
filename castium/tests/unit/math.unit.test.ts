import { describe, expect, it } from 'vitest'
import { sum } from '@/utils/math'

describe('sum (unit test)', () => {
    it('additionne correctement deux nombres positifs', () => {
        expect(sum(2, 3)).toBe(5)
    })

    it('gère les nombres négatifs', () => {
        expect(sum(-2, 3)).toBe(1)
    })
})

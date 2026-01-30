import { describe, expect, it } from "vitest"
import { average, sum } from "@/utils/math"

describe("math utils (integration test)", () => {
    it("utilise sum pour calculer la moyenne sur plusieurs valeurs", () => {
        const values = [2, 4, 6]
        const total = values.reduce((acc, v) => sum(acc, v), 0)

        expect(total).toBe(12)
        expect(average(values)).toBe(4)
    })

    it("lève une erreur si on passe un tableau vide à average", () => {
        expect(() => average([])).toThrowError(/empty array/i)
    })
})

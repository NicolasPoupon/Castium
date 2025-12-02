export function sum(a: number, b: number): number {
    return a + b
}

export function average(values: number[]): number {
    if (values.length === 0) {
        throw new Error('Cannot compute average of empty array')
    }

    const total = values.reduce((acc, value) => sum(acc, value), 0)

    return total / values.length
}

export function toPaise(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Money value must be a non-negative number');
    return Math.round(amount * 100);
}

export function fromPaise(value) {
    const paise = Number(value);
    if (!Number.isInteger(paise) || paise < 0) throw new Error('Paise value must be a non-negative integer');
    return paise / 100;
}

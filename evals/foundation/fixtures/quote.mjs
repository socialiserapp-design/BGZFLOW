import { priceAfterDiscount } from './discount.mjs';
let text = ''; for await (const part of process.stdin) text += part;
const { items } = JSON.parse(text);
const lines = items.map(item => priceAfterDiscount(item.unitCents * item.quantity, item.discountPercent));
console.log(JSON.stringify({ lines, totalCents: lines.reduce((sum, cents) => sum + cents, 0) }));

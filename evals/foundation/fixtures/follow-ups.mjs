export const customers = [
  { id: 'customer-a', name: 'Aster Studio', lastContactDate: '2026-10-01', nextContactDate: null },
  { id: 'customer-b', name: 'Birch Workshop', lastContactDate: '2026-10-29', nextContactDate: '2026-11-03' },
];

// Existing feature: the owner manually chooses a customer and reminder text.
// No overdue rule or automatic reminder behaviour has been configured.
export function draftReminder(customerId, text) {
  return { customerId, text, status: 'draft' };
}

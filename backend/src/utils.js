export function makeBookingCode() {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EM-${stamp}-${random}`;
}

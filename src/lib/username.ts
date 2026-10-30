export const normalizeUsername = (value: string): string | null => {
  const username = value.trim().toLowerCase();
  return /^[a-z][a-z0-9_.]{2,29}$/.test(username) ? username : null;
};
export const internalEmail = (username: string) => username + "@accounts.stokly.invalid";
export const validPin = (pin: string) => /^[0-9]{8}$/.test(pin) &&
  !/^([0-9])\1{7}$/.test(pin) &&
  !["12345678","87654321","01234567","76543210"].includes(pin);

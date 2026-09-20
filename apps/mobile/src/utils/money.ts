export const formatMoney = (value: number, showCents = false) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);

export const formatMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const decimalIndex = cleaned.indexOf('.');
  const hasDecimal = decimalIndex >= 0;
  const wholeInput = hasDecimal ? cleaned.slice(0, decimalIndex) : cleaned;
  const fraction = hasDecimal ? cleaned.slice(decimalIndex + 1).replace(/\./g, '').slice(0, 2) : '';
  const whole = wholeInput.replace(/^0+(?=\d)/, '') || (hasDecimal ? '0' : '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return hasDecimal ? `${grouped}.${fraction}` : grouped;
};

export const parseMoneyInput = (value: string) => Number(value.replace(/,/g, '') || 0);

export const formatCurrency = (value) => {
    if (value === 0 || value === '0') return '0,00';
    if (!value) return '';

    const num = parseFloat(value);
    if (isNaN(num)) return '';

    let [integer, decimal] = num.toFixed(2).split('.');

    // Add thousands separators
    integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${integer},${decimal}`;
};

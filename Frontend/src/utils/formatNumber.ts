export const formatGujaratiNumber = (num: string | number | null | undefined, lang: string): string => {
  if (num === null || num === undefined) return '';
  const strNum = num.toString();
  
  if (!lang || !lang.startsWith('gu')) {
    return strNum;
  }

  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return strNum.replace(/[0-9]/g, (digit) => gujDigits[digit as any]);
};

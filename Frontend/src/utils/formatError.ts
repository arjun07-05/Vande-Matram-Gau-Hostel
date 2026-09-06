export const getErrorMessage = (error: any, defaultMsg: string = 'An error occurred'): string => {
  if (!error) return defaultMsg;
  if (typeof error === 'string') return error;

  const detail = error.response?.data?.detail ?? error.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item: any) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
        const msg = item.msg || JSON.stringify(item);
        return field && field !== 'body' ? `${field}: ${msg}` : msg;
      }
      return String(item);
    });
    return messages.filter(Boolean).join('\n') || defaultMsg;
  }

  if (detail && typeof detail === 'object') {
    if (detail.msg) return String(detail.msg);
    return JSON.stringify(detail);
  }

  if (error.response?.data?.message && typeof error.response.data.message === 'string') {
    return error.response.data.message;
  }

  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  return defaultMsg;
};

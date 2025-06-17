/**
 * Format currency with proper locale and currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = 'KES',
  locale: string = 'en-KE'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting if locale/currency is not supported
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
}

/**
 * Get currency symbol for a given currency code
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    KES: 'KSh ',
    USD: '$',
    EUR: '€',
    GBP: '£',
    UGX: 'USh ',
    TZS: 'TSh ',
  };
  return symbols[currency] || currency + ' ';
}

/**
 * Format date with relative time when recent
 */
export function formatDate(
  date: string | Date,
  options: {
    includeTime?: boolean;
    relative?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    includeTime = true,
    relative = true,
    locale = 'en-US'
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Show relative time for recent dates
  if (relative && diffMs >= 0) {
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    }
  }

  // Format absolute date
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return dateObj.toLocaleDateString(locale, formatOptions);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle Kenyan phone numbers
  if (digits.startsWith('254')) {
    const number = digits.slice(3);
    if (number.length === 9) {
      return `+254 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    }
  }
  
  // Handle other formats or return original if no specific format
  if (digits.length >= 10) {
    return `+${digits}`;
  }
  
  return phone;
}

/**
 * Format blockchain hash for display (shortened)
 */
export function formatBlockchainHash(hash: string, length: number = 8): string {
  if (!hash) return '';
  if (hash.length <= length * 2) return hash;
  
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format percentage for display
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Parse currency string to number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and spaces, keep only digits and decimal point
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check for Kenyan phone numbers (254 country code)
  if (digits.startsWith('254') && digits.length === 12) {
    return true;
  }
  
  // Check for local format (0xxx xxx xxx)
  if (digits.startsWith('0') && digits.length === 10) {
    return true;
  }
  
  // Check for international format (at least 10 digits)
  if (digits.length >= 10 && digits.length <= 15) {
    return true;
  }
  
  return false;
}

/**
 * Normalize phone number to international format
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Convert local Kenyan format to international
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  
  // Remove leading + if present
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  
  return digits;
}

/**
 * Format payment status for display
 */
export function formatPaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    quote_requested: 'Quote Requested',
    stk_initiated: 'STK Push Sent',
    stk_success: 'Payment Received',
    crypto_processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    refunded: 'Refunded',
  };
  
  return statusMap[status] || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get status color class for UI components
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-100',
    quote_requested: 'text-blue-600 bg-blue-100',
    stk_initiated: 'text-blue-600 bg-blue-100',
    stk_success: 'text-green-600 bg-green-100',
    crypto_processing: 'text-purple-600 bg-purple-100',
    completed: 'text-green-600 bg-green-100',
    failed: 'text-red-600 bg-red-100',
    refunded: 'text-gray-600 bg-gray-100',
    approved: 'text-blue-600 bg-blue-100',
    processing: 'text-purple-600 bg-purple-100',
    cancelled: 'text-gray-600 bg-gray-100',
  };
  
  return colorMap[status] || 'text-gray-600 bg-gray-100';
} 
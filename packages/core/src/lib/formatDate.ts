import { formatDistanceToNow, format, parseISO, isValid } from 'date-fns'

/**
 * Format a date string for user-friendly display
 * Shows relative time for recent dates, full date for older ones
 */
export function formatDisplayDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  
  try {
    // Handle both YYYY-MM-DD and ISO formats
    const date = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T00:00:00')
    
    if (!isValid(date)) return dateStr
    
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 7) {
      // Within last week: "2 days ago", "3 hours ago"
      // Remove "about" prefix for cleaner output
      return formatDistanceToNow(date, { addSuffix: true }).replace(/^about /, '')
    } else if (diffInDays < 365) {
      // Within last year: "Jan 15"
      return format(date, 'MMM d')
    } else {
      // Older: "Jan 15, 2024"
      return format(date, 'MMM d, yyyy')
    }
  } catch {
    return dateStr
  }
}

/**
 * Format a date string for tooltip (full date and time)
 */
export function formatFullDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  
  try {
    const date = dateStr.includes('T') ? parseISO(dateStr) : parseISO(dateStr + 'T00:00:00')
    
    if (!isValid(date)) return dateStr
    
    // If it has time info, show it
    if (dateStr.includes('T')) {
      return format(date, 'MMM d, yyyy \'at\' h:mm a')
    }
    return format(date, 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

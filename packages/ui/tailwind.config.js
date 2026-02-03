/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				background: '#0a0b0f',
				surface: '#12141a',
				'surface-elevated': '#1a1c24',
				border: '#2a2d38',
				'border-subtle': '#1e2028',
				'text-primary': '#f4f4f5',
				'text-secondary': '#a1a1aa',
				'text-muted': '#71717a',
				accent: '#ff6b5b',
				'accent-hover': '#ff8577',
				'status-open': '#22c55e',
				'status-closed': '#6b7280',
				'priority-high': '#ef4444',
				'priority-medium': '#f59e0b',
				'priority-low': '#22c55e',
				'type-default': '#a78bfa',
				'type-bug': '#f87171',
				'type-feature': '#60a5fa'
			}
		}
	},
	plugins: [require('@tailwindcss/typography')]
}

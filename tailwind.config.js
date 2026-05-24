/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: '#0a0a0f',
					secondary: '#121218',
					elevated: '#1a1a24',
				},
				foreground: '#f1f5f9',
				primary: {
					DEFAULT: '#6366f1',
					hover: '#818cf8',
					foreground: '#ffffff',
				},
				secondary: {
					DEFAULT: '#22d3ee',
					foreground: '#0a0a0f',
				},
				accent: {
					DEFAULT: '#22d3ee',
					foreground: '#0a0a0f',
				},
				success: '#10b981',
				warning: '#f59e0b',
				destructive: {
					DEFAULT: '#ef4444',
					foreground: '#ffffff',
				},
				muted: {
					DEFAULT: '#1e293b',
					foreground: '#94a3b8',
				},
				popover: {
					DEFAULT: '#121218',
					foreground: '#f1f5f9',
				},
				card: {
					DEFAULT: '#121218',
					foreground: '#f1f5f9',
				},
			},
			borderRadius: {
				lg: '8px',
				md: '6px',
				sm: '4px',
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'monospace'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'fade-in': {
					from: { opacity: 0, transform: 'translateY(10px)' },
					to: { opacity: 1, transform: 'translateY(0)' },
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
					'50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out forwards',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
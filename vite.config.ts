import { qwikVite } from '@qwik.dev/core/optimizer';
import { qwikRouter } from '@qwik.dev/router/vite';
import { i18nPlugin } from 'compiled-i18n/vite';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig((config) => {
	return {
		// Enable to analyze via source-map-explorer
		ssr: { target: 'webworker' },
		build: {
			sourcemap: config.mode === 'development',
		},
		plugins: [
			qwikRouter(),
			qwikVite(),
			tsconfigPaths(),
			i18nPlugin({
				locales: ['en', 'de', 'es'],
			}),
		],
		preview: {
			headers: {
				'Cache-Control': 'public, max-age=600',
			},
		},
		server: {
			// allow external access if you need (--host)
			host: true,
			port: 8080,
			https: {
				key: fs.readFileSync(path.resolve(__dirname, '../buylits/localhost+2-key.pem')),
				cert: fs.readFileSync(path.resolve(__dirname, '../buylits/localhost+2.pem')),
			},
		},
	};
});

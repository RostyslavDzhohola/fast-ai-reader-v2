import { defineManifest } from '@crxjs/vite-plugin';
import packageData from '../package.json';
import { RESTRICTED_GUILDS } from './config/restrictions';
//@ts-ignore
const isDev = process.env.NODE_ENV == 'development';
export default defineManifest({
    name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
    description: packageData.description,
    version: packageData.version,
    manifest_version: 3,
    icons: {
        16: 'img/logo-16.png',
        32: 'img/logo-34.png',
        48: 'img/logo-48.png',
        128: 'img/logo-128.png',
    },
    action: {
        default_icon: 'img/logo-48.png',
        default_title: 'Discord AI Assistant',
        // default_popup: 'popup.html',
    },
    options_page: 'options.html',
    devtools_page: 'devtools.html',
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    content_scripts: [
        {
            matches: ['*://*.discord.com/*'],
            exclude_matches: RESTRICTED_GUILDS.MANIFEST_PATTERNS,
            js: ['src/contentScript/index.ts'],
            run_at: 'document_end',
        },
    ],
    web_accessible_resources: [
        {
            resources: ['img/logo-16.png', 'img/logo-34.png', 'img/logo-48.png', 'img/logo-128.png'],
            matches: [],
        },
    ],
    permissions: ['storage', 'sidePanel', 'activeTab', 'identity', 'tabs', 'windows'],
    host_permissions: [
        'https://discord.com/*',
        'http://localhost:3000/',
        'https://discord-ai-extension.vercel.app/',
        'https://www.fastaireader.com/',
    ],
    oauth2: {
        client_id: '1019983268042-5c40lbqolpkktiq16g3gaermeb2d86b9.apps.googleusercontent.com',
        scopes: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ],
    },
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv7BH4VMxlTwLIRVBPJoXj//bmEu0G+HpRlnrDtGwRdfio6i9byYOgwxttIO7zUOlJSBs8RZz+Nz6/J1/TNShlQD6KsA5tlrE/NGzGzh/0Zc/51g+1rCsnRUjSXEh8m5NZSC4Ef/p3Q126pA3X1QRLowVBmFvojlnqFJzLnSetrvT6LAtDlduN14EXNv0MpC8fDsLGIMM6N/snjjZpt+Uj7xFqCDEEhkH2kUdQ+izchuEmViToLukWRgYR1N4ty3NShVaMiCGNwBccRqrmFLqQXWag0nfhhJdsxowr3tRQ26WHE8lsQsZgNXRz4icvQ69rEq6kDxXa6VBmayNB4sT2wIDAQAB',
});

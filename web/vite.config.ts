import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
// import devtools from 'solid-devtools/vite';
import dotenv from 'dotenv';
import { resolve } from 'path'


import path from 'path';

const envPath = path.resolve(__dirname, `.env.${process.env.NODE_ENV || 'development'}`);
const env = dotenv.config({ path: envPath }).parsed;

console.log(envPath)
console.log(process.env.NODE_ENV);
console.log(JSON.stringify(env));

export default defineConfig({
  publicDir: 'src/assets',
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
  ],
  server: {
    // origin:"wsf.io",
    cors:true,
    hmr:{
      host:"wsf.ptcl.one",
    },
    host:true,
    port: 3000,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
      },
    },
  },
  define: {
    'process.env': JSON.stringify(env),
  },
});
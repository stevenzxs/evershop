// Run only inside the isolated release builder, from /app.
import './node_modules/@evershop/evershop/dist/bin/build/initEnvBuild.js';
import { getRoutes } from './node_modules/@evershop/evershop/dist/lib/router/Router.js';
import { loadModuleRoutes } from './node_modules/@evershop/evershop/dist/lib/router/loadModuleRoutes.js';
import { getCoreModules } from './node_modules/@evershop/evershop/dist/bin/lib/loadModules.js';
import { compile } from './node_modules/@evershop/evershop/dist/bin/build/complie.js';

// Reuse existing generated entries; rebuild all admin routes together because
// their vendor/components chunks and the server bundle are shared.
for (const module of getCoreModules()) loadModuleRoutes(module.path);
const routes = getRoutes().filter((route) => route.isAdmin);
if (!routes.some((route) => route.id === 'storeSetting')) {
  throw new Error('Store settings route missing; refusing incomplete build');
}
await compile(routes);
console.log('LANGUAGE_ADMIN_BUILD_OK');

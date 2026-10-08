/**
 * Shim sementara untuk menjalankan Jest 30 di Linux ketika biner native `unrs-resolver`
 * (hanya terpasang versi win32) tidak tersedia. Dipakai lewat `node --require`/NODE_OPTIONS,
 * TIDAK mengubah node_modules. Di Windows (biner native tersedia) shim ini tidak diperlukan.
 */
const Module = require('module');
const path = require('path');
const fs = require('fs');
const NM = process.env.TA_EVAL_NODE_MODULES || path.resolve(__dirname, '../../../node_modules');
const origLoad = Module._load;
let native = null;
if (process.platform === 'win32' && !process.env.TA_EVAL_FORCE_SHIM) {
  try { native = origLoad.call(Module, path.join(NM, 'unrs-resolver'), null, false); } catch (_) { native = null; }
}
if (!native) {
  const ER = require(path.join(NM, 'enhanced-resolve'));
  const cfs = new ER.CachedInputFileSystem(fs, 4000);
  class ResolverFactory {
    constructor(opts) {
      this.opts = opts || {};
      const o = this.opts;
      this.r = ER.ResolverFactory.createResolver({
        fileSystem: cfs,
        useSyncFileSystemCalls: true,
        conditionNames: o.conditionNames || ['require', 'node', 'default'],
        extensions: o.extensions || ['.js', '.json', '.node'],
        modules: (process.env.TA_EVAL_NM_FIRST ? [process.env.TA_EVAL_NM_FIRST] : []).concat(o.modules || ['node_modules']),
        roots: o.roots,
        mainFields: o.mainFields || ['main'],
        symlinks: o.symlinks !== false,
      });
    }
    clearCache() { try { cfs.purge(); } catch (_) {} }
    cloneWithOptions(o) { return new ResolverFactory({ ...this.opts, ...o }); }
    sync(dir, req) {
      try {
        const p = this.r.resolveSync({}, dir, req);
        return p ? { path: p } : { error: 'Cannot find module ' + req };
      } catch (e) { return { error: e.message }; }
    }
    async(dir, req) { return Promise.resolve(this.sync(dir, req)); }
  }
  Module._load = function (request, parent, isMain) {
    if (request === 'unrs-resolver') return { ResolverFactory };
    return origLoad.apply(this, arguments);
  };
}

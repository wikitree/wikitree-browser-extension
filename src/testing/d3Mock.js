// d3 packages are ESM-only and Jest doesn't transform node_modules. Chat tests
// never draw charts, so importing modules get empty stand-ins.
const noop = () => noop;
module.exports = new Proxy({}, { get: (target, name) => (name === "__esModule" ? true : noop) });

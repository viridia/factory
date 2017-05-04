import * as deepstream from 'deepstream.io-client-js';

interface Globals {
  deepstream?: deepstreamIO.Client;
  hosts?: any;
}

const globals: Globals = {};

export default globals;

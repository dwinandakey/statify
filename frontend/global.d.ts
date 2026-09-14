// Declaration for lodash debounce module
declare module 'lodash/debounce';

// Add typings for react-katex to silence TS if @types not present
declare module 'react-katex' {
  import * as React from 'react';
  export interface MathProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
  }
  export const BlockMath: React.FC<MathProps>;
  export const InlineMath: React.FC<MathProps>;
}

// Worker-loader typings
declare module '*.worker' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

declare module '*.worker.ts' {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

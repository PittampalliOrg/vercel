declare const __DEBUG_BUILD__: boolean | undefined;

const _DEBUG_BUILD: boolean = typeof __DEBUG_BUILD__ !== 'undefined'
    ? __DEBUG_BUILD__
    : true;

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
export const DEBUG_BUILD = _DEBUG_BUILD;

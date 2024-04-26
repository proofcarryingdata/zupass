/**
 * Secure method to check if the environment is Node.js.
 * @returns true if the environment is Node.js, false otherwise.
 */
export function isNode(): boolean {
  // Checking the existence of 'window' variable, or 'process' is not enough,
  // as those variables can be redefined by inner scopes (by any module/library).
  // In the 'new Function()' constructor, the execution scope of 'this' is bound
  // to the global scope and it can be compared to the expected value (the objects
  // will have the same id if the environment is the expected one).
  return new Function("try {return this===global}catch(e){ return false}")();
}

/**
 * Secure method to check if the environment is a browser.
 * @returns true if the environment is a browser, false otherwise.
 */
export function isBrowser(): boolean {
  return new Function("try {return this===window}catch(e){ return false}")();
}

/**
 * Secure method to check if Web Assembly is supported.
 * It does the following:
 *   Check whether WebAssembly is accessible in the current scope.
 *   See whether it has the '.instantiate' function.
 *   Try to synchronously compile the smallest possible module
 *   See if we get a WebAssembly.Module out of it.
 *   Finally, try to synchronously instantiate that module, and check that it's a WebAssembly.Instance.
 * More info on: https://stackoverflow.com/questions/47879864/how-can-i-check-if-a-browser-supports-webassembly.
 * @returns true if WASM is supported, false otherwise.
 */
export function isWebAssemblySupported(): boolean {
  try {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );

      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
      }

      return false;
    }

    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Method that tests whether local storage is available by setting and
 * resetting a test entry in localStorage.
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const key = `__storage__test`;
    const originalValue = window.localStorage.getItem(key);
    window.localStorage.setItem(key, "test");
    if (originalValue !== null) {
      window.localStorage.setItem(key, originalValue);
    } else {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch (e) {
    return false;
  }
}

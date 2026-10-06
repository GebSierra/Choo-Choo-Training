// Where the app runs. isNative is true inside a Capacitor wrapper (the files are already bundled there).
export const isNative = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());

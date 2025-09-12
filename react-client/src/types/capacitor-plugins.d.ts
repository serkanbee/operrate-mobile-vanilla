declare module 'capacitor-secure-storage-plugin' {
  export const SecureStoragePlugin: any;
  const _default: any;
  export default _default;
}

declare module '@capacitor/device' {
  export const Device: {
    getInfo(): Promise<{
      platform?: string;
      operatingSystem?: string;
      osVersion?: string;
      model?: string;
      manufacturer?: string;
      isVirtual?: boolean;
    }>;
  };
}

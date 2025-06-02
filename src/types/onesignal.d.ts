
declare global {
  interface Window {
    OneSignal?: {
      initialized?: boolean;
      push: (callback: () => void) => void;
      login: (userId: string) => void;
      User: {
        addTag: (key: string, value: string) => void;
      };
    };
  }
}

export {};

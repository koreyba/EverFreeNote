export interface BrowserAdapter {
  alert(message: string): void;
  confirm(message: string): boolean;
  prompt(message: string, defaultValue?: string): string | null;
  localStorage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
  };
  location: {
    origin: string;
    reload(): void;
  };
}

class WebBrowserAdapter implements BrowserAdapter {
  alert(message: string): void {
    if (typeof window !== 'undefined') {
      window.alert(message);
    }
  }

  confirm(message: string): boolean {
    if (typeof window !== 'undefined') {
      return window.confirm(message);
    }
    return false;
  }

  prompt(message: string, defaultValue?: string): string | null {
    if (typeof window !== 'undefined') {
      return window.prompt(message, defaultValue);
    }
    return null;
  }

  get localStorage() {
    if (typeof window !== 'undefined') {
      return window.localStorage;
    }
    // Fallback for SSR or non-browser environments
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  get location() {
    if (typeof window !== 'undefined') {
      return window.location;
    }
    return {
      origin: '',
      reload: () => {},
    };
  }
}

export const browser = new WebBrowserAdapter();

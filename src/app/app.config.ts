import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Angular adds the X-XSRF-TOKEN header (copied from the XSRF-TOKEN cookie) to POST/PUT/DELETE calls by itself.
    provideHttpClient(),
  ]
};

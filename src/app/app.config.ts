import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LucideIconProvider, LUCIDE_ICONS, icons } from 'lucide-angular';

import { routes } from './app.routes';
import { apiInterceptor, authInterceptor } from './core/http.interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiInterceptor])),
    provideAnimationsAsync(),
    {
      provide: LUCIDE_ICONS,
      useFactory: () => new LucideIconProvider(icons),
      multi: true,
    },
  ],
};

import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { ApiResponse } from './models';
import { AuthService, TOKEN_KEY } from './services/auth.service';
import { ToastService } from './services/toast.service';
import { environment } from '../../environments/environment';

function isApiUrl(req: HttpRequest<unknown>): boolean {
  return req.url.startsWith('/api/') || req.url.startsWith(environment.apiUrl + '/api/');
}

function toApiUrl(req: HttpRequest<unknown>): HttpRequest<unknown> {
  if (environment.apiUrl && req.url.startsWith('/api/')) {
    return req.clone({ url: environment.apiUrl + req.url });
  }
  return req;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req)) return next(req);

  const token = localStorage.getItem(TOKEN_KEY);
  const auth = inject(AuthService);
  const router = inject(Router);

  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status === 401 &&
        !req.url.includes('/auth/login') &&
        !req.url.includes('/auth/refresh') &&
        !req.url.includes('/auth/logout')
      ) {
        return from(auth.refresh()).pipe(
          switchMap((ok) => {
            if (!ok) {
              router.navigate(['/login']);
              return throwError(() => error);
            }
            const newToken = localStorage.getItem(TOKEN_KEY);
            const retried = newToken
              ? req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
              : req;
            return next(retried);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req)) return next(req);

  const apiReq = toApiUrl(req);
  const toast = inject(ToastService);

  return next(apiReq).pipe(
    map((event: HttpEvent<unknown>) => {
      if (event instanceof HttpResponse && event.body && typeof event.body === 'object') {
        const body = event.body as Record<string, unknown>;
        if ('success' in body || 'Success' in body) {
          const data = 'data' in body ? body['data'] : body['Data'];
          return event.clone({ body: data });
        }
      }
      return event;
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.error && typeof error.error === 'object' && 'message' in error.error) {
        const body = error.error as ApiResponse<unknown>;
        const msg = body.errors?.length ? body.errors.join('. ') : body.message;
        if (error.status !== 401) toast.error('Request failed', msg);
      } else if (error.status === 0) {
        toast.error('Connection error', 'Unable to reach the server.');
      }
      return throwError(() => error);
    }),
  );
};

import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

/**
 * Where the browser is sent to start the login. This must be the gateway's own address, because the login callback
 * lands on the gateway (http://localhost:8090/login/oauth2/code/auth) and the session cookie is set there.
 */
const GATEWAY = 'http://localhost:8090';

interface GatewayUser {
  authenticated: boolean;
  subject: string;
  roles: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly http = inject(HttpClient);

  /** null = not logged in (or not checked yet) */
  protected readonly user = signal<GatewayUser | null>(null);
  protected readonly checked = signal(false);

  protected readonly resultTitle = signal('');
  protected readonly result = signal('');

  constructor() {
    this.loadUser();
  }

  /** Step 1: ask the gateway "who am I?". 200 = we have a session cookie, 401 = no session. */
  protected loadUser(): void {
    this.http.get<GatewayUser>('/bff/user').subscribe({
      next: (u) => {
        this.user.set(u);
        this.checked.set(true);
      },
      error: () => {
        this.user.set(null);
        this.checked.set(true);
      }
    });
  }

  /** Step 2: send the whole browser window to the gateway, which sends it on to the auth server's login page. */
  protected login(): void {
    window.location.href = `${GATEWAY}/oauth2/authorization/auth`;
  }

  /** Step 3: call an API. The browser sends only the cookie; the gateway adds the bearer token. */
  protected call(path: string): void {
    this.resultTitle.set(`GET ${path}`);
    this.result.set('...');
    this.http.get(path, { observe: 'response' }).subscribe({
      next: (res) => this.result.set(`HTTP ${res.status}\n` + JSON.stringify(res.body, null, 2)),
      error: (err: HttpErrorResponse) =>
        this.result.set(`HTTP ${err.status}\n` + (typeof err.error === 'string' ? err.error : JSON.stringify(err.error, null, 2)))
    });
  }

  /** Step 4: logout. The gateway revokes the tokens at the auth server and ends the session. */
  protected logout(): void {
    this.resultTitle.set('POST /bff/logout');
    this.http.post('/bff/logout', null, { observe: 'response' }).subscribe({
      next: (res) => {
        this.result.set(`HTTP ${res.status} (logged out)`);
        this.user.set(null);
      },
      error: (err: HttpErrorResponse) => this.result.set(`HTTP ${err.status}\n` + JSON.stringify(err.error, null, 2))
    });
  }
}

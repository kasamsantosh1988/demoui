# gateway-login-ui: one-page test of the central login flow

Angular app with one page. It never sees a token: the browser holds only the gateway's session cookie.

## Run order

1. Redis: `docker compose up -d` (in `auth-gateway`)
2. Auth server with the dev profile (creates the client `demo-gateway`)
3. `cd auth-introspection-client && mvn install`, then `cd demo-api && mvn spring-boot:run` (port 8081)
4. Gateway: `cd auth-gateway && mvn spring-boot:run -Dspring-boot.run.profiles=dev` (port 8090)
5. This page: `npm install` then `npm start`, open **http://localhost:4200** (Node 20.19+, 22.12+ or 24)

Use `localhost` everywhere (not 127.0.0.1) so the cookie is shared.

## What to click, and what happens

| # | You do | What happens inside |
| --- | --- | --- |
| 1 | Open http://localhost:4200 | The page calls `GET /bff/user` (through the dev proxy to the gateway). No session, so the gateway answers 401 and the page shows **Not logged in**. |
| 2 | Click **Login** | The browser goes to `http://localhost:8090/oauth2/authorization/auth`. The gateway makes a `state` and a PKCE challenge, saves them in its session (Redis) and redirects the browser to the auth server's `/oauth2/authorize`. |
| 3 | Log in as `alice` / `alice-pass` on the auth server page | The auth server checks the password with the demo directory and redirects the browser to `http://localhost:8090/login/oauth2/code/auth?code=...&state=...`. |
| 4 | (automatic) | The gateway checks `state`, calls `/oauth2/token` with its secret and the PKCE verifier, saves the tokens in the Redis session, sets the `GWSESSION` cookie and redirects to http://localhost:4200/. |
| 5 | The page shows **Logged in**, subject `demo-gateway:1001` | `GET /bff/user` now succeeds because the browser sends the cookie. |
| 6 | Click **Call API: hello** | `GET /api/demo/hello` goes to the gateway with the cookie. The gateway adds `Authorization: Bearer <token>` and forwards to demo-api. The API's filter validates the token at the auth server and answers with `userId` 1001 and role USER. |
| 7 | Click **Call API: headers the API received** | Shows what demo-api got: `Authorization` as `Bearer ***`, and **no** `Cookie` header. |
| 8 | Click **Logout** | `POST /bff/logout` (Angular adds the CSRF header). The gateway revokes the refresh token at the auth server and deletes the session. The page returns to **Not logged in**. |

Extra checks: after step 8, `GET /api/demo/hello` in the browser gives 401. In Redis, `keys "gateway:session*"` shows the session while logged in.

## If something fails

| Symptom | Cause |
| --- | --- |
| Page stays on "Not logged in" after login | Cookie not kept: use `localhost`, not 127.0.0.1, and make sure the gateway runs with the `dev` profile (cookie `secure` off) |
| Login page shows `invalid_client` or redirect_uri error | Auth server was started before the new `DevSeedRunner`, or without the dev profile: restart it with the dev profile |
| `/api/demo/hello` gives 502 or 500 | demo-api is not running on 8081 |
| `/api/demo/hello` gives 401 from the API | Token not accepted: check `demo-gateway` has audience `demo-api` in `client_audience` |
| Logout gives 403 | CSRF header missing: open the page via http://localhost:4200 (not the gateway directly) so Angular can add it |

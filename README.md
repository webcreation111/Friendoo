# Friendo Backend

A Java 17 / Spring Boot 3 REST + WebSocket API for the **Friendo** client
(`index.html`, `people.html`, `friends.html`, `chatting.html`, `profile*.html`,
`settings.html`, `payment.html`, `contact.html`). It replaces the client's
current `localStorage`-only prototype with a real server, a database, JWT
auth, and a Razorpay payment integration — everything is exchanged as JSON.

## Stack

- Java 17, Spring Boot 3.2 (Web, Data JPA, Security, Validation, WebSocket)
- H2 file-based database (swap for Postgres/MySQL in `application.yml` for production)
- JWT auth (`jjwt`), BCrypt password hashing
- Razorpay Orders API for payments, verified server-side via HMAC-SHA256
- STOMP over WebSocket for real-time chat delivery, with plain REST fallback
- Lombok to keep entities/DTOs concise

## Assumptions made (client had no login form)

The static client jumps straight from "Login" to `people.html` with no
email/password screen. To support multiple devices and real user accounts,
this backend adds a standard **email + password** registration/login step
(`/api/auth/register`, `/api/auth/login`) that returns a JWT. Everything after
login (profile setup, people, friends, chat, settings, payment) maps directly
to what's already in the HTML/JS.

## Running it

```bash
# from the project root
mvn spring-boot:run
```

The API listens on `http://localhost:8080`. An H2 console is available at
`/h2-console` (JDBC URL `jdbc:h2:file:./data/friendo`, user `sa`, blank password)
for inspecting data during development.

Set real Razorpay credentials before testing payments:

```bash
export RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
export RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

Update `friendo.jwt.secret` in `application.yml` (or override via
`FRIENDO_JWT_SECRET` env var / `friendo.jwt.secret` property) with a long
random value before deploying anywhere real.

## Endpoint map

| Client page | Endpoint(s) |
|---|---|
| (login, not in original HTML) | `POST /api/auth/register`, `POST /api/auth/login` |
| `profile-setup.html`, `profile-confirm.html` | `PUT /api/profile/setup` |
| `profile.html` | `GET /api/profile/me`, `PUT /api/profile/me` |
| `people.html` | `GET /api/people`, `POST /api/friends/request/{userId}` |
| `friends.html` | `GET /api/friends`, `GET /api/friends/sent`, `GET /api/friends/received`, `POST /api/friends/{id}/accept`, `POST /api/friends/{id}/decline` |
| `chatting.html` | `GET /api/chat/rooms`, `POST /api/chat/rooms/{otherUserId}`, `GET /api/chat/rooms/{roomId}/messages`, `POST /api/chat/rooms/{roomId}/messages`, WebSocket `/ws` (`/app/chat.send/{roomId}` → `/topic/room.{roomId}`) |
| `settings.html` | `GET /api/settings`, `PUT /api/settings`, `DELETE /api/account` |
| `payment.html` | `POST /api/payment/orders`, `POST /api/payment/verify`, `GET /api/payment/status` |
| `contact.html` | `POST /api/contact` (no auth required) |

All authenticated endpoints expect `Authorization: Bearer <token>` from the
login/register response.

## Example flow

```bash
# 1. Register
curl -X POST localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"pooja@example.com","password":"correct-horse","nickname":"pooja"}'
# -> { "token": "...", "userId": 1, "nickname": "pooja", "profileComplete": false }

# 2. Complete profile setup (profile-setup.html)
curl -X PUT localhost:8080/api/profile/setup \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"nickname":"pooja","gender":"Female","birthYear":"1996","nationality":"India","region":"Tamil Nadu"}'

# 3. Browse people
curl localhost:8080/api/people -H "Authorization: Bearer <token>"

# 4. Send a friend request
curl -X POST localhost:8080/api/friends/request/2 -H "Authorization: Bearer <token>"
```

## Notes / production hardening ideas

- Swap H2 for Postgres/MySQL and point `spring.datasource.*` at it.
- Move `friendo.jwt.secret` and Razorpay keys to environment variables or a
  secrets manager — never commit real values.
- Add a `ChannelInterceptor` on the STOMP handshake to authenticate WebSocket
  sessions with the same JWT used for REST (currently the WebSocket message
  handler relies on the HTTP security context from the initial SockJS request).
- Add rate limiting on `/api/auth/*` and `/api/contact` to deter abuse.
- Wire Razorpay webhooks (`payment.captured`, `payment.failed`) as a second,
  server-to-server confirmation path in addition to the client-driven
  `/api/payment/verify` call.

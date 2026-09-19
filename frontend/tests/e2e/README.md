# E2E testing

## Email confirmation

Like the Dex login test, email confirmation needs external services. CI starts
Mailpit and a separate mail-enabled API before Playwright. Tests connect through
`MAILER_API_URL` (default `http://127.0.0.1:3457/api/v1`) and `MAILPIT_URL`
(default `http://127.0.0.1:8025`). The main test API keeps mail disabled.

For local runs, start Mailpit in one terminal:

```shell
docker run --rm --name norna-e2e-mailpit \
  -p 127.0.0.1:1025:1025 -p 127.0.0.1:8025:8025 axllent/mailpit:v1.31.1
```

From the repository root, start the mail-enabled API in another terminal:

```shell
mage build
mail_test_root=$(mktemp -d)
mkdir -p "$mail_test_root/files"
NORNA_SERVICE_INTERFACE=127.0.0.1:3457 \
NORNA_SERVICE_PUBLICURL=http://127.0.0.1:4173/ \
NORNA_SERVICE_ROOTPATH="$mail_test_root" \
NORNA_FILES_BASEPATH="$mail_test_root/files" \
NORNA_DATABASE_TYPE=sqlite NORNA_DATABASE_PATH=memory \
NORNA_AUTH_OPENID_ENABLED=0 NORNA_REDIS_ENABLED=0 \
NORNA_MAILER_ENABLED=1 NORNA_MAILER_HOST=127.0.0.1 \
NORNA_MAILER_PORT=1025 NORNA_MAILER_FORCESSL=0 \
./norna web
rm -rf "$mail_test_root"
```

Then run the tests from the repository root, fixing the frontend port so the
confirmation links point to the test frontend:

```shell
NORNA_E2E_FRONTEND_PORT=4173 mage test:e2e 'tests/e2e/user/registration.spec.ts'
```

Stop Mailpit and the mail-enabled API when finished.

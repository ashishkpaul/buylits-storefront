# Vendure Qwik Storefront Starter️

An e-commerce storefront for [Vendure](https://www.vendure.io) built with [Qwik](https://qwik.builder.io/) & [Qwik City](https://qwik.builder.io/qwikcity/overview).

👉 [qwik-storefront.vendure.io](https://qwik-storefront.vendure.io)

## Core Web Vitals

![pagespeed.web.dev](docs/metrics.png)

### 📑 [Guide: Spin up an e-commerce app in 60s with Vendure + Qwik](https://dev.to/prasmalla/in-2023-set-up-a-nodejs-e-commerce-app-in-1-minute-with-vendure-qwik-bl7)

## Features

- Cart ✅
- Checkout flow ✅
- Search facet filters ✅
- Login ✅
- Account creation ✅
- Customer account management ✅
- SPA-mode navigation ✅
- Set up GraphQL code generation ✅

**Contributions welcome!**

## Frequently Asked Questions

- [Can I deploy the application in different environment (e.g Netlify, Fastify, etc. etc)?](#can-i-host-the-application-in-my-environment-or-is-limited-to-cloudflare)
- [Why can I not reach my remote server?](#why-can-i-not-reach-my-remote-server)
- [Why does signup or login not work?](#why-does-signup-or-login-not-work)
- [What payment systems are supported?](#what-payment-systems-are-supported)

### Can I host the application in my environment or is limited to Cloudflare?

We are using Cloudflare, but there isn't a specific Cloudflare feature for this application.
If you want to deploy your application in a different environment, you can follow the [Qwik guide](https://qwik.builder.io/docs/deployments/#add-an-adapter) and customize the code base according to your needs.

### Why can I not reach my remote server?

When running the storefront make sure when in dev mode (ie: using vite) to attach it to the network by using `--host 0.0.0.0`
For example: `"start": "vite --open --mode ssr --port 80 --host 0.0.0.0",`

Also make sure your firewall allows traffic on your selected port.
For Ubuntu: `sudo ufw status` to see what is blocked or allowed.

### Why does signup or login not work?

https needs to be enabled, please confirm you are using ssl. You can use apache or nginx to forward ssl traffic to your selected port.

Make sure that your vendure instance is accessible and not being blocked by a firewall for example.

If you see a message on signup "Account registration is not supported by the demo Vendure instance. In order to use it, please connect to your own local / production instance." This is simply a static message, it is not doing any actual check. Simply remove this message. To connect to your vendure instance simply set the .env variables to point to your vendure setup.

### What payment systems are supported?

Currently Braintree and Stripe are supported on the frontend, but not currently Mollie.
For Braintree make sure to name your payment method in your vendure admin "braintree payment" and specifically code "braintree-payment".

## Development

Development mode uses [Vite's development server](https://vitejs.dev/). During development, the `dev` command will server-side render (SSR) the output.

```shell
pnpm start
```

> Note: during dev mode, Vite may request a significant number of `.js` files. This does not represent a Qwik production build.

## Preview

The preview command will create a production build of the client modules, a production build of `src/entry.preview.tsx`, and run a local server. The preview server is only for convenience to locally preview a production build, and it should not be used as a production server.

```shell
pnpm preview # or `pnpm preview`
```

## Production

The production build will generate client and server modules by running both client and server build commands. Additionally, the build command will use Typescript to run a type check on the source code.

```shell
pnpm build # or `pnpm build`
```

### i18n

The resulting language should match your browser language. You can also override the language by adding ?lang=es to the URL.

---

## Related

- [Vendure Docs](https://vendure.io/docs)
- [Vendure Github](https://github.com/vendure-ecommerce/vendure)
- [Vendure Discord](https://vendure.io/community)
- [Qwik Docs](https://qwik.builder.io/)
- [Qwik Github](https://github.com/BuilderIO/qwik)
- [@QwikDev](https://twitter.com/QwikDev)
- [Qwik Discord](https://qwik.builder.io/chat)

## Production — Self-hosted VM

If you plan to host the storefront on a self-managed virtual machine, follow these steps to run the app, terminate TLS at a reverse proxy (nginx) and secure the site with Let's Encrypt. This guide assumes an Ubuntu/Debian-like VM. Do NOT use development certificates in production and never commit private keys to the repository.

1. Point your DNS

- Create A (or AAAA) records for your domain (e.g. example.com) pointing to the VM public IP.

1. Install nginx and certbot

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

1. Build and run the storefront app

From the `storefront` folder build the production artifacts and run your server on a local port (example: 8080):

```bash
pnpm build
NODE_ENV=production node ./dist/server.js
```

Run the app under a process manager or systemd unit so it restarts on crash/reboot. Example systemd unit `/etc/systemd/system/storefront.service`:

```ini
[Unit]
Description=Storefront App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/home/ashish/aa/projects/ecom/storefront
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/ashish/aa/projects/ecom/storefront/dist/server.js
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now storefront.service
```

1. Obtain and install a Let's Encrypt certificate

With nginx running, request a certificate for your domain (replace `example.com`):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

This will configure nginx for HTTPS and set up automatic renewals.

1. Example nginx reverse proxy

Create `/etc/nginx/sites-available/storefront` (or let certbot create it). Minimal example:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:8080; # your app
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
}
```

Enable and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/storefront /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

1. Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

1. Renewal test

```bash
sudo certbot renew --dry-run
```

Security notes

- Never commit private keys to the repository. Keep certs in `/etc/letsencrypt` (or use a secret manager).
- Use secure permissions on keys: `sudo chmod 600 /etc/letsencrypt/live/*/privkey.pem`.
- Monitor and automate the app with systemd, PM2, or a container orchestrator.
- Only enable HSTS after verifying HTTPS works for all subdomains.

If you'd like, I can create the systemd unit and nginx config tailored to your domain and path, or prepare a Docker Compose / Traefik example. Tell me which approach you prefer and your domain.

## Express Server

This app has a minimal [Express server](https://expressjs.com/) implementation. After running a full build, you can preview the build using the command:

```text
pnpm serve
```

Then visit [http://localhost:8080/](http://localhost:8080/)

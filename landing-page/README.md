# Resource Capital - Landing Page

A "Coming Soon" landing page for [resourcecapital.ca](https://resourcecapital.ca).

## 🚀 Quick Start

### Local Development
```bash
cd landing-page
npx serve .
```
Then open http://localhost:3000

### Deploy to Vercel

1. Install Vercel CLI (if not installed):
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   cd landing-page
   vercel
   ```

3. For production:
   ```bash
   vercel --prod
   ```

## 📧 Waitlist Setup (Formspree)

1. Go to [formspree.io](https://formspree.io) and create a free account
2. Create a new form and copy your form ID
3. Replace `YOUR_FORM_ID` in `index.html` with your actual form ID:
   ```html
   <form action="https://formspree.io/f/YOUR_ACTUAL_ID" method="POST">
   ```

## 🌐 Connect Your Domain (Porkbun → Vercel)

After deploying to Vercel:

1. In Vercel dashboard, go to your project → Settings → Domains
2. Add `resourcecapital.ca`
3. Vercel will show you DNS records to add
4. In Porkbun, go to Domain Management → DNS
5. Add the records Vercel provides (usually an A record and/or CNAME)

### Typical DNS Setup:
| Type  | Host | Value |
|-------|------|-------|
| A     | @    | 76.76.21.21 |
| CNAME | www  | cname.vercel-dns.com |

## 📁 Files

- `index.html` - Main HTML structure
- `styles.css` - All styling with CSS custom properties
- `script.js` - Form handling and animations
- `package.json` - Project configuration

## ✨ Features

- Premium dark theme with animated gradient background
- Responsive design (mobile-first)
- Email waitlist with Formspree integration
- Success animation with confetti
- Subtle hover effects and micro-animations

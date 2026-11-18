# AuraFinance

Personal finance tracker with a Google Sheets database, React/Vite glass interface, credit-card statements, EMI history, recurring templates and a password-protected Vercel API.

This branch contains the v2 integration upgrade. It has not been deployed to the user's live Sheet or Vercel project.

- **Start here:** [বাংলা setup guide](SETUP_BN.md)
- [Changes, data safeguards and limitations](UPGRADE.md)
- [Validation results](VALIDATION.txt)
- [New Apps Script](apps-script/Code.gs)
- [Supplied original script backup](apps-script/Original_Code.gs.txt)

Test on a copied Sheet first. Create `.env.local` using `.env.example`; do not commit credentials. Keep write mode disabled until the copied backend is verified.

```sh
npm ci
npm test
npm run dev:api
# Another terminal:
npm run dev
```

For production, deploy the entire project including `api/` and `server/`, not only the static `dist/` directory. See the setup guide before changing the existing deployment. Do not run the original script's `setupSheets()` for the upgrade.

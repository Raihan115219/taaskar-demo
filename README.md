# TAASKAR — mobile app prototype

Frontend-only demo (HTML, CSS, vanilla JS, Tailwind CDN, Lucide). All data lives in the browser's localStorage.

## Run

```bash
python -m http.server 5185
```

Open http://localhost:5185.

## Demo accounts (for testing)

| Role | Name | Email | Mobile | Password |
|------|------|-------|--------|----------|
| Sender (posts tasks) | Aarav Mehta | demo@taaskar.in | 9876543210 | Demo@1234 |
| Runner (delivers) | Rohan Kulkarni | runner@taaskar.in | 9876543211 | Demo@1234 |

The login screen has a **Use** button next to each account that fills in the details.

## Testing both sides at once

1. Window 1: log in as the **Sender** and post a task from **Create**. After **Review**, tap **Continue to Payment**, choose TAASKAR Wallet, UPI, Card or Net Banking, and tap **Pay** (demo — no real money). The amount is held in escrow.
2. Window 2 (a new tab or window of the same browser): log in as the **Runner**. The new task appears on Home/Explore with a notification. Tap **Accept This Task**.
3. Runner: open **Track** and tap **Update status** for each step (heading to pickup → picked up → on the way → delivered).
4. Sender: the tracking screen updates live. After "Delivered", tap **Confirm & Release Payment**. The reward moves into the Runner's wallet.
5. Chat works between both windows too.

### Buy & Bring (who pays for the item?)

- The Sender sets a **maximum item budget** when creating the task. Budget + reward + fee are paid at checkout and held in escrow.
- At **Item Purchased**, the Runner adds the bill amount (and a photo). If the bill is above budget, the Sender must **Approve** the extra (paid from wallet) or **Decline**.
- On confirmation the Runner receives the bill amount + reward, and any unused budget is refunded to the Sender's wallet.

Each tab keeps its own login, but both tabs share the same task data, so changes show up instantly. This only works within one browser on one computer, because there is no server; two different phones would need a real backend.

Accounts created on the Sign-up screen are saved in this browser and can log in again later. This is mock authentication only; nothing is sent to a server.

## Reset

Profile → Settings → **Reset demo data** restores sample tasks, wallets and accounts.

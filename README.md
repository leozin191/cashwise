# CashWise — AI-Powered Personal Finance Manager

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen?style=for-the-badge&logo=springboot)
![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?style=for-the-badge&logo=expo)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-blue?style=for-the-badge&logo=ai)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A full-stack personal finance application with **AI-powered expense categorization**, **automatic subscription management**, **installment tracking**, and a polished mobile experience. Built with Spring Boot + React Native (Expo).

> **Current focus: Mobile app (React Native).** The web frontend (React + Vite) was the original prototype and will be updated progressively.

---

## What Makes This Different

- **AI Categorization** — Groq's Llama 3.3-70b automatically categorizes expenses from their description
- **Smart Subscriptions** — Netflix, Spotify, gym — added once, expenses created automatically every month via a scheduled job
- **Installment Tracking** — Split purchases into 2-48 monthly installments with automatic parcel generation
- **Visual Insights** — Interactive donut chart, color-coded bar chart with monthly evolution and trend analysis
- **Budget Goals** — Set spending limits per category with real-time progress tracking and alerts
- **3-Month Forecast** — Predicts upcoming costs from active subscriptions and installment parcels
- **Multi-Currency** — Live exchange rates from 15 currencies, auto-conversion with 24h cache
- **Dark Mode** — System-wide dark theme across every screen, modal, and chart
- **Bilingual** — Full Portuguese/English support with persistent language preference
- **Native Feel** — Inter font family, gradient headers, swipe gestures, smooth animations, glassmorphism effects

---

## Features

### Expense Management
- Add, edit, delete expenses with AI-powered auto-categorization
- 32 categories with Ionicon icons and unique colors
- Installment support: split purchases into 2-48 monthly parcels
- Expense detail modal with full info (date, time, category, currency, installment progress)
- Search expenses across description, category, amount, and date
- Sort: newest, oldest, highest, lowest
- Filter by period: This Month, Last 30 Days, All Time
- Swipe-to-edit (left) and swipe-to-delete (right) gestures

### Subscriptions (Auto-Recurring)
- Create subscriptions (Monthly, Yearly)
- Automatic expense generation via scheduled backend job (runs daily at 00:05)
- Pause/resume subscriptions with a toggle switch
- Monthly total displayed in header
- Option to create current month's expense immediately upon subscription creation

### Budget Goals
- Set monthly spending limits per category
- Visual progress bars with color-coded warnings (green/orange/red)
- Automatic alerts when approaching or exceeding limits
- Multi-currency budget support with live conversion
- Swipe to edit/delete budgets

### Analytics & Charts
- **Donut chart** — Interactive pie chart, tap a category to see filtered expenses
- **Bar chart** — Last 6 months with color-coded bars (green: below average, orange: above average, red: highest month)
- **Trend badge** — Percentage change vs previous month (green = spending less, red = spending more)
- **Tap-to-inspect** — Tap any bar to see month total and expense count
- **Y-axis formatting** — Abbreviated values (1.2k instead of 1200)
- **Statistics** — Highest expense, daily average, top category with percentage
- **3-month forecast** — Projected costs from subscriptions + installments

### Data Management
- **CSV Export** — Expenses exported with formula injection protection
- **Full Backup** — JSON export including expenses, subscriptions, budgets, and settings
- **Import/Restore** — Restore from JSON backup file
- Exchange rate management with manual refresh

### Settings & Preferences
- Dark/Light theme (persisted)
- Language: Portuguese/English with flag emojis (persisted)
- Currency selection: 15 currencies with live exchange rates (persisted)
- Manual exchange rate refresh with 24h auto-cache

### Design System
- Inter font family (Regular, Medium, SemiBold, Bold)
- Linear gradient headers on all screens
- Glassmorphism and shadow effects
- Cascading fade-in animations
- Swipe-to-dismiss modals with drag handles
- Pull-to-refresh on all list screens

---

## Tech Stack

### Backend
| Tech | Purpose |
|------|---------|
| Java 21 | Language |
| Spring Boot 4.0 | Framework |
| Spring Data JPA | ORM |
| PostgreSQL | Relational database |
| Spring Scheduler | Automatic subscription processing |
| Groq AI API | Llama 3.3-70b for categorization |
| Maven | Build tool |

### Mobile (Active Development)
| Tech | Purpose |
|------|---------|
| React Native 0.81 | Cross-platform mobile framework |
| Expo SDK 54 | Development platform |
| React Navigation | Bottom tab navigation |
| react-native-gifted-charts | Donut chart & bar chart |
| react-native-swipe-list-view | Swipe gestures |
| expo-linear-gradient | Gradient headers |
| @expo-google-fonts/inter | Typography |
| AsyncStorage | Local preferences persistence |
| Axios | HTTP client (15s timeout) |
| Context API | State management (Theme, Language, Currency) |

### Web Frontend (Legacy Prototype)
| Tech | Purpose |
|------|---------|
| React 19 | UI library |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Recharts | Charts |
| Axios | HTTP client |

---

## API Endpoints

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | List all expenses |
| `GET` | `/api/expenses/{id}` | Get expense by ID |
| `POST` | `/api/expenses` | Create expense (AI auto-categorizes if no category) |
| `PUT` | `/api/expenses/{id}` | Update expense |
| `DELETE` | `/api/expenses/{id}` | Delete expense |
| `POST` | `/api/expenses/bulk` | Create multiple expenses |
| `GET` | `/api/expenses/suggest-category?description=X` | Get AI category suggestion |
| `GET` | `/api/expenses/category/{category}` | Filter by category |
| `GET` | `/api/expenses/date/{date}` | Filter by date |
| `GET` | `/api/expenses/date-range?start=X&end=Y` | Filter by date range |
| `GET` | `/api/expenses/currency/{currency}` | Filter by currency |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/subscriptions` | List all subscriptions |
| `GET` | `/api/subscriptions/active` | List active subscriptions only |
| `POST` | `/api/subscriptions` | Create subscription |
| `PUT` | `/api/subscriptions/{id}` | Update subscription |
| `DELETE` | `/api/subscriptions/{id}` | Delete subscription |
| `PATCH` | `/api/subscriptions/{id}/toggle` | Pause/resume subscription |
| `POST` | `/api/subscriptions/process` | Manually trigger subscription processing |

---

## Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- Maven
- PostgreSQL 14+
- Docker Desktop (optional, recommended)
- Expo Go app on your phone
- Groq API Key (free at https://console.groq.com)

### 1. Clone the repository
```bash
git clone https://github.com/leozara/CashWise.git
cd CashWise
```

### 2. Backend Setup
```bash
# Set your Groq API key
export GROQ_API_KEY=your_key_here

# Configure PostgreSQL (adjust as needed)
export DB_URL=jdbc:postgresql://localhost:5432/cashwise
export DB_USER=cashwise
export DB_PASSWORD=cashwise
export DB_NAME=cashwise

# Or create a .env file (not committed to git)
cat > .env <<'EOF'
GROQ_API_KEY=your_key_here
DB_URL=jdbc:postgresql://localhost:5432/cashwise
DB_USER=cashwise
DB_PASSWORD=cashwise
DB_NAME=cashwise
EOF

# Start PostgreSQL with Docker (recommended)
docker compose up -d

# Run the backend
./mvnw spring-boot:run
```
The API will be available at `http://localhost:8080`.

### 3. Mobile Setup
```bash
cd mobile

# Install dependencies
npm install

# Configure the API URL (use your machine's local IP)
# Edit .env:
# EXPO_PUBLIC_API_URL=http://YOUR_IP:8080/api

# Start Expo
npx expo start
```
Scan the QR code with Expo Go on your phone.

> **Important:** Your phone and computer must be on the same Wi-Fi network. Use your local IP (not `localhost`).

---

## Project Structure

> **Note:** The current development focus is on the **mobile app**. The web frontend (React + Vite) was the original prototype and will be updated over time.

```
CashWise/
|
+-- src/main/java/.../cashwise/          # Spring Boot Backend
|   +-- config/
|   +-- controller/
|   |   +-- ExpenseController.java       # Expense CRUD + AI suggestions
|   |   +-- SubscriptionController.java  # Subscription CRUD + toggle
|   +-- model/
|   |   +-- Expense.java
|   |   +-- Subscription.java
|   +-- scheduler/
|   |   +-- SubscriptionScheduler.java   # Daily cron job (00:05)
|   +-- service/
|   |   +-- AiService.java               # Groq Llama 3.3 integration
|   |   +-- ExpenseService.java
|   |   +-- SubscriptionService.java
|   +-- CashWiseApplication.java
|
+-- mobile/                              # React Native App (Expo)
|   +-- App.js                           # Entry point + tab navigation
|   +-- src/
|       +-- components/
|       |   +-- AddExpenseModal.js        # Create/edit expense form + installments
|       |   +-- CategoryIcon.js           # Ionicon category icons
|       |   +-- CategoryLegend.js         # Donut chart legend
|       |   +-- CurrencyDisplay.js        # Multi-currency display
|       |   +-- ExpenseCard.js            # Expense list item
|       |   +-- ExpenseDetailModal.js     # Detail view (swipe-to-dismiss)
|       |   +-- FadeIn.js                 # Animation wrapper
|       |   +-- ForecastSection.js        # 3-month forecast
|       |   +-- MonthlyChart.js           # Bar chart (6 months + trend)
|       |   +-- SplashScreen.js           # Animated splash
|       +-- constants/
|       |   +-- categories.js             # 32 categories + icons + colors
|       |   +-- currencies.js             # 15 supported currencies
|       |   +-- theme.js                  # Design tokens (light/dark)
|       |   +-- translations.js           # PT/EN translations
|       +-- contexts/
|       |   +-- CurrencyContext.js        # Currency + live exchange rates
|       |   +-- LanguageContext.js         # i18n (persisted)
|       |   +-- ThemeContext.js            # Dark mode (persisted)
|       +-- screens/
|       |   +-- HomeScreen.js             # Dashboard + charts + expenses
|       |   +-- BudgetsScreen.js          # Budget goals per category
|       |   +-- SubscriptionsScreen.js    # Recurring expense management
|       |   +-- SettingsScreen.js         # Theme, language, currency, data
|       +-- services/
|       |   +-- api.js                    # Axios client (15s timeout)
|       |   +-- currency.js               # Exchange rate fetcher (24h cache)
|       +-- utils/
|           +-- budgets.js                # AsyncStorage budget persistence
|           +-- helpers.js                # Date formatting, filters, sorting
|
+-- frontend/                            # React Web App (Legacy)
```

---

## How AI Categorization Works

1. User creates an expense: `"Coffee at Starbucks"` without selecting a category
2. Backend sends the description to Groq's Llama 3.3-70b with a structured prompt
3. AI returns a category from the predefined list of 32 categories
4. The response is validated against the allowed list (falls back to "General" if invalid)
5. Expense is saved with the AI-suggested category

**Example:**
```json
// POST /api/expenses
{ "description": "Uber to airport", "amount": 25.00, "currency": "EUR", "date": "2026-02-06" }

// Response — category auto-assigned
{ "id": 1, "description": "Uber to airport", "amount": 25.00, "currency": "EUR", "date": "2026-02-06", "category": "Transport" }
```

---

## Security Notes

- API keys are loaded from environment variables (`${GROQ_API_KEY}`), never hardcoded
- `.env` files are excluded from version control via `.gitignore`
- CSV export includes formula injection protection (prefixes dangerous characters)
- Input validation: NaN/negative amount checks on expenses, subscriptions, and budgets
- Description fields have 200-character length limits
- API client uses 15-second request timeout
- Database credentials are loaded from environment variables (`${DB_URL}`, `${DB_USER}`, `${DB_PASSWORD}`)
- CORS is open (`*`) for development — restrict in production
- Avoid committing any local database credentials or dumps

---

## Roadmap

- [x] Backup & Restore (export/import data)
- [x] Installment tracking (2-48 parcels)
- [x] Monthly bar chart with trend analysis
- [x] 3-month spending forecast
- [ ] Income tracking + monthly balance
- [ ] Push notifications for budget alerts
- [ ] Receipt scanner (camera + AI extraction)
- [ ] PDF monthly report export
- [ ] JWT authentication
- [ ] Custom categories
- [ ] Onboarding flow for new users
- [ ] Offline-first mode with sync
- [ ] Cloud backup (Google Drive / iCloud)

---

## License

MIT License — see [LICENSE](LICENSE) for details.

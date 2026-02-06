# 💰 CashWise — AI-Powered Personal Finance Manager

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen?style=for-the-badge&logo=springboot)
![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?style=for-the-badge&logo=react)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?style=for-the-badge&logo=expo)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-blue?style=for-the-badge&logo=ai)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A full-stack personal finance application with **AI-powered expense categorization**, **automatic subscription management**, and a polished mobile experience. Built with Spring Boot + React Native (Expo).

> 📱 **Current focus: Mobile app (React Native).** The web frontend (React + Vite) was the original prototype and will be updated progressively.

---

## ✨ What Makes This Different

- 🤖 **AI Categorization** — Groq's Llama 3.3-70b automatically categorizes expenses from their description
- 🔄 **Smart Subscriptions** — Netflix, Spotify, gym — added once, expenses created automatically every month via a scheduled job
- 📊 **Visual Insights** — Interactive pie chart, monthly evolution, per-category statistics
- 🎯 **Budget Goals** — Set spending limits per category with real-time progress tracking
- 🌍 **Multi-Currency** — Live exchange rates, auto-conversion between 8 currencies
- 🌙 **Dark Mode** — System-wide dark theme across every screen and modal
- 🌐 **Bilingual** — Full Portuguese/English support with persistent language preference
- 📱 **Native Feel** — Smooth animations, swipe-to-dismiss modals, pull-to-refresh

---

## 📱 Features

### Expense Management
- Add, edit, delete expenses with AI-powered auto-categorization
- 30 categories with custom icons (Revolut-inspired)
- Expense detail view with full info (date, time added, category, currency)
- Search and sort expenses (newest, oldest, highest, lowest)
- Filter by period: This Month, Last 30 Days, All Time
- Bulk expense creation via API

### Subscriptions (Auto-Recurring)
- Create subscriptions (Monthly, Weekly, Yearly)
- Automatic expense generation via scheduled backend job (runs daily at 00:05)
- Pause/resume subscriptions with a toggle switch
- Monthly total displayed in header
- Option to create current month's expense immediately upon subscription creation

### Budget Goals
- Set monthly spending limits per category
- Visual progress bars with color-coded warnings (green → yellow → red)
- Subscription expenses automatically count toward budget limits

### Analytics & Charts
- Interactive pie chart — tap a category to see detailed expenses
- Monthly evolution line chart (last 6 months)
- Statistics: highest expense, daily average, top category

### Settings & Preferences
- Dark/Light theme (persisted)
- Language: Portuguese/English (persisted)
- Currency selection with live exchange rates
- Manual exchange rate refresh

### UX Polish
- Animated splash screen
- Cascading fade-in animations on content load
- Swipe-to-dismiss on expense detail modal
- Long-press to delete, tap to view details
- Text truncation for long descriptions

---

## 🏗️ Tech Stack

### Backend
| Tech | Purpose |
|------|---------|
| Java 21 | Language |
| Spring Boot 4.0 | Framework |
| Spring Data JPA | ORM |
| H2 Database | File-based persistent storage |
| Spring Scheduler | Automatic subscription processing |
| Groq AI API | Llama 3.3-70b for categorization |
| Maven | Build tool |

### Mobile (Active Development)
| Tech | Purpose |
|------|---------|
| React Native 0.81 | Cross-platform mobile framework |
| Expo SDK 54 | Development platform |
| React Navigation | Bottom tab navigation |
| react-native-chart-kit | Pie chart & line chart |
| AsyncStorage | Local preferences persistence |
| Axios | HTTP client |
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

## 📋 API Endpoints

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

## 🚀 Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- Maven
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

# Or create a .env file (not committed to git)
echo "GROQ_API_KEY=your_key_here" > .env

# Run the backend
./mvnw spring-boot:run
```
The API will be available at `http://localhost:8080`.

### 3. Mobile Setup
```bash
cd mobile

# Install dependencies
npm install

# Configure the API URL
cp .env.example .env
# Edit .env and set your computer's local IP:
# EXPO_PUBLIC_API_URL=http://YOUR_IP:8080/api/expenses

# Start Expo
npx expo start
```
Scan the QR code with Expo Go on your phone.

> **Important:** Your phone and computer must be on the same Wi-Fi network. Use your local IP (not `localhost`).

---

## 📁 Project Structure

> **Note:** The current development focus is on the **mobile app**. The web frontend (React + Vite) was the original prototype and will be updated over time.

```
CashWise/
│
├── src/main/java/.../cashwise/          # ☕ Spring Boot Backend
│   ├── config/
│   │   └── LocaleConfig.java
│   ├── controller/
│   │   ├── ExpenseController.java       # Expense CRUD + AI suggestions
│   │   └── SubscriptionController.java  # Subscription CRUD + toggle
│   ├── dto/
│   │   └── CategorySuggestionResponse.java
│   ├── model/
│   │   ├── Expense.java
│   │   └── Subscription.java
│   ├── repository/
│   │   ├── ExpenseRepository.java
│   │   └── SubscriptionRepository.java
│   ├── scheduler/
│   │   └── SubscriptionScheduler.java   # Daily cron job (00:05)
│   ├── service/
│   │   ├── AiService.java               # Groq Llama 3.3 integration
│   │   ├── CategoryTranslationService.java
│   │   ├── ExpenseService.java
│   │   └── SubscriptionService.java
│   └── CashWiseApplication.java
│
├── frontend/                            # 🌐 React Web App (Vite + Tailwind)
│   └── src/                             #    ⚠️ Legacy prototype — will be updated
│       ├── components/
│       │   ├── Dashboard.jsx
│       │   ├── ExpenseCard.jsx
│       │   ├── ExpenseForm.jsx
│       │   ├── ExpenseList.jsx
│       │   └── FloatingButton.jsx
│       ├── services/
│       │   └── api.js
│       ├── App.jsx
│       └── main.jsx
│
├── mobile/                              # 📱 React Native App (Expo) — Active Development
│   ├── App.js                           # Entry point + tab navigation
│   └── src/
│       ├── components/
│       │   ├── AddExpenseModal.js        # Create/edit expense form
│       │   ├── CategoryIcon.js          # SVG category icons
│       │   ├── CategoryLegend.js        # Pie chart legend
│       │   ├── CurrencyDisplay.js       # Multi-currency display
│       │   ├── ExpenseCard.js           # Expense list item
│       │   ├── ExpenseDetailModal.js    # Detail view (swipe-to-dismiss)
│       │   ├── FadeIn.js               # Animation wrapper
│       │   ├── MonthlyChart.js          # Line chart (6 months)
│       │   └── SplashScreen.js          # Animated splash
│       ├── constants/
│       │   ├── categories.js            # 30 categories + icons + colors
│       │   ├── currencies.js            # 8 supported currencies
│       │   ├── theme.js                 # Light/dark color tokens
│       │   └── translations.js          # PT/EN translations
│       ├── contexts/
│       │   ├── CurrencyContext.js        # Currency + live exchange rates
│       │   ├── LanguageContext.js        # i18n (persisted)
│       │   └── ThemeContext.js           # Dark mode (persisted)
│       ├── screens/
│       │   ├── HomeScreen.js            # Dashboard + charts + expenses
│       │   ├── BudgetsScreen.js         # Budget goals per category
│       │   ├── SubscriptionsScreen.js   # Recurring expense management
│       │   └── SettingsScreen.js        # Theme, language, currency
│       ├── services/
│       │   ├── api.js                   # Axios client
│       │   └── currency.js              # Exchange rate fetcher
│       └── utils/
│           ├── budgets.js               # AsyncStorage budget persistence
│           └── helpers.js               # Date formatting, filters, sorting
│
├── .env.example                         # Backend env template
├── mobile/.env.example                  # Mobile env template
└── frontend/.env.example                # Web env template
```

---

## 🤖 How AI Categorization Works

1. User creates an expense: `"Coffee at Starbucks"` without selecting a category
2. Backend sends the description to Groq's Llama 3.3-70b with a structured prompt
3. AI returns a category from the predefined list of 30 categories
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

## 🔒 Security Notes

- API keys are loaded from environment variables (`${GROQ_API_KEY}`), never hardcoded
- `.env` files are excluded from version control via `.gitignore`
- H2 console and debug settings are enabled for development only
- CORS is open (`*`) for development — restrict in production
- Database files (`/data/`) are excluded from version control

---

## 🛣️ Roadmap

- [ ] Backup & Restore (export/import data)
- [ ] Income tracking + monthly balance
- [ ] Push notifications for budget alerts
- [ ] Receipt scanner (camera → AI extraction)
- [ ] PDF monthly report export
- [ ] JWT authentication
- [ ] Custom categories
- [ ] Week-over-week comparison
- [ ] AI spending insights

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

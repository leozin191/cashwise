# 💰 CashWise - AI-Powered Expense Tracker

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen?style=for-the-badge&logo=springboot)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?style=for-the-badge&logo=react)
![Expo](https://img.shields.io/badge/Expo-54-black?style=for-the-badge&logo=expo)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-blue?style=for-the-badge&logo=ai)
![H2](https://img.shields.io/badge/Database-H2-darkblue?style=for-the-badge&logo=database)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Full-stack expense tracking application with **automatic AI-powered categorization** using Groq's Llama 3.3 model. Available on **Web** (React) and **Mobile** (React Native).

---

##  Tech Highlights

What makes this project stand out:

- 🤖 **Real-time AI Integration**: Automatic expense categorization using Groq's Llama 3.3-70b model
- 📱 **Multi-Platform**: Web (React) and Mobile (React Native with Expo) apps
- 🏗️ **Clean Architecture**: Layered design following SOLID principles (Controller → Service → Repository)
- 🔐 **Security First**: Secure API key management using environment variables
- 💾 **Persistent Data**: H2 file-based database ensures data survives restarts
- 🔄 **RESTful Design**: Proper HTTP methods, status codes, and JSON responses
- 📦 **Bulk Operations**: Create multiple expenses in a single request
- 🎯 **Smart Filtering**: Advanced queries by date, category, and currency
- 📊 **Interactive Charts**: Click-to-filter pie chart visualization on both Web and Mobile
- 🌐 **i18n Support**: Multi-language support (PT-BR/EN) across all platforms
- ⚡ **Performance Optimized**: Optimized state management, no duplicate calculations, efficient re-renders

---

##  Features

### Backend (Java + Spring Boot)
-  Complete RESTful API for expense management (CRUD)
-  **AI-powered automatic categorization** using Groq AI (Llama 3.3-70b)
-  Persistent H2 file-based database
-  Advanced filtering (by date, category, currency)
-  Bulk expense creation
-  Secure API key management
-  Internationalization (i18n) with Portuguese translations

### Frontend - Web (React + Vite)
-  Interactive pie chart - click categories to filter expenses
-  Real-time AI category suggestions as you type
-  Mobile-first responsive design
-  Floating action button for quick expense creation
-  Category-based filtering
-  Clean, modern UI with Tailwind CSS
-  Live data updates

### Frontend - Mobile (React Native + Expo)
-  Native mobile app for iOS and Android
-  Bottom tab navigation (Home, Add Expense)
-  Expense list with pie chart visualization
-  Interactive category modal with details
-  Real-time AI category suggestions
-  Pull-to-refresh for data updates
-  Expense creation, editing, and deletion
-  Multi-language support (PT/EN)
-  Responsive UI with custom theme system
-  Environment configuration for API endpoints

---

##  Tech Stack

### Backend
- **Language:** Java 21
- **Framework:** Spring Boot 4.0
- **Database:** H2 (file-based persistence)
- **AI:** Groq AI API (Llama 3.3-70b-versatile)
- **Build Tool:** Maven
- **ORM:** Spring Data JPA / Hibernate

### Frontend - Web
- **Library:** React 19
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios

### Frontend - Mobile
- **Framework:** React Native 0.81
- **Platform:** Expo 54
- **Charts:** react-native-chart-kit
- **Navigation:** React Navigation (Bottom Tabs)
- **HTTP Client:** Axios
- **State Management:** Context API

---

##  How AI Categorization Works

The system uses **Groq AI** to intelligently categorize expenses based on their description.

### Workflow:

1. **User creates expense** without specifying a category (or while typing)
2. **System detects** missing category field
3. **AI analyzes** the expense description using Llama 3.3-70b
4. **Category is suggested** in real-time based on contextual understanding
5. **User can accept or modify** the suggestion
6. **Expense is saved** with the chosen category

### Supported Categories:

| Category | Examples | Emoji |
|----------|----------|-------|
| Alimentação | Restaurants, cafes, groceries, food delivery | 🍔 |
| Transporte | Uber, taxi, bus, metro, gas | 🚗 |
| Moradia | Rent, utilities, maintenance | 🏠 |
| Lazer | Netflix, games, movies, concerts | 🎮 |
| Saúde | Pharmacy, doctor, gym | 💊 |
| Educação | Books, courses, tuition | 📚 |
| Compras | Clothing, electronics, shopping | 🛍️ |
| Outros | Anything that doesn't fit above | 💰 |

### Example:

**Request:**
```json
POST /api/expenses
{
  "description": "Coffee at Starbucks",
  "amount": 5.50,
  "currency": "EUR",
  "date": "2026-01-28"
}
```

**Response:**
```json
{
  "id": 1,
  "description": "Coffee at Starbucks",
  "amount": 5.50,
  "currency": "EUR",
  "date": "2026-01-28",
  "category": "Alimentação"
}
```

 **Category automatically suggested by AI and translated to Portuguese!**

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Create expense (auto-categorizes if empty) |
| POST | `/api/expenses/bulk` | Create multiple expenses |
| GET | `/api/expenses` | List all expenses |
| GET | `/api/expenses/{id}` | Get expense by ID |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |
| GET | `/api/expenses/suggest-category?description=X` | Get AI category suggestion (real-time) |
| GET | `/api/expenses/category/{category}` | Filter by category |
| GET | `/api/expenses/date/{date}` | Filter by specific date |
| GET | `/api/expenses/date-range?start=X&end=Y` | Filter by date range |
| GET | `/api/expenses/currency/{currency}` | Filter by currency |

---

##  How to Run

### Prerequisites
- Java 21+
- Node.js 18+
- Maven
- Expo CLI (for mobile): `npm install -g expo-cli`
- Groq API Key (free at https://console.groq.com)

---

### Backend Setup

**1. Clone the repository**
```bash
git clone https://github.com/leozin191/cashwise.git
cd cashwise
```

**2. Configure Groq API Key**

Create `src/main/resources/application-local.properties`:
```properties
groq.api.key=your_groq_api_key_here
```

**3. Run the backend**
```bash
./mvnw spring-boot:run
```

**4. Access**
- API: `http://localhost:8080/api/expenses`
- H2 Console: `http://localhost:8080/h2-console`
  - JDBC URL: `jdbc:h2:file:./data/cashwise`
  - Username: `sa`
  - Password: (leave empty)

---

### Frontend Setup

**1. Navigate to frontend folder**
```bash
cd frontend
```

**2. Install dependencies**
```bash
npm install
```

**3. (Optional) Configure custom API URL**

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8080/api/expenses
```

**4. Run the frontend**
```bash
npm run dev
```

**5. Access**
- Frontend: `http://localhost:5173`

---

### Mobile Setup

**1. Navigate to mobile folder**
```bash
cd mobile
```

**2. Install dependencies**
```bash
npm install
```

**3. (Optional) Configure custom API URL**

Create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:8080/api/expenses
```

For local network testing, use your machine's IP:
```
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8080/api/expenses
```

**4. Run the mobile app**
```bash
npx expo start
```

**5. View on device**
- Scan QR code with **Expo Go** app on your phone

---

##  Mobile Testing (Local Network)

### Backend Configuration:

In `src/main/resources/application.properties`, add:
```properties
server.address=0.0.0.0
```

### Frontend Configuration:

1. Get your local IP: 
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig`

2. Create `frontend/.env.local`:
```
VITE_API_URL=http://YOUR_LOCAL_IP:8080/api/expenses
```

3. Access from mobile device (same WiFi):
```
http://YOUR_LOCAL_IP:5173
```

---

##  Project Structure
```
cashwise/
├── src/main/java/com/leozara/cashwise/
│   ├── controller/          # REST API endpoints
│   ├── service/             # Business logic + AI integration
│   │   ├── ExpenseService.java
│   │   ├── AiService.java
│   │   └── CategoryTranslationService.java
│   ├── repository/          # Data access layer
│   ├── model/               # JPA entities
│   ├── dto/                 # Data transfer objects
│   └── config/              # Configuration classes
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ExpenseForm.jsx
│   │   │   ├── ExpenseCard.jsx
│   │   │   └── FloatingButton.jsx
│   │   └── services/        # API integration
│   │       └── api.js
│   └── ...
│
├── mobile/
│   ├── src/
│   │   ├── components/      # React Native components
│   │   │   ├── AddExpenseModal.js
│   │   │   ├── ExpenseCard.js
│   │   │   └── CategoryLegend.js
│   │   ├── screens/         # App screens
│   │   │   ├── HomeScreen.js
│   │   │   └── AddExpenseScreen.js
│   │   ├── constants/       # Configuration & themes
│   │   │   ├── categories.js
│   │   │   ├── theme.js
│   │   │   └── translations.js
│   │   ├── contexts/        # Context API
│   │   │   └── LanguageContext.js
│   │   ├── services/        # API integration
│   │   │   └── api.js
│   │   └── utils/           # Utility functions
│   │       └── helpers.js
│   ├── app.json
│   └── package.json
│
└── src/main/resources/
    ├── messages.properties          # English translations
    ├── messages_pt_BR.properties    # Portuguese translations
    └── application.properties
```

---

## 💡 Why This Project?

This project demonstrates:

- ✅ **Modern Backend Development**: Latest Spring Boot 4.0 with Java 21
- ✅ **AI/ML Integration**: Practical use of AI APIs in real-world applications
- ✅ **Full-Stack Skills**: Complete application from database to UI (Web & Mobile)
- ✅ **Multi-Platform Development**: React for Web, React Native for Mobile
- ✅ **API Design**: RESTful principles and best practices
- ✅ **State Management**: Optimized state handling across different platforms
- ✅ **Problem Solving**: Automating tedious manual categorization tasks
- ✅ **Production-Ready Code**: Proper error handling, validation, and security
- ✅ **Mobile-First**: Responsive design optimized for mobile devices
- ✅ **i18n**: Multi-language support showing enterprise-level features

Perfect for showcasing in a **developer portfolio** or as a **learning project** for full-stack development with AI integration across multiple platforms.

---

##  Future Improvements

### Planned Features:
- [ ]  Implement JWT authentication for multi-user support
- [ ]  Add expense editing functionality
- [ ]  Create advanced analytics dashboard with charts
- [ ]  Export expenses to CSV/Excel
- [ ]  Integration with Open Banking APIs (Brazil)
- [ ]  Add comprehensive unit and integration tests
- [ ]  Docker containerization
- [ ]  Deploy to cloud (Vercel + Railway/Heroku)
- [ ]  Dark mode support
- [ ]  Monthly/yearly spending reports
- [ ]  Budget alerts and notifications
- [ ]  Multi-currency conversion with live rates

### Contributions Welcome!
Feel free to open issues or submit pull requests for any of these features!

---

##  Security Notes

- API keys are stored in `application-local.properties` (not committed to Git)
- Frontend uses environment variables for API configuration
- CORS is configured for development (should be restricted in production)
- H2 console is enabled for development (should be disabled in production)

---

##  Author

**Developed in Dublin, IE 🇮🇪**

Built as a learning project to demonstrate full-stack development with AI integration.

---

##  License

This project is open source and available under the [MIT License](LICENSE).

---

##  Acknowledgments

- **Groq** for providing free AI API access
- **Spring Boot** team for the excellent framework
- **React** and **Vite** teams for modern frontend tooling
- **Tailwind CSS** for utility-first styling

---

**⭐ If you found this project helpful, please consider giving it a star!**

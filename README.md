# CashWise - AI-Powered Expense Tracker

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-brightgreen?style=for-the-badge&logo=springboot)
![AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-blue?style=for-the-badge&logo=ai)
![H2](https://img.shields.io/badge/Database-H2-darkblue?style=for-the-badge&logo=database)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Expense tracking REST API with **automatic categorization using AI**.


## Features

- Complete RESTful API for expense management (CRUD)
- **AI-powered automatic categorization** using Groq AI (Llama 3.3-70b)
- Persistent H2 file-based database
- Advanced filtering (by date, category, currency)
- Bulk expense creation
- Secure API key management


## Tech Highlights

What makes this project stand out:

- 🤖 **Real-time AI Integration**: Automatic expense categorization using Groq's Llama 3.3-70b model
- 🏗️ **Clean Architecture**: Layered design following SOLID principles (Controller → Service → Repository)
- 🔐 **Security First**: Secure API key management using environment variables
- 💾 **Persistent Data**: H2 file-based database ensures data survives restarts
- 🔄 **RESTful Design**: Proper HTTP methods, status codes, and JSON responses
- 📦 **Bulk Operations**: Create multiple expenses in a single request
- 🎯 **Smart Filtering**: Advanced queries by date, category, and currency

## Tech Stack

- **Backend:** Java 21, Spring Boot 4.0
- **Database:** H2 (file-based persistence)
- **AI:** Groq AI API (Llama 3.3-70b-versatile)
- **Build Tool:** Maven
- **ORM:** Spring Data JPA / Hibernate

## How AI Categorization Works

The system uses **Groq AI** to intelligently categorize expenses based on their description.

### Workflow:

1. **User creates expense** without specifying a category
2. **System detects** missing category field
3. **AI analyzes** the expense description using Llama 3.3-70b
4. **Category is suggested** based on contextual understanding
5. **Expense is saved** with the AI-suggested category

### Supported Categories:

| Category | Examples |
|----------|----------|
| 🍔 Food | Restaurants, cafes, groceries, food delivery |
| 🚗 Transport | Uber, taxi, bus, metro, gas |
| 🏠 Housing | Rent, utilities, maintenance |
| 🎮 Entertainment | Netflix, games, movies, concerts |
| 💊 Health | Pharmacy, doctor, gym |
| 📚 Education | Books, courses, tuition |
| 🛍️ Shopping | Clothing, electronics, general shopping |
| 💰 Other | Anything that doesn't fit above categories |

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
  "category": "Food"
}
```

✨ **Category automatically suggested by AI!**


## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expenses` | Create expense (auto-categorizes if empty) |
| POST | `/api/expenses/bulk` | Create multiple expenses |
| GET | `/api/expenses` | List all expenses |
| GET | `/api/expenses/{id}` | Get expense by ID |
| PUT | `/api/expenses/{id}` | Update expense |
| DELETE | `/api/expenses/{id}` | Delete expense |
| GET | `/api/expenses/category/{category}` | Filter by category |
| GET | `/api/expenses/date/{date}` | Filter by specific date |
| GET | `/api/expenses/date-range?start=X&end=Y` | Filter by date range |
| GET | `/api/expenses/currency/{currency}` | Filter by currency |
| GET | `/api/expenses/suggest-category?description=X` | Get AI category suggestion (real-time) |

## How to Run

### Prerequisites
- Java 21+
- Maven
- Groq API Key (free at https://console.groq.com)

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/leozin191/cashwise.git
cd cashwise
```

2. **Configure API Key**

Create a `.env` file based on `.env.example` and add your Groq API key:

GROQ_API_KEY=your_api_key_here

Or alternatively, set it as an environment variable in your IDE or system.

```properties
groq.api.key=${GROQ_API_KEY}
```

3. **Run the application**
```bash
./mvnw spring-boot:run
```

4. **Access**
- API: `http://localhost:8080/api/expenses`
- H2 Console: `http://localhost:8080/h2-console`
  - JDBC URL: `jdbc:h2:file:./data/cashwise`
  - Username: `sa`
  - Password: (leave empty)

## Project Structure
```
src/main/java/com/leozara/cashwise/
├── controller/     # REST API endpoints
├── service/        # Business logic + AI integration
├── repository/     # Data access layer
└── model/          # Entity classes
```

##  Future Improvements

### Planned Features:
- [ ] 🌐 Map AI categories to Portuguese (PT-BR localization)
- [ ] 🎨 Build React frontend with real-time category suggestions
- [ ] 📊 Add expense analytics and statistics dashboard
- [ ] 🔐 Implement JWT authentication for multi-user support
- [ ] 📈 Create data visualization with charts and graphs
- [ ] 📤 Export expenses to CSV/Excel
- [ ] 🏦 Integration with Open Banking APIs (Brazil)
- [ ] 🧪 Add comprehensive unit and integration tests
- [ ] 🐳 Docker containerization
- [ ] ☁️ Deploy to cloud (AWS/Heroku)

### Contributions Welcome!
Feel free to open issues or submit pull requests for any of these features!

##  Why This Project?

This project demonstrates:

- ✅ **Modern Backend Development**: Latest Spring Boot 4.0 with Java 21
- ✅ **AI/ML Integration**: Practical use of AI APIs in real-world applications
- ✅ **API Design**: RESTful principles and best practices
- ✅ **Problem Solving**: Automating tedious manual categorization tasks
- ✅ **Production-Ready Code**: Proper error handling, validation, and security

Perfect for showcasing in a **developer portfolio** or as a **learning project** for Spring Boot + AI integration.

## Author

Developed in Dublin, IE 🇮🇪

## License

This project is open source and available under the MIT License.

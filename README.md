# CashWise - AI-Powered Expense Tracker

Expense tracking REST API with **automatic categorization using AI**.

## Features

- Complete RESTful API for expense management (CRUD)
- **AI-powered automatic categorization** using Groq AI (Llama 3.3-70b)
- Persistent H2 file-based database
- Advanced filtering (by date, category, currency)
- Bulk expense creation
- Secure API key management

## Tech Stack

- **Backend:** Java 21, Spring Boot 4.0
- **Database:** H2 (file-based persistence)
- **AI:** Groq AI API (Llama 3.3-70b-versatile)
- **Build Tool:** Maven
- **ORM:** Spring Data JPA / Hibernate

## How AI Categorization Works

When creating an expense **without a category**, the system:

1. Analyzes the description using Groq AI
2. Automatically suggests the appropriate category
3. Saves the expense with the AI-suggested category

**Supported Categories:** Food, Transport, Housing, Entertainment, Health, Education, Shopping, Other

**Example Request:**
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
** Category automatically suggested by AI!**

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

Create `src/main/resources/application-local.properties`:
```properties
groq.api.key=your_groq_api_key_here
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

## Future Improvements

- [ ] Add authentication (JWT)
- [ ] Map AI categories to Portuguese
- [ ] Create category suggestion endpoint
- [ ] Build React frontend
- [ ] Add expense analytics/statistics
- [ ] Export to CSV
- [ ] Integration with Open Banking APIs

## Author

Developed in Dublin, IE 🇮🇪

## License

This project is open source and available under the MIT License.

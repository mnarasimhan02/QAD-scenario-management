# QAD Scenario Management System

A comprehensive Flask-based Query Anomaly Detection (QAD) Scenario Management web application that provides advanced clinical data validation through intelligent scenario generation and AI-powered insights.

## 🎯 Overview

The QAD Scenario Management System is designed for pharmaceutical research teams to manage clinical data quality assurance scenarios. It combines manual scenario creation with AI-powered generation to streamline the development of data validation rules for clinical trials.

### Key Features

- **Out-of-the-Box Scenarios**: Pre-loaded clinical validation scenarios with toggle functionality
- **AI-Powered Scenario Generation**: OpenAI GPT-4o integration for intelligent child scenario creation
- **DRP Management**: Bulk CSV upload processing for Data Review Plan scenarios
- **SDQ Package Generation**: Automated creation of Smart Data Quality packages
- **Interactive UI**: Modern Bootstrap-based interface with tabbed navigation
- **Flexible Search & Filtering**: Multi-criteria scenario discovery and organization

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key (for AI-powered features)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qad-scenario-management
   ```

2. **Set up environment variables**
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export SESSION_SECRET="your-session-secret"
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   # Or using the built-in package manager
   ```

4. **Run the application**
   ```bash
   gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
   ```

5. **Access the application**
   Open your browser to `http://localhost:5000`

## 📋 System Components

### 1. Out of the Box Scenarios Tab
- View pre-loaded clinical validation scenarios
- Toggle scenario active/inactive status
- Expand/collapse child scenarios
- Search and filter by tags, domains, and text

### 2. Create Scenario Tab
- Manual parent scenario creation
- AI-powered child scenario suggestions
- Interactive scenario selection interface
- Automatic query text and Python code generation

### 3. Recommend Scenario Tab
- Add selected scenarios to study configuration
- Professional table format with expandable details
- Edit and remove study scenarios
- Export study configurations

### 4. DRP Management Tab
- CSV file upload for bulk scenario processing
- Automated scenario generation with CDASH mapping
- SDQ package creation and download
- Enhanced Python code and prompt template generation

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `SESSION_SECRET` | Flask session secret key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | No* |

*Database URL is configured but not required for basic functionality

### AI Configuration

The system uses OpenAI GPT-4o for:
- Child scenario generation
- Scenario name and tag suggestions
- Query text generation
- Python code generation for data validation

## 📊 Data Format

### CSV Upload Format (DRP Management)

The system accepts CSV files with the following columns:

| Column | Description | Required |
|--------|-------------|----------|
| Category | Scenario category/type | Yes |
| Rule Description | Detailed scenario description | Yes |
| Query Text | Pre-written query text (optional) | No |
| CDASH Items | Comma-separated CDASH variables | No |
| Domain | CDISC domain (AE, EX, etc.) | No |
| Priority | Priority level (High, Medium, Low) | No |

### Example CSV Row
```csv
Category,Rule Description,Query Text,CDASH Items
Safety,"CTCAE grade missing for oncology AE","For AE records in oncology studies, flag records where CTCAE_GRADE is missing.","AEACN,AEDECOD,CTCAE_GRADE"
```

## 🎨 User Interface

### Navigation
- **Bootstrap 5 Tabbed Interface**: Four main tabs for different workflows
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Icon Integration**: Font Awesome icons for intuitive navigation

### Interactive Features
- **Expandable Tables**: Click to view detailed scenario information
- **Modal Forms**: Dynamic forms for scenario creation and editing
- **Real-time Search**: Instant filtering and highlighting
- **Drag & Drop**: CSV file upload with progress indicators

### Visual Design
- **Professional Styling**: Clean, medical-grade interface design
- **Color-coded Tags**: Subtle gray badges for scenario categorization
- **Status Indicators**: Visual feedback for active/inactive scenarios
- **Progress Tracking**: Real-time feedback during AI generation

## 🔍 Search & Filtering

### Available Filters
- **Text Search**: Full-text search across scenario names and descriptions
- **Tag Filters**: Filter by Safety, Efficacy, Data Quality, Compliance, etc.
- **Domain Filters**: Filter by CDISC domains (AE, EX, LB, etc.)
- **Status Filters**: Show active, inactive, or all scenarios

### Search Features
- **Highlight Matching**: Search terms highlighted in results
- **Auto-expand**: Scenarios with matches automatically expanded
- **Combined Filters**: Multiple filters can be applied simultaneously

## 🤖 AI Integration

### Scenario Generation
The AI system generates:
- **Child Scenarios**: 5 related scenarios based on parent information
- **CDASH Mapping**: Appropriate CDISC variables for each scenario
- **Query Text**: Clinical descriptions within 300 characters
- **Python Code**: Executable validation logic
- **Prompt Templates**: SDQ integration templates

### Generation Process
1. **Input Analysis**: Parent scenario description and context
2. **Medical Context**: Clinical domain and safety considerations
3. **CDISC Compliance**: Proper variable mapping and terminology
4. **Code Generation**: Python functions for data validation
5. **Template Creation**: EDC integration and API structure

## 📦 Export & Download

### Available Exports
- **CSV Export**: All scenarios with complete metadata
- **DRP with Code**: Enhanced CSV with Python validation code
- **SDQ Package**: Complete Smart Data Quality integration package

### File Formats
- **Scenarios CSV**: Standard scenario export format
- **Enhanced DRP**: Original data plus generated code and templates
- **SDQ ZIP**: Package ready for clinical data management systems

## 🛠️ Technical Architecture

### Backend Stack
- **Flask 3.1.1**: Web framework with Jinja2 templating
- **Python 3.11**: Core application runtime
- **OpenAI API**: GPT-4o integration for AI features
- **Gunicorn**: Production WSGI server

### Frontend Stack
- **Bootstrap 5.3.0**: CSS framework and components
- **Vanilla JavaScript**: Client-side interactions and API calls
- **Font Awesome 6.4.0**: Icon library
- **Custom CSS**: Application-specific styling

### Data Management
- **In-Memory Storage**: Python dataclass-based models
- **Session Management**: Flask session handling
- **File Processing**: CSV parsing and Excel integration

## 🔐 Security

### Data Protection
- **Session Security**: Secure session key configuration
- **API Key Management**: Environment-based secret handling
- **Input Validation**: Comprehensive CSV and form validation

### Access Control
- **No Authentication**: Single-user application design
- **Data Isolation**: Session-based data separation
- **Secure Uploads**: File type and size validation

## 🚀 Deployment

### Development
```bash
# Run with Flask development server
python main.py
```

### Production
```bash
# Run with Gunicorn
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
```

### Replit Deployment
The application is optimized for Replit deployment with:
- Automatic dependency management
- Environment variable configuration
- Port binding optimization
- Auto-scaling support

## 📈 Performance

### Optimization Features
- **Lazy Loading**: Child scenarios loaded on demand
- **Efficient Search**: Client-side filtering for instant results
- **Minimal API Calls**: Batch operations where possible
- **Caching**: Session-based caching for AI responses

### Scalability
- **Stateless Design**: Each request independent
- **Memory Efficient**: Optimized data structures
- **Parallel Processing**: Concurrent AI generation support

## 🧪 Testing

### Manual Testing
- **Scenario Creation**: Test all scenario types and variations
- **CSV Upload**: Validate various CSV formats and edge cases
- **AI Generation**: Verify AI response quality and consistency
- **Export Functions**: Test all download and export features

### Validation Points
- **CSV Format**: Header validation and data integrity
- **AI Responses**: Medical accuracy and CDISC compliance
- **File Exports**: Complete data preservation
- **UI Interactions**: Cross-browser compatibility

## 📚 Usage Examples

### Creating a New Scenario
1. Navigate to "Create Scenario" tab
2. Enter scenario name and description
3. Click "Generate Child Scenarios" for AI suggestions
4. Select relevant child scenarios
5. Review and submit

### Processing DRP Files
1. Go to "DRP Management" tab
2. Upload CSV file with scenario rules
3. Click "Process DRP" to generate code
4. Review generated scenarios
5. Download enhanced DRP or SDQ package

### Managing Study Scenarios
1. Use "Recommend Scenario" tab
2. Add scenarios from other tabs
3. Edit scenario details as needed
4. Export final study configuration

## 🤝 Contributing

### Development Guidelines
- Follow Python PEP 8 style guidelines
- Use Bootstrap components for UI consistency
- Maintain AI prompt templates in separate files
- Document all new features and API endpoints

### Code Structure
- `main.py`: Application entry point
- `app.py`: Flask application configuration
- `routes.py`: HTTP endpoint handlers
- `models.py`: Data model definitions
- `ai_generator.py`: OpenAI integration
- `static/`: Frontend assets (CSS, JS, images)
- `templates/`: Jinja2 HTML templates

## 📄 License

This project is proprietary software developed for pharmaceutical research applications.

## 📞 Support

For technical support or questions:
- Review the architecture documentation
- Check the troubleshooting section
- Contact the development team

---

**Version**: 1.0  
**Last Updated**: June 2025  
**Python Version**: 3.11+  
**Flask Version**: 3.1.1
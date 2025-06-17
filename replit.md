# QAD Scenario Management System

## Overview

This is a Flask-based web application for managing clinical data quality assurance scenarios in pharmaceutical research. The system provides a comprehensive interface for managing Out-of-the-Box (OOTB) scenarios, creating custom scenarios, and recommending scenarios based on clinical domains and tags.

## System Architecture

### Backend Architecture
- **Framework**: Flask web framework with Python 3.11
- **Application Structure**: Modular design with clear separation of concerns
  - `app.py`: Flask application initialization and configuration
  - `routes.py`: HTTP route handlers and request processing
  - `models.py`: Data models using Python dataclasses
  - `data.py`: In-memory data storage and business logic
  - `main.py`: Application entry point

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap 5 UI framework
- **Styling**: Custom CSS with Bootstrap components and Font Awesome icons
- **JavaScript**: Vanilla JavaScript for interactive features
- **Responsive Design**: Mobile-first approach with Bootstrap responsive grid

### Data Storage Architecture
- **Storage Type**: In-memory storage using Python data structures
- **Models**: Dataclass-based models for type safety and structure
- **Initialization**: Pre-loaded OOTB scenarios on application startup

## Key Components

### Core Models
- **ParentScenario**: Top-level scenario container with metadata and single tag
- **ChildScenario**: Detailed scenario specifications with CDASH items, domains, reasoning templates, and optional pseudo code
- **Tag**: Simplified categorization system with subtle gray badges
- **ScenarioStorage**: In-memory data management with search capabilities

### AI Integration
- **ScenarioGenerator**: OpenAI GPT-4o powered child scenario generation
- **Smart Generation**: Creates 5 related child scenarios based on parent information
- **CDISC Compliance**: Generates appropriate CDASH items and domain mappings
- **Pseudo Code**: Includes executable logic for anomaly detection
- **Child Scenario Suggestions**: AI-powered suggestions in Create Scenario tab with user selection interface
- **Auto-Generation Workflow**: Description-driven scenario creation with automatic name and tag assignment
- **Real-time API**: `/api/suggest-child-scenarios` and `/api/generate-scenario-metadata` endpoints

### UI Components
- **Tabbed Interface**: Four main tabs (OOTB, Create, Recommend, DRP Management)
- **Scenario Tables**: Bootstrap-styled tables with expand/collapse functionality
- **AI Generation**: Magic wand button for automated child scenario creation
- **Modal Forms**: Dynamic forms for manual scenario creation and editing
- **Search & Filter**: Real-time filtering by tags, domains, and text search
- **DRP Management**: CSV upload, processing, and SDQ package generation interface

### Business Logic
- **Scenario Management**: CRUD operations for custom scenarios
- **AI-Powered Generation**: Automated child scenario creation using clinical expertise
- **OOTB Scenarios**: Pre-loaded clinical scenarios with toggle functionality
- **Single Tag System**: Streamlined categorization (Safety, Efficacy, Data Quality, Compliance, Protocol Deviation, Other)
- **Export Functionality**: CSV export capabilities for scenarios
- **Smart Suggestions**: AI-driven child scenario recommendations during parent scenario creation
- **Interactive Selection**: User-friendly interface for choosing relevant child scenarios from AI suggestions
- **DRP Management**: Complete CSV upload, processing, and SDQ package generation workflow

## Data Flow

1. **Application Initialization**
   - Flask app creates singleton storage instance
   - Pre-loaded OOTB scenarios are initialized with sample clinical data
   - Static assets and templates are registered

2. **User Interactions**
   - Frontend sends requests to Flask routes
   - Routes interact with storage layer for data operations
   - Templates render dynamic content based on data state
   - JavaScript handles client-side interactions and UI updates

3. **Scenario Processing**
   - Search queries filter scenarios by multiple criteria
   - Tag and domain filters provide categorized views
   - Active/inactive toggles control scenario visibility
   - Export functions generate downloadable data formats

## External Dependencies

### Python Dependencies
- **Flask 3.1.1**: Core web framework
- **Flask-SQLAlchemy 3.1.1**: Database abstraction (configured but not actively used)
- **Gunicorn 23.0.0**: WSGI HTTP server for production deployment
- **OpenAI 1.x**: AI-powered child scenario generation using GPT-4o
- **psycopg2-binary 2.9.10**: PostgreSQL adapter (available for future use)
- **email-validator 2.2.0**: Email validation utilities

### Frontend Dependencies
- **Bootstrap 5.3.0**: CSS framework via CDN
- **Font Awesome 6.4.0**: Icon library via CDN
- **Custom CSS/JS**: Application-specific styling and interactions

## Deployment Strategy

### Development Environment
- **Runtime**: Python 3.11 with Nix package management
- **Server**: Flask development server with hot reload
- **Port**: Application runs on port 5000
- **Debug Mode**: Enabled for development with detailed error reporting

### Production Environment
- **Server**: Gunicorn WSGI server with auto-scaling deployment
- **Configuration**: Environment-based configuration with secure session keys
- **Scaling**: Autoscale deployment target for handling variable load
- **Database Ready**: PostgreSQL configured for future database integration

### Deployment Configuration
- **Nix Channel**: stable-24_05 for consistent package management
- **Required Packages**: OpenSSL and PostgreSQL system dependencies
- **Process Management**: Parallel workflow execution with port monitoring

## Changelog

```
Changelog:
- June 14, 2025. Initial setup
- June 14, 2025. Enhanced AI child scenario generation with specific edit check rules
- June 14, 2025. Implemented study scenario management with add/edit/remove functionality
- June 14, 2025. Updated AI prompts to generate precise clinical data validation rules with exact CDASH conditions
- June 14, 2025. Enhanced scenario name generation with professional clinical terminology and pattern matching
- June 14, 2025. Converted Study Scenarios to professional table format with expandable rows
- June 14, 2025. Added collapsible Python code sections for cleaner interface
- June 14, 2025. Changed "Reasoning" to "Query Text" with 300-character limit and precise SQL generation
- June 14, 2025. Enhanced edit scenario functionality with automatic query text and Python code updates
- June 14, 2025. Implemented universal query text generation for every child scenario in creation and edit screens
- June 14, 2025. Added query text fields to child scenario creation modal with automatic generation
- June 14, 2025. Updated interface to ensure business users can access query text for all child scenarios
- June 14, 2025. Implemented complete DRP Management system with CSV upload, scenario processing, and SDQ package generation
- June 14, 2025. Added AESTDT and date field pattern recognition for real-time query text and Python code updates
- June 14, 2025. Enhanced SDQ workflow with prompt templates showing EDC deep links and API integration structure
- June 15, 2025. Fixed CSV upload validation to handle flexible column formats including "Category" and "Rule Description"
- June 15, 2025. Enhanced CSV processing with proper quote handling and detailed error feedback
- June 15, 2025. Added comprehensive validation with specific column name matching for various CSV formats
- June 15, 2025. Created comprehensive README.md with complete system documentation and usage instructions
- June 15, 2025. Created detailed architecture.md with technical specifications, data flow diagrams, and deployment guidelines
- June 16, 2025. Implemented incremental condition parsing for stable query text and Python code updates
- June 16, 2025. Enhanced condition recognition for null/not null, comparison operators, and logical operators (AND/OR)
- June 16, 2025. Added SDQ prompt templates to DRP Management with EDC deep links and API integration workflows
- June 16, 2025. Created comprehensive SDQ templates including outbound processing, notification systems, and query management
- June 16, 2025. Implemented complete DRP-to-scenario integration workflow with parent-child scenario creation
- June 16, 2025. Added OOTB scenario suggestion system based on DRP domains with selective integration
- June 16, 2025. Created Integrated Data Review Assistant with bulk scenario management and export capabilities
- June 16, 2025. Redesigned UI with enhanced visual workflow including numbered progress indicators, animated progress bars, and step-by-step guidance
- June 16, 2025. Reordered navigation tabs to start with DRP Management as the primary entry point for the workflow
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
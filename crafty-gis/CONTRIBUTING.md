# Contributing to CRAFTY GIS

First off, thank you for considering contributing to CRAFTY GIS! 🌍

CRAFTY GIS is an open-source, AI-powered geospatial intelligence platform. We welcome contributions from everyone — whether you're a GIS professional, a remote sensing researcher, a Python/TypeScript developer, a UI/UX designer, or someone passionate about making Earth observation data accessible to all.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [project maintainers](mailto:akshitvinay4636@gmail.com).

## How Can I Contribute?

### 🐛 Reporting Bugs

Before submitting a bug report:
- Check the [issue tracker](https://github.com/virahitvin8/crafty-gis/issues) for existing reports
- Ensure the bug is reproducible with the latest version
- Include as much detail as possible

**When reporting a bug, please include:**
- A clear, descriptive title
- Steps to reproduce the behavior
- Expected behavior vs actual behavior
- Screenshots or logs if applicable
- Your environment (OS, Python version, Node version, browser)

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as [GitHub issues](https://github.com/yourusername/crafty-gis/issues).

**When suggesting an enhancement, please include:**
- A clear, descriptive title
- A detailed description of the proposed feature
- Any relevant examples, mockups, or references
- Why this enhancement would be useful to most users

### 🔧 Setting Up Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/virahitvin8/crafty-gis.git
cd crafty-gis

# Backend setup
cd crafty-gis-server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dev dependencies

# Frontend setup
cd ../crafty-gis-client
npm install

# Start development servers
# Terminal 1: Backend
cd crafty-gis-server
python -m app.main

# Terminal 2: Frontend
cd crafty-gis-client
npm run dev
```

### 📝 Coding Standards

#### Python (Backend)
- **Style**: Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- **Linting**: Use `ruff` for linting
- **Type Hints**: Use type hints for all function signatures
- **Docstrings**: Google-style docstrings for all public functions/classes
- **Formatting**: Use `black` with default settings
- **Imports**: Sort imports using `isort`

```python
# Example
from typing import Optional

def compute_ndvi(
    nir_band: str,
    red_band: str,
    output_path: Optional[str] = None,
) -> float:
    """Compute Normalized Difference Vegetation Index.
    
    Args:
        nir_band: Path to NIR band raster
        red_band: Path to red band raster
        output_path: Optional output path for NDVI raster
        
    Returns:
        Mean NDVI value for the study area
    """
    ...
```

#### TypeScript/React (Frontend)
- **Style**: Follow the existing codebase conventions
- **Linting**: ESLint with the project's configuration
- **Formatting**: Prettier with project's configuration
- **Components**: Functional components with hooks
- **Types**: TypeScript strict mode, avoid `any`

### 🔄 Git Workflow

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** following the coding standards
4. **Write/update tests** as appropriate
5. **Run tests**: 
   - Backend: `cd crafty-gis-server && python -m pytest`
   - Frontend: `cd crafty-gis-client && npm test`
6. **Commit your changes**: Use clear, descriptive commit messages
   ```
   feat: add Sentinel-2 cloud masking algorithm
   fix: correct NDVI band calculation for Landsat 8
   docs: update API documentation for analysis endpoints
   ```
7. **Push** to your fork: `git push origin feature/your-feature-name`
8. **Open a Pull Request** against the `main` branch

### 📋 Pull Request Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests pass (backend & frontend)
- [ ] New features include appropriate tests
- [ ] Documentation is updated (README, API docs, comments)
- [ ] Changes are backward compatible (or breaking changes are documented)
- [ ] Commit messages follow convention
- [ ] PR title follows format: `type(scope): description`

### 🧪 Testing Guidelines

#### Backend Tests
```bash
cd crafty-gis-server

# Run all tests
python -m pytest

# Run with coverage
python -m pytest --cov=app --cov-report=term

# Run specific test file
python -m pytest tests/test_gis_processor.py
```

#### Frontend Tests
```bash
cd crafty-gis-client

# Run tests
npm test

# Run linting
npm run lint

# TypeScript type check
npx tsc --noEmit
```

### 📚 Documentation

- Update the README if you change functionality
- Add JSDoc/docstrings for new functions and classes
- Update API documentation if endpoints change
- Keep the ROADMAP up to date if adding major features

### 🤝 Community

- Join the discussion in [GitHub Discussions](https://github.com/virahitvin8/crafty-gis/discussions)
- Share your use cases and results
- Help others in issues and discussions

## 📄 License

By contributing to CRAFTY GIS, you agree that your contributions will be licensed under the [GNU General Public License v3.0](LICENSE).

## 🙏 Recognition

Contributors will be:
- Listed in the project's README contributors section
- Credited in release notes
- Considered for maintainer roles based on contribution quality and consistency

---

<p align="center">
  <b>Built for the community, by the community 🌍</b>
</p>

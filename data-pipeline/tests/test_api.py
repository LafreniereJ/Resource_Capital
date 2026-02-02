"""
Integration tests for the FastAPI endpoints.
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create test client for FastAPI app."""
    from api.main import app
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_200(self, client):
        response = client.get('/health')
        assert response.status_code == 200

    def test_health_returns_status(self, client):
        response = client.get('/health')
        data = response.json()
        assert 'status' in data


class TestCompaniesEndpoint:
    """Tests for /companies endpoints."""

    @patch('api.main.get_all_companies')
    def test_list_companies(self, mock_get, client):
        mock_get.return_value = [
            {'id': 1, 'ticker': 'ABX', 'name': 'Barrick Gold'},
            {'id': 2, 'ticker': 'NEM', 'name': 'Newmont'},
        ]

        response = client.get('/companies')

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]['ticker'] == 'ABX'

    @patch('api.main.get_company_by_ticker')
    def test_get_company_by_ticker(self, mock_get, client):
        mock_get.return_value = {
            'id': 1,
            'ticker': 'ABX',
            'name': 'Barrick Gold Corporation',
            'current_price': 23.45,
        }

        response = client.get('/companies/ABX')

        assert response.status_code == 200
        data = response.json()
        assert data['ticker'] == 'ABX'
        assert data['current_price'] == 23.45

    @patch('api.main.get_company_by_ticker')
    def test_company_not_found(self, mock_get, client):
        mock_get.return_value = None

        response = client.get('/companies/INVALID')

        assert response.status_code == 404


class TestMetalsEndpoint:
    """Tests for /metals endpoints."""

    @patch('api.main.get_metal_prices')
    def test_list_metals(self, mock_get, client):
        mock_get.return_value = [
            {'commodity': 'gold', 'price': 2024.50, 'change_percent': 0.45},
            {'commodity': 'silver', 'price': 23.80, 'change_percent': -0.15},
        ]

        response = client.get('/metals')

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2


class TestNewsEndpoint:
    """Tests for /news endpoints."""

    @patch('api.main.get_news')
    def test_list_news(self, mock_get, client):
        mock_get.return_value = [
            {
                'id': 1,
                'title': 'Test Article',
                'source': 'Mining.com',
                'url': 'https://example.com',
            }
        ]

        response = client.get('/news')

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    @patch('api.main.get_news')
    def test_news_with_limit(self, mock_get, client):
        mock_get.return_value = [{'id': i} for i in range(5)]

        response = client.get('/news?limit=5')

        assert response.status_code == 200
        mock_get.assert_called()


class TestSearchEndpoint:
    """Tests for /search endpoint."""

    @patch('api.main.search_companies')
    def test_search_companies(self, mock_search, client):
        mock_search.return_value = [
            {'id': 1, 'ticker': 'ABX', 'name': 'Barrick Gold'},
        ]

        response = client.get('/search?q=barrick')

        assert response.status_code == 200

    def test_search_requires_query(self, client):
        response = client.get('/search')

        # Should return 422 (validation error) or handle gracefully
        assert response.status_code in [400, 422]


class TestProjectsEndpoint:
    """Tests for /projects endpoints."""

    @patch('api.main.get_projects_geo')
    def test_get_project_locations(self, mock_get, client):
        mock_get.return_value = [
            {
                'id': 1,
                'name': 'Detour Lake',
                'latitude': 49.85,
                'longitude': -79.68,
                'commodity': 'Gold',
            }
        ]

        response = client.get('/projects/geo')

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert 'latitude' in data[0]
        assert 'longitude' in data[0]


class TestJobsEndpoint:
    """Tests for /jobs endpoints (job tracking)."""

    @patch('api.main.get_recent_jobs')
    def test_list_recent_jobs(self, mock_get, client):
        mock_get.return_value = [
            {
                'id': 'job-123',
                'job_type': 'stock_prices',
                'status': 'completed',
                'records_processed': 203,
            }
        ]

        response = client.get('/jobs')

        assert response.status_code == 200


class TestDetailedHealthEndpoint:
    """Tests for /health/detailed endpoint."""

    @patch('api.main.get_detailed_health')
    def test_detailed_health(self, mock_get, client):
        mock_get.return_value = {
            'status': 'healthy',
            'database': True,
            'last_stock_update': '2024-01-15T10:00:00',
            'last_news_update': '2024-01-15T10:05:00',
        }

        response = client.get('/health/detailed')

        assert response.status_code == 200
        data = response.json()
        assert 'status' in data

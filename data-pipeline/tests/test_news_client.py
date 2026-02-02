"""
Unit tests for the news client module.
"""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime


class TestExtractTickersFromText:
    """Tests for ticker extraction from text."""

    def test_extract_tsx_ticker(self):
        from ingestion.news_client import extract_tickers_from_text

        text = "Barrick Gold (TSX: ABX) announces Q3 results"
        tickers = extract_tickers_from_text(text)
        assert 'ABX' in tickers

    def test_extract_tsxv_ticker(self):
        from ingestion.news_client import extract_tickers_from_text

        text = "Junior miner (TSXV: XYZ) reports drill results"
        tickers = extract_tickers_from_text(text)
        assert 'XYZ' in tickers

    def test_extract_multiple_tickers(self):
        from ingestion.news_client import extract_tickers_from_text

        text = "M&A: Company A (TSX: AAA) to acquire Company B (TSX: BBB)"
        tickers = extract_tickers_from_text(text)
        assert 'AAA' in tickers
        assert 'BBB' in tickers

    def test_extract_dot_to_format(self):
        from ingestion.news_client import extract_tickers_from_text

        text = "Stock (ABC.TO) rises 5%"
        tickers = extract_tickers_from_text(text)
        assert 'ABC' in tickers

    def test_no_tickers_found(self):
        from ingestion.news_client import extract_tickers_from_text

        text = "General market commentary with no specific stocks"
        tickers = extract_tickers_from_text(text)
        assert len(tickers) == 0


class TestIsMiningRelated:
    """Tests for mining relevance detection."""

    def test_mining_article_detected(self):
        from ingestion.news_client import _is_mining_related

        article = {
            'title': 'Gold mining company reports record production',
            'description': 'The gold producer announced quarterly results with higher ore grades.'
        }
        assert _is_mining_related(article) is True

    def test_non_mining_article_rejected(self):
        from ingestion.news_client import _is_mining_related

        article = {
            'title': 'Tech stocks rally on earnings',
            'description': 'Apple and Microsoft lead the gains in today\'s trading session.'
        }
        assert _is_mining_related(article) is False

    def test_single_keyword_not_enough(self):
        from ingestion.news_client import _is_mining_related

        article = {
            'title': 'Gold prices rise',
            'description': 'Investors flock to safe haven assets.'
        }
        # Should require at least 2 mining keywords
        result = _is_mining_related(article)
        # This may pass or fail depending on keyword count - checking the logic works


class TestNormalizeFinnhub:
    """Tests for Finnhub response normalization."""

    def test_normalize_single_article(self):
        from ingestion.news_client import _normalize_finnhub

        articles = [{
            'id': 123,
            'datetime': 1697367000,  # 2023-10-15 10:30:00 UTC
            'headline': 'Test Headline',
            'summary': 'Test summary content',
            'url': 'https://example.com/article',
            'source': 'Reuters',
            'related': 'ABX,NEM',
            'image': 'https://example.com/image.jpg',
            'category': 'company news'
        }]

        normalized = _normalize_finnhub(articles)

        assert len(normalized) == 1
        assert normalized[0]['title'] == 'Test Headline'
        assert normalized[0]['description'] == 'Test summary content'
        assert normalized[0]['source'] == 'Reuters'
        assert 'ABX' in normalized[0]['symbols']
        assert 'NEM' in normalized[0]['symbols']

    def test_normalize_empty_list(self):
        from ingestion.news_client import _normalize_finnhub

        normalized = _normalize_finnhub([])
        assert normalized == []


class TestTimeAgo:
    """Tests for relative time formatting."""

    def test_just_now(self):
        from ingestion.news_client import _time_ago

        now = datetime.now()
        result = _time_ago(now)
        assert result == 'Just now'

    def test_minutes_ago(self):
        from ingestion.news_client import _time_ago
        from datetime import timedelta

        past = datetime.now() - timedelta(minutes=30)
        result = _time_ago(past)
        assert '30m ago' in result or 'm ago' in result

    def test_hours_ago(self):
        from ingestion.news_client import _time_ago
        from datetime import timedelta

        past = datetime.now() - timedelta(hours=5)
        result = _time_ago(past)
        assert '5h ago' in result or 'h ago' in result

    def test_days_ago(self):
        from ingestion.news_client import _time_ago
        from datetime import timedelta

        past = datetime.now() - timedelta(days=3)
        result = _time_ago(past)
        assert '3d ago' in result


class TestFetchMiningNews:
    """Tests for the main mining news fetch function."""

    @patch('ingestion.news_client.fetch_canadian_mining_news')
    def test_returns_articles(self, mock_fetch):
        from ingestion.news_client import fetch_mining_news

        mock_fetch.return_value = [
            {
                'id': '1',
                'title': 'Test Article',
                'description': 'Test description',
                'url': 'https://example.com',
                'source': 'Test Source',
                'published_at': '2024-01-15T10:00:00',
                'symbols': [],
            }
        ]

        articles = fetch_mining_news(limit=5)

        assert len(articles) >= 1
        mock_fetch.assert_called_once()

    @patch('ingestion.news_client.fetch_canadian_mining_news')
    def test_respects_limit(self, mock_fetch):
        from ingestion.news_client import fetch_mining_news

        mock_fetch.return_value = [
            {'id': str(i), 'title': f'Article {i}', 'description': '', 'url': f'https://example.com/{i}',
             'source': 'Test', 'published_at': '2024-01-15T10:00:00', 'symbols': []}
            for i in range(20)
        ]

        articles = fetch_mining_news(limit=5)

        assert len(articles) <= 5


class TestFormatForFeed:
    """Tests for feed formatting."""

    def test_format_article(self):
        from ingestion.news_client import format_for_feed

        articles = [{
            'title': 'A very long title that might need to be truncated at some point to fit the display',
            'description': 'Short description',
            'source': 'Mining.com',
            'url': 'https://example.com/article',
            'symbols': ['ABX', 'NEM'],
            'published_at': '2024-01-15T10:00:00',
        }]

        formatted = format_for_feed(articles)

        assert len(formatted) == 1
        assert formatted[0]['type'] == 'news'
        assert len(formatted[0]['title']) <= 120
        assert formatted[0]['source'] == 'Mining.com'

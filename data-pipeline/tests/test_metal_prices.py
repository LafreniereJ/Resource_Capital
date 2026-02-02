"""
Unit tests for the metal prices module.
"""

import pytest
from unittest.mock import patch


class TestMetalConfig:
    """Tests for metal configuration constants."""

    def test_metals_dict_exists(self):
        from ingestion.metal_prices import METAL_CONFIG

        assert isinstance(METAL_CONFIG, dict)
        assert 'gold' in METAL_CONFIG

    def test_metal_has_symbols(self):
        from ingestion.metal_prices import METAL_CONFIG

        for metal, config in METAL_CONFIG.items():
            assert 'symbols' in config, f"Metal {metal} missing symbols"
            assert len(config['symbols']) > 0, f"Metal {metal} has empty symbols list"


class TestFetchFromYfinance:
    """Tests for yfinance price fetching.

    Note: These tests use integration testing since the yfinance mocking
    is complex due to the multiple fallback symbols pattern.
    """

    def test_invalid_commodity_returns_none(self):
        from ingestion.metal_prices import fetch_from_yfinance

        result = fetch_from_yfinance('unobtainium')
        assert result is None

    def test_returns_dict_with_expected_keys(self):
        """Test that successful fetch returns expected structure."""
        from ingestion.metal_prices import fetch_from_yfinance

        # This is a live test - may occasionally fail due to API issues
        result = fetch_from_yfinance('gold')

        # Skip if API is down
        if result is None:
            pytest.skip("yfinance API unavailable")

        # Check structure
        assert 'price' in result
        assert 'commodity' in result
        assert 'symbol' in result
        assert 'currency' in result
        assert result['commodity'] == 'gold'
        assert result['currency'] == 'USD'

    def test_change_percent_calculation(self):
        """Test that change percent is calculated correctly."""
        from ingestion.metal_prices import fetch_from_yfinance

        result = fetch_from_yfinance('silver')

        if result is None:
            pytest.skip("yfinance API unavailable")

        # If both price and prev_close exist, change_percent should be calculated
        if result.get('prev_close') and result.get('price'):
            expected = ((result['price'] - result['prev_close']) / result['prev_close']) * 100
            if result['change_percent'] is not None:
                assert abs(result['change_percent'] - expected) < 0.01


class TestFetchAllMetalPrices:
    """Tests for fetching all metal prices."""

    @patch('ingestion.metal_prices.fetch_from_yfinance')
    def test_fetches_all_metals(self, mock_fetch):
        from ingestion.metal_prices import fetch_all_metal_prices, METAL_CONFIG

        mock_fetch.return_value = {
            'price': 100.0,
            'prev_close': 99.0,
            'day_high': 101.0,
            'day_low': 98.0,
            'change_percent': 1.0,
        }

        prices = fetch_all_metal_prices()

        assert len(prices) == len(METAL_CONFIG)
        assert mock_fetch.call_count == len(METAL_CONFIG)

    @patch('ingestion.metal_prices.fetch_from_yfinance')
    def test_handles_partial_failures(self, mock_fetch):
        from ingestion.metal_prices import fetch_all_metal_prices

        # Simulate some failures
        call_count = [0]

        def side_effect(commodity):
            call_count[0] += 1
            if call_count[0] % 2 == 0:
                return None
            return {
                'price': 100.0,
                'prev_close': 99.0,
                'day_high': 101.0,
                'day_low': 98.0,
                'change_percent': 1.0,
            }

        mock_fetch.side_effect = side_effect

        prices = fetch_all_metal_prices()

        # Should still return some prices
        assert len(prices) > 0


class TestFetchSingleMetal:
    """Tests for getting a single metal price."""

    @patch('ingestion.metal_prices.fetch_from_yfinance')
    def test_get_gold_price(self, mock_fetch):
        from ingestion.metal_prices import fetch_single_metal

        mock_fetch.return_value = {
            'price': 2024.50,
            'prev_close': 2015.40,
            'day_high': 2030.00,
            'day_low': 2010.00,
            'change_percent': 0.45,
        }

        result = fetch_single_metal('gold')

        assert result is not None
        assert result['price'] == 2024.50

    def test_invalid_metal(self):
        from ingestion.metal_prices import fetch_single_metal

        result = fetch_single_metal('unobtainium')

        assert result is None


class TestMetalSymbolMapping:
    """Tests for metal symbol mappings."""

    def test_gold_symbol(self):
        from ingestion.metal_prices import METAL_CONFIG

        assert 'gold' in METAL_CONFIG
        assert 'GC=F' in METAL_CONFIG['gold']['symbols']

    def test_silver_symbol(self):
        from ingestion.metal_prices import METAL_CONFIG

        assert 'silver' in METAL_CONFIG
        assert 'SI=F' in METAL_CONFIG['silver']['symbols']

    def test_copper_symbol(self):
        from ingestion.metal_prices import METAL_CONFIG

        assert 'copper' in METAL_CONFIG
        assert 'HG=F' in METAL_CONFIG['copper']['symbols']

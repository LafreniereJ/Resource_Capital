"""
Unit tests for the GROQ-based extraction module.
"""

import pytest
from unittest.mock import patch, MagicMock
import json


class TestGroqExtractorInit:
    """Tests for GroqExtractor initialization."""

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    def test_initializes_with_api_key(self, mock_groq):
        from processing.groq_extractor import GroqExtractor

        extractor = GroqExtractor()

        mock_groq.assert_called_once_with(api_key='test_key')
        assert extractor.model == 'llama-3.3-70b-versatile'

    @patch.dict('os.environ', {}, clear=True)
    def test_raises_without_api_key(self):
        # Remove GROQ_API_KEY from environment
        import os
        if 'GROQ_API_KEY' in os.environ:
            del os.environ['GROQ_API_KEY']

        from processing.groq_extractor import GroqExtractor

        with pytest.raises(ValueError, match='GROQ_API_KEY'):
            GroqExtractor()


class TestExtractFromText:
    """Tests for text extraction."""

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    def test_extracts_production_data(self, mock_groq):
        from processing.groq_extractor import GroqExtractor

        # Mock API response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps([
            {
                'mine_name': 'Test Mine',
                'period': 'Q3 2024',
                'gold_oz': 50000,
                'aisc_per_oz': 1200,
            }
        ])

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_groq.return_value = mock_client

        extractor = GroqExtractor()
        results = extractor.extract_from_text('Test mining report with gold production')

        assert len(results) == 1
        assert results[0].mine_name == 'Test Mine'
        assert results[0].gold_oz == 50000

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    def test_handles_empty_response(self, mock_groq):
        from processing.groq_extractor import GroqExtractor

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '[]'

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_groq.return_value = mock_client

        extractor = GroqExtractor()
        results = extractor.extract_from_text('No production data here')

        assert results == []

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    def test_handles_invalid_json(self, mock_groq):
        from processing.groq_extractor import GroqExtractor

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = 'This is not valid JSON'

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_groq.return_value = mock_client

        extractor = GroqExtractor()
        results = extractor.extract_from_text('Test text')

        assert results == []

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    def test_truncates_long_text(self, mock_groq):
        from processing.groq_extractor import GroqExtractor

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '[]'

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_groq.return_value = mock_client

        extractor = GroqExtractor()

        # Create very long text
        long_text = 'A' * 50000
        extractor.extract_from_text(long_text)

        # Verify the text was truncated in the API call
        call_args = mock_client.chat.completions.create.call_args
        message_content = call_args.kwargs['messages'][0]['content']
        # Text should be truncated to ~30000 chars (plus prompt)
        assert len(message_content) < 35000


class TestExtractFromPDF:
    """Tests for PDF extraction."""

    @patch.dict('os.environ', {'GROQ_API_KEY': 'test_key'})
    @patch('groq.Groq')
    @patch('fitz.open')
    def test_extracts_from_pdf(self, mock_fitz, mock_groq):
        from processing.groq_extractor import GroqExtractor

        # Mock PDF reading
        mock_doc = MagicMock()
        mock_page = MagicMock()
        mock_page.get_text.return_value = 'Gold production: 50,000 oz in Q3 2024'
        mock_doc.__iter__ = lambda self: iter([mock_page])
        mock_doc.close = MagicMock()
        mock_fitz.return_value = mock_doc

        # Mock API response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps([
            {'mine_name': 'PDF Mine', 'gold_oz': 50000}
        ])

        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_groq.return_value = mock_client

        extractor = GroqExtractor()
        results = extractor.extract_from_pdf('test.pdf')

        assert len(results) == 1
        assert results[0].gold_oz == 50000
        mock_doc.close.assert_called_once()


class TestProductionDataModel:
    """Tests for the ProductionData dataclass."""

    def test_create_production_data(self):
        from processing.models import ProductionData

        data = ProductionData(
            mine_name='Test Mine',
            period='Q3 2024',
            gold_oz=50000,
            aisc_per_oz=1200.50,
        )

        assert data.mine_name == 'Test Mine'
        assert data.gold_oz == 50000
        assert data.aisc_per_oz == 1200.50

    def test_optional_fields_default_none(self):
        from processing.models import ProductionData

        data = ProductionData(mine_name='Test')

        assert data.period is None
        assert data.gold_oz is None
        assert data.silver_oz is None
        assert data.copper_lbs is None

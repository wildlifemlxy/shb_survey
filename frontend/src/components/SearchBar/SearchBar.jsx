import React, { Component } from 'react';
import './SearchBar.css';

class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      showResults: false,
      selectedIndex: -1
    };
    
    this.searchInputRef = React.createRef();
    this.resultsRef = React.createRef();
    this.searchTimeout = null;
  }

  componentDidMount() {
    // Add click outside listener
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
    // Clean up
    document.removeEventListener('mousedown', this.handleClickOutside);
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  handleClickOutside = (event) => {
    if (this.resultsRef.current && !this.resultsRef.current.contains(event.target) &&
        this.searchInputRef.current && !this.searchInputRef.current.contains(event.target)) {
      this.setState({ showResults: false, selectedIndex: -1 });
    }
  };

  handleSearchChange = (e) => {
    const query = e.target.value;
    this.setState({ searchQuery: query, isSearching: true });

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Debounce search
    this.searchTimeout = setTimeout(() => {
      this.performSearch(query);
    }, 300);
  };

  performSearch = (query) => {
    if (!query.trim()) {
      this.setState({ 
        searchResults: [], 
        isSearching: false, 
        showResults: false 
      });
      return;
    }

    const { data } = this.props;
    if (!data || !Array.isArray(data)) {
      this.setState({ 
        searchResults: [], 
        isSearching: false, 
        showResults: false 
      });
      return;
    }

    const searchTerm = query.toLowerCase();
    const results = [];

    // Search through the data
    data.forEach((item, index) => {
      const matches = [];
      
      // Search through all fields
      Object.keys(item).forEach(key => {
        const value = item[key];
        if (value && value.toString().toLowerCase().includes(searchTerm)) {
          matches.push({
            field: key,
            value: value,
            highlight: this.highlightText(value.toString(), searchTerm)
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          id: index,
          item: item,
          matches: matches
        });
      }
    });

    this.setState({ 
      searchResults: results.slice(0, 10), // Limit to 10 results
      isSearching: false, 
      showResults: query.trim().length > 0
    });
  };

  highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  handleKeyDown = (e) => {
    const { searchResults, selectedIndex, showResults } = this.state;
    
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = selectedIndex < searchResults.length - 1 ? selectedIndex + 1 : 0;
        this.setState({ selectedIndex: nextIndex });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : searchResults.length - 1;
        this.setState({ selectedIndex: prevIndex });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          this.handleResultClick(searchResults[selectedIndex]);
        }
        break;
        
      case 'Escape':
        this.setState({ showResults: false, selectedIndex: -1 });
        this.searchInputRef.current?.blur();
        break;
        
      default:
        break;
    }
  };

  handleResultClick = (result) => {
    // Close search results
    this.setState({ showResults: false, selectedIndex: -1 });
    
    // Call the onResultSelect callback if provided
    if (this.props.onResultSelect) {
      this.props.onResultSelect(result);
    }
  };

  clearSearch = () => {
    this.setState({ 
      searchQuery: '', 
      searchResults: [], 
      showResults: false, 
      selectedIndex: -1 
    });
    this.searchInputRef.current?.focus();
  };

  formatFieldName = (fieldName) => {
    // Convert camelCase/snake_case to readable format
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  render() {
    const { 
      searchQuery, 
      searchResults, 
      isSearching, 
      showResults, 
      selectedIndex 
    } = this.state;
    
    const { placeholder = "Search data..." } = this.props;

    return (
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <div className="search-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </div>
          
          <input
            ref={this.searchInputRef}
            type="text"
            value={searchQuery}
            onChange={this.handleSearchChange}
            onKeyDown={this.handleKeyDown}
            onFocus={() => searchQuery && this.setState({ showResults: true })}
            placeholder={placeholder}
            className="search-input"
            autoComplete="off"
          />
          
          {isSearching && (
            <div className="search-loading">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {searchQuery && !isSearching && (
            <button 
              className="clear-search-btn"
              onClick={this.clearSearch}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          )}
        </div>

        {showResults && (
          <div ref={this.resultsRef} className="search-results">
            {searchResults.length > 0 ? (
              <>
                <div className="search-results-header">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="search-results-list">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.id}
                      className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                      onClick={() => this.handleResultClick(result)}
                    >
                      <div className="result-preview">
                        {result.matches.slice(0, 3).map((match, matchIndex) => (
                          <div key={matchIndex} className="result-match">
                            <span className="field-name">
                              {this.formatFieldName(match.field)}:
                            </span>
                            <span 
                              className="field-value"
                              dangerouslySetInnerHTML={{ __html: match.highlight }}
                            />
                          </div>
                        ))}
                        {result.matches.length > 3 && (
                          <div className="more-matches">
                            +{result.matches.length - 3} more match{result.matches.length - 3 !== 1 ? 'es' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="no-results">
                <div className="no-results-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                  </svg>
                </div>
                <div className="no-results-text">
                  No results found for "{searchQuery}"
                </div>
                <div className="no-results-suggestion">
                  Try different keywords or check your spelling
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

export default SearchBar;

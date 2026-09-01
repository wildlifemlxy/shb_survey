import React from 'react';
import '../../css/components/Gallery/Gallery.css';
import { getRifleRangeRoadSurveyData } from '../../data/riflerangeroad/surveyData';

// Rifle Range Road has no uploaded-file gallery; images live in each survey's "Image URL" field.
class RifleRangeRoadGallery extends React.Component {
  state = {
    images: [],
    isLoading: true,
    error: null,
    currentPage: 1,
    itemsPerPage: 12,
  };

  componentDidMount() {
    this.loadImages();
  }

  loadImages = async () => {
    try {
      this.setState({ isLoading: true, error: null });
      const records = await getRifleRangeRoadSurveyData();
      const urls = [...new Set(
        records
          .map(record => record?.['Image URL'])
          .filter(url => typeof url === 'string' && url.trim())
      )];
      this.setState({ images: urls, isLoading: false });
    } catch (error) {
      console.error('Error loading Rifle Range Road gallery images:', error);
      this.setState({ isLoading: false, error: error.message || 'Failed to load gallery images' });
    }
  };

  // Render into a blank tab as an <img> so it always displays inline instead of
  // triggering a download (some hosts serve the URL with Content-Disposition: attachment).
  // Note: passing 'noopener' here makes window.open return null, so it's intentionally omitted -
  // we need the reference to write our own safe DOM content into the tab.
  handleImageClick = (url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;

    const newTab = window.open('', '_blank');
    if (!newTab) return;

    newTab.opener = null;
    newTab.document.title = 'Rifle Range Road Observation';
    Object.assign(newTab.document.body.style, {
      margin: '0',
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });

    const img = newTab.document.createElement('img');
    img.src = url;
    img.alt = 'Rifle Range Road Observation';
    Object.assign(img.style, { maxWidth: '100%', maxHeight: '100vh', objectFit: 'contain' });
    newTab.document.body.appendChild(img);
  };

  goToPreviousPage = () => {
    this.setState(prevState => ({ currentPage: Math.max(1, prevState.currentPage - 1) }));
  };

  goToNextPage = () => {
    this.setState(prevState => ({ currentPage: prevState.currentPage + 1 }));
  };

  render() {
    const { images, isLoading, error, currentPage, itemsPerPage } = this.state;
    const totalPages = Math.ceil(images.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedImages = images.slice(startIndex, startIndex + itemsPerPage);

    return (
      <section className="gallery-wrapper">
        <div className="gallery-header-section">
          <div style={{ textAlign: 'center' }}>
            <h2 className="gallery-main-title">Gallery</h2>
            <p className="gallery-main-subtitle">Explore conservation efforts and captured moments</p>
          </div>
        </div>

        <div>
          <div className="gallery-items-grid">
            {paginatedImages.map((url) => (
              <div key={url} className="gallery-card-item" style={{ cursor: 'pointer', borderRadius: '8px' }}>
                <img
                  src={url}
                  alt="Rifle Range Road observation"
                  className="gallery-img"
                  onClick={() => this.handleImageClick(url)}
                  loading="lazy"
                />
              </div>
            ))}
            {isLoading && images.length === 0 && (
              <div className="gallery-loading-state">
                <div className="gallery-spinner"></div>
                <p>Loading gallery</p>
              </div>
            )}
            {!isLoading && images.length === 0 && !error && (
              <div className="gallery-empty-state">
                <p>No media is found in gallery</p>
              </div>
            )}
            {error && (
              <div className="gallery-empty-state">
                <p>{error}</p>
              </div>
            )}
          </div>

          {!isLoading && images.length > 0 && totalPages > 1 && (
            <div className="gallery-pagination">
              <button className="gallery-pagination-btn" onClick={this.goToPreviousPage} disabled={currentPage === 1}>
                ◀ Previous
              </button>
              <div className="gallery-pagination-info">
                Page {currentPage} of {totalPages}
              </div>
              <button className="gallery-pagination-btn" onClick={this.goToNextPage} disabled={currentPage === totalPages}>
                Next ▶
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }
}

export default RifleRangeRoadGallery;

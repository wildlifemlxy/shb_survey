import React, { Component } from 'react';
import '../../../css/components/SubTabs/GenericSubTab.css';

class GenericSubTab extends Component {
  render() {
    const { config, data } = this.props;
    
    console.log('GenericSubTab render:', { config, dataLength: data?.length });
    
    if (!config) {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <div>No configuration provided for sub-tab</div>
        </div>
      );
    }

    if (!data || data.length === 0) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <div>Loading chart data...</div>
        </div>
      );
    }

    const { 
      className = 'generic-subtab', 
      title, 
      description, 
      layout = 'grid', 
      sections = [] 
    } = config;

    return (
      <div className={className}>
        {title && (
          <div className="subtab-header">
            <h2 className="subtab-title">{title}</h2>
            {description && (
              <p className="subtab-description">{description}</p>
            )}
          </div>
        )}
        
        <div className={`subtab-content ${layout}`}>
          {sections.map((section, index) => {
            const {
              id,
              title: sectionTitle,
              description: sectionDescription,
              component: ChartComponent,
              containerClass = 'chart-container',
              props: sectionProps = {}
            } = section;

            console.log('Rendering section:', { id, sectionTitle, ChartComponent: !!ChartComponent });

            if (!ChartComponent) {
              return (
                <div key={id || index} className="error-state">
                  <div className="error-icon">⚠️</div>
                  <div>No component specified for section: {sectionTitle || 'Unknown'}</div>
                </div>
              );
            }

            return (
              <div key={id || index} className={containerClass}>
                {sectionTitle && (
                  <h3 className="chart-title">{sectionTitle}</h3>
                )}
                {sectionDescription && (
                  <p className="chart-description">{sectionDescription}</p>
                )}
                <div className="chart-wrapper">
                  <ChartComponent 
                    data={data} 
                    {...sectionProps}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default GenericSubTab;

import React, { Component } from 'react';

class SubmissionSummarySection extends Component 
{
    formatDate(dateString) {
        // Always output as dd/mm/yyyy, padding day and month to two digits
        if (!dateString || dateString === '') return '';
        let d, m, y;
        // Handle formats like 20-Jun-25 or 05-Feb-2024
        const monthMap = {
            Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
            Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
        };
        const monthNameRegex = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/;
        const match = dateString.match(monthNameRegex);
        if (match) {
            d = parseInt(match[1], 10);
            m = monthMap[match[2].charAt(0).toUpperCase() + match[2].slice(1,3).toLowerCase()];
            let yy = parseInt(match[3], 10);
            y = match[3].length === 2 ? (yy < 50 ? 2000 + yy : 1900 + yy) : yy;
        } else if (dateString instanceof Date && !isNaN(dateString)) {
            d = dateString.getDate();
            m = dateString.getMonth() + 1;
            y = dateString.getFullYear();
        } else if (dateString.includes('/')) {
            // Accepts dd/mm/yyyy, d/m/yyyy, mm/dd/yyyy, m/d/yyyy, dd/mm/yy, d/m/yy
            const parts = dateString.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    y = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    d = parseInt(parts[2], 10);
                } else if (parts[2].length === 4) {
                    d = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    y = parseInt(parts[2], 10);
                } else if (parts[2].length === 2) {
                    // dd/mm/yy or d/m/yy
                    d = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    let yy = parseInt(parts[2], 10);
                    y = yy < 50 ? 2000 + yy : 1900 + yy;
                }
            }
        } else if (dateString.includes('-')) {
            // Accepts yyyy-mm-dd, y-m-d, dd-mm-yyyy, d-m-y, dd-mm-yy, d-m-yy
            const parts = dateString.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    y = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    d = parseInt(parts[2], 10);
                } else if (parts[2].length === 4) {
                    d = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    y = parseInt(parts[2], 10);
                } else if (parts[2].length === 2) {
                    d = parseInt(parts[0], 10);
                    m = parseInt(parts[1], 10);
                    let yy = parseInt(parts[2], 10);
                    y = yy < 50 ? 2000 + yy : 1900 + yy;
                }
            }
        } else {
            return dateString;
        }
        if (!d || !m || !y) return dateString;
        return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
    }
    render() {
        const { newSurvey } = this.props;
        console.log('SubmissionSummarySection newSurvey:', newSurvey);
        // Support both array and flat object for newSurvey
        const isObservationArray = Array.isArray(newSurvey['Observation Details']);
        // If not array, treat newSurvey as a single flat entry
        const flat = !isObservationArray;

        return (
            <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 600, color: '#3949ab', fontSize: '1.1rem', marginBottom: 12 }}>Submission Summary</div>
                <div style={{
                    border: '1px solid #c5cae9',
                    borderRadius: 10,
                    padding: '16px 18px',
                    marginBottom: 18,
                    background: '#f7f8fa',
                    fontSize: '1.05rem',
                }}>
                {/* Render observation details if present as array */}
                {isObservationArray && newSurvey['Observation Details'].length > 0 && (
                    <div style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 10,
                        padding: '14px 16px',
                        background: '#fff',
                        fontSize: '1.01rem',
                    }}>
                        <div style={{ fontWeight: 500, color: '#3949ab', marginBottom: 8 }}>Observation Details</div>
                        {newSurvey['Observation Details'].map((obs, idx) => {
                            // Calculate sequential Bird IDs for display
                            const num = parseInt(obs['Number of Birds'], 10);
                            let birdId = obs['SHB individual ID'] || '-';
                            
                            // If the SHB ID is not already calculated correctly, calculate it here
                            if (num && num > 0 && (!birdId || birdId === '-')) {
                                let startNum = 1;
                                for (let i = 0; i < idx; i++) {
                                    const prevNum = parseInt(newSurvey['Observation Details'][i]?.['Number of Birds'] || '', 10);
                                    if (prevNum && prevNum > 0) startNum += prevNum;
                                }
                                birdId = Array.from({ length: num }, (_, i) => `SHB${startNum + i}`).join(', ');
                            }
                            
                            return (
                            <div key={idx} style={{ marginBottom: 12, paddingBottom: 10, borderBottom: idx !== newSurvey['Observation Details'].length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                                <div><strong>Observer name:</strong> {Array.isArray(newSurvey['Observer name']) ? newSurvey['Observer name'].join(', ') : (newSurvey['Observer name'] || '-')}</div>
                                <div><strong>SHB individual ID:</strong> {birdId}</div>
                                <div><strong>Number of Birds:</strong> {obs['Number of Birds'] || '-'}</div>
                                <div><strong>Location:</strong> {newSurvey['Location'] || '-'}</div>
                                <div><strong>Height of bird/m:</strong> {obs['HeightOfBird'] || '-'}</div>
                                <div><strong>Lat:</strong> {obs['Lat'] || '-'}</div>
                                <div><strong>Long:</strong> {obs['Long'] || '-'}</div>
                                <div><strong>Date:</strong> {this.formatDate(newSurvey['Date']) || '-'}</div>
                                <div><strong>Time:</strong> {obs['Time'] || '-'}</div>
                                <div><strong>Height of tree/m:</strong> {obs['HeightOfTree'] || '-'}</div>
                                <div><strong>Height of bird/m:</strong> {obs['HeightOfBird'] || '-'}</div>
                                <div><strong>Activity (foraging, preening, calling, perching, others):</strong> {obs['Activity'] || '-'}</div>
                                <div><strong>Seen/Heard:</strong> {obs['SeenHeard'] || '-'}</div>
                                <div><strong>Activity Details:</strong> {obs['ActivityDetails']}</div>
                            </div>
                        );})}
                    </div>
                )}
            </div>
            </div>
        )
    }
}

export default SubmissionSummarySection;
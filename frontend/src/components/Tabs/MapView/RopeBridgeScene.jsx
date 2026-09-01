import React, { useMemo, useRef } from 'react';
import { PawPrint } from 'lucide-react';
import { motion } from 'framer-motion';
import PawPrintScrollableLayer from './PawPrintScrollableLayer';

const getBridgeIdentifier = (observation = {}) => {
  const candidateKeys = [
    'Rope Bridge ID',
    'Bridge ID',
    'Bridge',
    'Bridge Name',
    'RopeBridgeID',
    'BridgeID',
    'Bridge Number',
    'Bridge number',
    'Rope Bridge',
    'Bridge A/B',
    'Bridge Location'
  ];

  for (const key of candidateKeys) {
    const rawValue = observation[key];
    if (rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '') {
      const normalized = String(rawValue).trim().toUpperCase();
      if (/^A$/i.test(normalized) || /^BRIDGE\s*A$/i.test(normalized) || /^A\s*\(.*\)$/i.test(normalized)) return 'A';
      if (/^B$/i.test(normalized) || /^BRIDGE\s*B$/i.test(normalized) || /^B\s*\(.*\)$/i.test(normalized)) return 'B';
      if (/^A\b|^BRIDGE\s*A\b/.test(normalized)) return 'A';
      if (/^B\b|^BRIDGE\s*B\b/.test(normalized)) return 'B';
      return normalized;
    }
  }

  return '';
};

const matchesRopeBridgeType = (record = {}) => {
  const candidates = [
    record.type,
    record.Type,
    record['Survey Type'],
    record['Data Type'],
    record.typeName,
    record['type']
  ];

  const normalized = candidates
    .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    .map(value => String(value).trim().toLowerCase().replace(/\s+/g, ' '))
    .find(value => value.includes('rope bridge') || value.includes('data (rope bridge) cleaned'));

  return Boolean(normalized);
};

const RopeBridgeScene = ({ data = [], overviewData = data, onMarkerClick = () => {} }) => {
  const sourceRecords = Array.isArray(overviewData) ? overviewData : Array.isArray(data) ? data : [];
  const bridgeObservations = useMemo(
    () => sourceRecords.filter(record => matchesRopeBridgeType(record)),
    [sourceRecords]
  );

  const isBridgeA = (observation = {}) => getBridgeIdentifier(observation) === 'A';
  const isBridgeB = (observation = {}) => getBridgeIdentifier(observation) === 'B';
  const hasExplicitBridgeAssignment = (observation = {}) => Boolean(getBridgeIdentifier(observation));
  const offBridgeObservations = bridgeObservations.filter(
    obs => hasExplicitBridgeAssignment(obs) && !isBridgeA(obs) && !isBridgeB(obs)
  );

  const scrollRefs = useRef({});
  const dragState = useRef({});

  const syncBridgeScrollThumb = (prefix, container) => {
    const scrollbar = scrollRefs.current[`${prefix}-scrollbar`];
    const thumb = scrollRefs.current[`${prefix}-thumb`];

    if (!container || !scrollbar || !thumb) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth || 0;

    if (maxScroll <= 0 || trackWidth <= 0) {
      thumb.style.width = '100%';
      thumb.style.left = '0px';
      return;
    }

    const thumbWidth = Math.max(24, (container.clientWidth / container.scrollWidth) * trackWidth);
    const thumbLeft = (container.scrollLeft / maxScroll) * (trackWidth - thumbWidth);

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${thumbLeft}px`;
  };

  const updateBridgeScrollFromPointer = (prefix, clientX) => {
    const scrollbar = scrollRefs.current[`${prefix}-scrollbar`];
    const container = scrollRefs.current[`${prefix}-scroll`];

    if (!scrollbar || !container) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth || 0;

    if (!trackWidth || maxScroll <= 0) {
      container.scrollLeft = 0;
      return;
    }

    const relativeX = Math.min(Math.max(clientX - scrollbar.getBoundingClientRect().left, 0), trackWidth);
    const ratio = relativeX / trackWidth;
    container.scrollLeft = ratio * maxScroll;
    syncBridgeScrollThumb(prefix, container);
  };

  const handleBridgeScrollPointerDown = (prefix, event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const scrollbar = event.currentTarget;
    if (scrollbar.setPointerCapture) scrollbar.setPointerCapture(event.pointerId);
    dragState.current[prefix] = true;
    updateBridgeScrollFromPointer(prefix, event.clientX);
  };

  const handleBridgeScrollPointerMove = (prefix, event) => {
    if (!dragState.current[prefix]) return;
    updateBridgeScrollFromPointer(prefix, event.clientX);
  };

  const handleBridgeScrollPointerUp = (prefix, event) => {
    const scrollbar = scrollRefs.current[`${prefix}-scrollbar`];
    if (dragState.current[prefix]) delete dragState.current[prefix];
    if (scrollbar && scrollbar.hasPointerCapture && scrollbar.hasPointerCapture(event.pointerId)) {
      scrollbar.releasePointerCapture(event.pointerId);
    }
  };

  const renderPawPrints = (observations, prefix) => (
    <div className="bridge-paw-scroll-wrapper" aria-label={`${prefix} observations`}>
      <PawPrintScrollableLayer pawCount={observations.length} />
    </div>
  );

  const renderOffBridgePawPrints = (observations, prefix) => {
    if (!Array.isArray(observations) || observations.length === 0) return null;

    const spreadPositions = [
      { left: '16%', top: '80%' },
      { left: '26%', top: '62%' },
      { left: '38%', top: '78%' },
      { left: '48%', top: '60%' },
      { left: '58%', top: '74%' },
      { left: '72%', top: '66%' },
      { left: '81%', top: '82%' },
      { left: '28%', top: '42%' },
      { left: '44%', top: '32%' },
      { left: '60%', top: '46%' },
      { left: '76%', top: '38%' },
      { left: '90%', top: '54%' }
    ];

    return (
      <div className="bridge-offbridge-layer" aria-label={`${prefix} off-bridge observations`}>
        {observations.map((observation, index) => {
          const position = spreadPositions[index % spreadPositions.length];
          const jitterLeft = 8 + ((index * 11) % 16);
          const jitterTop = 18 + ((index * 17) % 28);
          return (
            <motion.button
              key={`${prefix}-offbridge-${observation._id || observation.id || index}`}
              type="button"
              className="bridge-paw bridge-paw-offbridge"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              whileHover={{ scale: 1.18 }}
              style={{
                left: `calc(${position.left} + ${jitterLeft}px)`,
                top: `calc(${position.top} + ${jitterTop}px)`,
                zIndex: 1
              }}
              aria-label={`View ${prefix} off-bridge observation ${index + 1}`}
              title={`View ${prefix} off-bridge observation ${index + 1}`}
              onClick={() => onMarkerClick(observation)}
            >
              <PawPrint aria-hidden="true" size={30} strokeWidth={2.5} />
            </motion.button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <style>{`
        .rope-bridge-scene {
          position: relative;
          background: transparent;
          display: flex;
          flex-direction: column;
          justify-content: center;
          flex: 1;
          min-height: 300px;
          overflow-x: visible;
          overflow-y: visible;
        }
        .road-base-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: stretch;
          z-index: 1;
          pointer-events: none;
        }
        .road-base-layer::before,
        .road-base-layer::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 4px;
          background: repeating-linear-gradient(to bottom, #000000 0 50%, transparent 50% 100%);
          background-repeat: repeat-y;
          background-size: 100% calc(100% / 7);
          border: none;
          box-shadow: none;
          z-index: 2;
        }
        .road-base-layer::before { left: 35%; transform: translateX(-50%); }
        .road-base-layer::after { left: 65%; transform: translateX(-50%); }
        .road-direction-arrow {
          position: absolute;
          top: 55%;
          left: 27.5%;
          width: 3%;
          height: 35%;
          transform: translateX(-50%);
          background: #ffffff;
          clip-path: polygon(50% 0, 100% 36%, 62% 36%, 62% 100%, 38% 100%, 38% 36%, 0 36%);
          animation: none;
          transition: none;
          z-index: 3;
        }
        .road-direction-arrow.right { top: 14%; left: 42.5%; }
        .road-direction-arrow.down { top: 14%; left: 72.5%; transform: translateX(-50%) rotate(180deg); }
        .road-direction-arrow.down-left { top: 55%; left: 57.5%; transform: translateX(-50%) rotate(180deg); }
        .road-base-fill {
          position: relative;
          flex: 1;
          background: linear-gradient(180deg, rgba(65,68,72,0.98) 0%, rgba(27,29,32,0.98) 100%);
          box-shadow: none;
        }
        .road-base-fill::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 4px;
          transform: translateX(-50%);
          background: repeating-linear-gradient(to bottom, #000000 0 50%, transparent 50% 100%);
          background-repeat: repeat-y;
          background-size: 100% calc(100% / 7);
          box-shadow: 0 0 2px rgba(255,255,255,0.45);
        }
        .road-base-fill:nth-child(2)::before,
        .road-base-fill:nth-child(4)::before { display: none; }
        .road-base-fill:nth-child(3)::before { background: #ffffff; }
        .pavement-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: stretch;
          z-index: 2;
          pointer-events: none;
        }
        .road-shoulder {
          position: relative;
          flex: 0 0 5%;
          min-width: 0;
          background: linear-gradient(180deg, rgb(126,126,126) 0%, rgb(92,92,92) 100%);
          border: none;
          box-shadow: inset -12px 0 18px rgba(0,0,0,0.24), 6px 0 12px rgba(0,0,0,0.18);
          z-index: 2;
        }
        .road-drain {
          position: relative;
          flex: 0 0 5%;
          min-width: 0;
          background: linear-gradient(180deg, rgb(118,118,118) 0%, rgb(84,84,84) 100%);
          border: none;
          box-shadow: inset 12px 0 18px rgba(0,0,0,0.24), -6px 0 12px rgba(0,0,0,0.18);
          z-index: 2;
        }
        .grass-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: stretch;
          z-index: 1;
          pointer-events: none;
        }
        .grass-left-side, .grass-right-side {
          flex: 0 0 15%;
          min-width: 72px;
          position: relative;
          background: radial-gradient(circle at 15% 12%, rgba(151, 201, 104, 0.92) 0%, rgba(81, 137, 63, 0.82) 24%, rgba(48, 92, 45, 0.9) 58%, rgba(15, 39, 23, 1) 100%), linear-gradient(180deg, #8bbd63 0%, #2c5f37 100%);
          overflow: hidden;
          border-left: 1px solid rgba(255,255,255,0.12);
          border-right: 1px solid rgba(0,0,0,0.12);
          z-index: 10;
        }
        .grass-left-side::before, .grass-right-side::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 10%, rgba(255,255,255,0.12) 0%, transparent 20%), repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 12px, rgba(0,0,0,0.02) 12px, rgba(0,0,0,0.02) 24px);
        }
        .spacer-left, .spacer-road, .spacer-right { flex: 1; position: relative; z-index: 3; }
        .rope-bridge-overlay { position: absolute; inset: 0; z-index: 4; pointer-events: auto; }
        .bridge-group {
          position: absolute;
          left: 8%;
          width: 84%;
          height: 22%;
          min-height: 140px;
          isolation: isolate;
          z-index: 2;
        }
        .bridge-group.left { top: 8%; }
        .bridge-group.right { top: 70%; }
        .bridge-label {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translate(-50%, 10px);
          color: #f5f7ef;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.1px;
          text-transform: uppercase;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(20, 30, 20, 0.7);
          z-index: 6;
        }
        .bridge-paw {
          position: absolute;
          width: 36px;
          height: 36px;
          padding: 0;
          transform: translate(-50%, -50%);
          border: 0;
          background: transparent;
          color: #ffffff;
          cursor: pointer;
          filter: grayscale(1) brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.95));
          opacity: 1;
          z-index: 5;
        }
        .bridge-paw-offbridge { z-index: 1; opacity: 0.9; pointer-events: auto; }
        .bridge-paw svg { display: block; width: 30px; height: 30px; margin: auto; fill: #ffffff; stroke: #ffffff; }
        .bridge-offbridge-layer { position: absolute; inset: 0; z-index: 1; pointer-events: auto; }
        .bridge-paw-scroll-wrapper {
          position: absolute;
          left: 0;
          right: 0;
          top: 5%;
          height: 30%;
          padding-left: 45px;
          padding-right: 45px;
          box-sizing: border-box;
          z-index: 5;
        }
        .bridge-paw-scroll {
          position: relative;
          width: 100%;
          height: 100%;
          padding-bottom: 18px;
          box-sizing: border-box;
          overflow-x: scroll;
          overflow-y: hidden;
          background-color: rgba(45, 48, 51, 0.25);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cg fill='none' stroke='%23000000' stroke-width='0.9' stroke-opacity='0.7'%3E%3Cpath d='M0 0H18M0 6H18M0 12H18M0 18H18M0 0V18M6 0V18M12 0V18M18 0V18'/%3E%3C/g%3E%3Crect width='18' height='18' fill='%232d3033' fill-opacity='0.28'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 18px 18px;
          scrollbar-gutter: stable;
          scrollbar-width: none;
        }
        .bridge-paw-scroll::-webkit-scrollbar { display: none; }
        .bridge-custom-scrollbar {
          position: absolute;
          left: 50%;
          bottom: 6px;
          width: calc(100% - 90px);
          height: 8px;
          background-color: #000000;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Cg fill='none' stroke='%23000000' stroke-width='0.9' stroke-opacity='0.35'%3E%3Cpath d='M0 0H18M0 6H18M0 12H18M0 18H18M0 0V18M6 0V18M12 0V18M18 0V18'/%3E%3C/g%3E%3Crect width='18' height='18' fill='%23000000'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-size: 18px 18px;
          border: 1px solid rgba(198, 164, 126, 0.72);
          border-radius: 5px;
          cursor: pointer;
          transform: translateX(-50%);
          z-index: 9;
          pointer-events: auto;
        }
        .bridge-custom-scrollbar-thumb {
          position: absolute;
          left: 2px;
          bottom: 1px;
          width: 24%;
          height: 4px;
          background: #c6a47e;
          border: 1px solid rgba(92, 69, 52, 0.85);
          border-radius: 3px;
          pointer-events: none;
          z-index: 10;
        }
        .bridge-paw-track { position: relative; width: 100%; height: calc(100% - 3px); }
        .bridge-pole {
          position: absolute;
          top: 0;
          bottom: 18%;
          width: 12px;
          border-radius: 8px;
          background: linear-gradient(180deg, #896a48 0%, #5a3d2a 38%, #3a271a 100%);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,0.08), 0 6px 18px rgba(20, 15, 10, 0.25);
          z-index: 0;
        }
        .bridge-group.left .bridge-pole-left,
        .bridge-group.right .bridge-pole-left { left: 3.5%; }
        .bridge-group.left .bridge-pole-right,
        .bridge-group.right .bridge-pole-right { right: 3.5%; }
        .bridge-cable {
          position: absolute;
          height: 3px;
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.82) 0%, rgba(44, 44, 44, 0.98) 20%, rgba(0, 0, 0, 1) 50%, rgba(44, 44, 44, 0.98) 80%, rgba(0, 0, 0, 0.82) 100%);
          box-shadow: none;
          z-index: 4;
        }
        .bridge-group.left .bridge-cable-top,
        .bridge-group.right .bridge-cable-top {
          top: 5%;
          left: 0;
          width: 100%;
          transform: perspective(500px) rotateX(55deg);
        }
        .bridge-group.left .bridge-cable-bottom,
        .bridge-group.right .bridge-cable-bottom {
          top: 35%;
          left: 0;
          width: 100%;
          transform: perspective(500px) rotateX(55deg);
        }
        .bridge-rungs {
          position: absolute;
          left: 0;
          top: 18%;
          width: 100%;
          height: 54%;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 0;
          align-items: center;
          padding: 0 9%;
        }
        .bridge-rung { position: relative; width: 100%; height: 100%; background: transparent; }
      `}</style>

      <div className="rope-bridge-scene" style={{ minHeight: 0, position: 'relative', width: '100%' }}>
        <div className="road-base-layer">
          <div className="road-base-fill" style={{ flex: '0 0 15%' }} />
          <div className="road-base-fill" style={{ flex: 1 }} />
          <div className="road-base-fill" style={{ flex: 1 }} />
          <div className="road-base-fill" style={{ flex: 1 }} />
          <div className="road-base-fill" style={{ flex: '0 0 15%' }} />
          <div className="road-direction-arrow" aria-hidden="true" />
          <div className="road-direction-arrow right" aria-hidden="true" />
          <div className="road-direction-arrow down-left" aria-hidden="true" />
          <div className="road-direction-arrow down" aria-hidden="true" />
        </div>

        <div className="pavement-layer">
          <div style={{ flex: '0 0 15%' }} />
          <div className="road-shoulder" />
          <div style={{ flex: 1 }} />
          <div style={{ flex: 1 }} />
          <div style={{ flex: 1 }} />
          <div className="road-drain" />
          <div style={{ flex: '0 0 15%' }} />
        </div>

        <div className="grass-layer">
          <div className="grass-left-side" />
          <div className="spacer-left" />
          <div className="spacer-road" />
          <div className="spacer-right" />
          <div className="grass-right-side" />
        </div>

        <div className="rope-bridge-overlay">
          {renderOffBridgePawPrints(offBridgeObservations, 'Off-bridge')}

          <div className="bridge-group left">
            <span className="bridge-label">Rope Bridge A</span>
            <div className="bridge-pole bridge-pole-left" />
            <div className="bridge-pole bridge-pole-right" />
            <div className="bridge-cable bridge-cable-top" />
            <div className="bridge-cable bridge-cable-bottom" />
            <div className="bridge-rungs">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={`left-rung-${index}`} className="bridge-rung" />
              ))}
            </div>
            {renderPawPrints(bridgeObservations.filter(isBridgeA), 'Bridge A')}
          </div>

          <div className="bridge-group right">
            <span className="bridge-label">Rope Bridge B</span>
            <div className="bridge-pole bridge-pole-left" />
            <div className="bridge-pole bridge-pole-right" />
            <div className="bridge-cable bridge-cable-top" />
            <div className="bridge-cable bridge-cable-bottom" />
            <div className="bridge-rungs">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={`right-rung-${index}`} className="bridge-rung" />
              ))}
            </div>
            {renderPawPrints(bridgeObservations.filter(isBridgeB), 'Bridge B')}
          </div>
        </div>
      </div>
    </>
  );
};

export default RopeBridgeScene;

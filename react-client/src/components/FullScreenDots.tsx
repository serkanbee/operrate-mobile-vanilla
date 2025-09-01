import React from 'react';
import '../theme/overlays.css';

type Props = {
  show: boolean;
  ariaLabel?: string;
};

const FullScreenDots: React.FC<Props> = ({ show, ariaLabel = 'Loading' }) => {
  if (!show) return null;
  return (
    <div className="dots-overlay" role="status" aria-label={ariaLabel}>
      <div className="dots-loader">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
};

export default FullScreenDots;

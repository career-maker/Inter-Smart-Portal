import React from 'react';

interface WishButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function WishButton({ onClick, disabled }: WishButtonProps) {
  return (
    <>
      <style>{`
        .wish-button {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 6px 12px 6px 8px;
          box-shadow: rgba(10, 37, 64, 0.35) 0px -1px 3px 0px inset;
          background-color: #e8e8e8;
          border-color: #ffe2e2;
          border-style: solid;
          border-width: 3px;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 900;
          color: rgb(134, 124, 124);
          font-family: monospace;
          transition:
            transform 400ms cubic-bezier(0.68, -0.55, 0.27, 2.5),
            border-color 400ms ease-in-out,
            background-color 400ms ease-in-out;
          word-spacing: -1px;
          outline: none;
        }

        .wish-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          filter: grayscale(100%);
        }

        @keyframes movingBorders {
          0% { border-color: #fce4e4; }
          50% { border-color: #ffd8d8; }
          90% { border-color: #fce4e4; }
        }

        .wish-button:not(:disabled):hover {
          background-color: #eee;
          transform: scale(1.05);
          animation: movingBorders 3s infinite;
        }

        .wish-button-svg-container {
          position: relative;
          width: 18px;
          height: 18px;
          margin-right: 6px;
        }

        .wish-button svg {
          fill: rgb(255, 110, 110);
          transition: opacity 100ms ease-in-out;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .wish-button .filled {
          opacity: 0;
        }

        @keyframes beatingHeart {
          0% { transform: scale(1); }
          15% { transform: scale(1.15); }
          30% { transform: scale(1); }
          45% { transform: scale(1.15); }
          60% { transform: scale(1); }
        }

        .wish-button:not(:disabled):hover .empty {
          opacity: 0;
        }

        .wish-button:not(:disabled):hover .filled {
          opacity: 1;
          animation: beatingHeart 1.2s infinite;
        }
      `}</style>
      <button 
        className="wish-button" 
        onClick={onClick} 
        disabled={disabled}
        title={disabled ? "Already wished" : "Send birthday wish"}
      >
        <div className="wish-button-svg-container">
          <svg
            className="empty"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path fill="none" d="M0 0H24V24H0z"></path>
            <path
              d="M16.5 3C19.538 3 22 5.5 22 9c0 7-7.5 11-10 12.5C9.5 20 2 16 2 9c0-3.5 2.5-6 5.5-6C9.36 3 11 4 12 5c1-1 2.64-2 4.5-2zm-3.566 15.604c.881-.556 1.676-1.109 2.42-1.701C18.335 14.533 20 11.943 20 9c0-2.36-1.537-4-3.5-4-1.076 0-2.24.57-3.086 1.414L12 7.828l-1.414-1.414C9.74 5.57 8.576 5 7.5 5 5.56 5 4 6.656 4 9c0 2.944 1.666 5.533 4.645 7.903.745.592 1.54 1.145 2.421 1.7.299.189.595.37.934.572.339-.202.635-.383.934-.571z"
            ></path>
          </svg>
          <svg
            className="filled"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 0H24V24H0z" fill="none"></path>
            <path
              d="M16.5 3C19.538 3 22 5.5 22 9c0 7-7.5 11-10 12.5C9.5 20 2 16 2 9c0-3.5 2.5-6 5.5-6C9.36 3 11 4 12 5c1-1 2.64-2 4.5-2z"
            ></path>
          </svg>
        </div>
        Wish
      </button>
    </>
  );
}

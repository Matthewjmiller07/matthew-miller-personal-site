import React from 'react';
import TorahScheduleApp from '../components/TorahScheduleApp';

const TorahSchedulePage: React.FC = () => {
  return (
    <div className="torah-schedule-page">
      <TorahScheduleApp />
      
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: #f5f7fa;
          color: #2c3e50;
        }
        
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default TorahSchedulePage;

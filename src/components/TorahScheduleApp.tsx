import React, { useState } from 'react';
import TorahSchedule from './TorahSchedule';

const TorahScheduleApp: React.FC = () => {
  const [formData, setFormData] = useState({
    childName: 'A',
    birthDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0],
    extraShabbatContent: false,
    includeHebrewDates: true,
  });

  const [showSchedule, setShowSchedule] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    // Small delay to show loading state
    setTimeout(() => {
      setShowSchedule(true);
      setIsGenerating(false);
    }, 500);
  };

  return (
    <div className="torah-schedule-app">
      <h1>Torah Study Schedule Generator</h1>
      
      <form onSubmit={handleSubmit} className="schedule-form">
        <div className="form-group">
          <label htmlFor="childName">Child's Name:</label>
          <input
            type="text"
            id="childName"
            name="childName"
            value={formData.childName}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="birthDate">Child's Birth Date:</label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={formData.birthDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="startDate">Start Date:</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="endDate">Target Completion Date (by age 10):</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="extraShabbatContent"
              checked={formData.extraShabbatContent}
              onChange={handleInputChange}
            />
            Include extra Shabbat content
          </label>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="includeHebrewDates"
              checked={formData.includeHebrewDates}
              onChange={handleInputChange}
            />
            Show Hebrew dates
          </label>
        </div>

        <button type="submit" disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Schedule'}
        </button>
      </form>

      {showSchedule && (
        <div className="schedule-container">
          <TorahSchedule
            childName={formData.childName}
            birthDate={new Date(formData.birthDate)}
            startDate={new Date(formData.startDate)}
            endDate={new Date(formData.endDate)}
            extraShabbatContent={formData.extraShabbatContent}
            includeHebrewDates={formData.includeHebrewDates}
          />
        </div>
      )}

      <style jsx>{`
        .torah-schedule-app {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        
        h1 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        
        .schedule-form {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #34495e;
        }
        
        .form-group input[type="text"],
        .form-group input[type="date"] {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        
        .checkbox label {
          display: flex;
          align-items: center;
          font-weight: normal;
        }
        
        .checkbox input {
          margin-right: 10px;
        }
        
        button {
          background-color: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: background-color 0.3s;
        }
        
        button:hover {
          background-color: #2980b9;
        }
        
        button:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
        }
        
        .schedule-container {
          margin-top: 30px;
        }
      `}</style>
    </div>
  );
};

export default TorahScheduleApp;

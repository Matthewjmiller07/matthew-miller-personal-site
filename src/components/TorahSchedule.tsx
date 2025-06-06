import React, { useState } from 'react';
import { generateTorahSchedule, ScheduleEntry, ScheduleOptions } from '../utils/torahSchedule';

interface Props {
  childName: string;
  birthDate: Date;
  startDate: Date;
  endDate: Date;
  extraShabbatContent?: boolean;
  includeHebrewDates?: boolean;
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const TorahSchedule: React.FC<Props> = ({
  childName,
  birthDate,
  startDate,
  endDate,
  extraShabbatContent = false,
  includeHebrewDates = true,
}) => {
  const [showVerseContent, setShowVerseContent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load schedule when component mounts
  React.useEffect(() => {
    const loadSchedule = async () => {
      try {
        setIsLoading(true);
        const generatedSchedule = await generateTorahSchedule({
          childName,
          birthDate,
          startDate,
          endDate,
          extraShabbatContent,
          includeHebrewDates,
          showVerseContent,
        });
        setSchedule(generatedSchedule);
        setError(null);
      } catch (err) {
        console.error('Error generating schedule:', err);
        setError('Failed to generate schedule. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSchedule();
  }, [childName, birthDate, startDate, endDate, extraShabbatContent, includeHebrewDates, showVerseContent]);

  if (isLoading) {
    return <div>Loading schedule...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="torah-schedule">
      <div className="schedule-header">
        <h2>{childName}'s Torah Study Schedule</h2>
        <div className="controls">
          <label>
            <input
              type="checkbox"
              checked={showVerseContent}
              onChange={(e) => setShowVerseContent(e.target.checked)}
            />
            Show Verse Content
          </label>
        </div>
      </div>

      <div className="schedule-grid">
        {schedule.map((entry, index) => (
          <div key={index} className={`schedule-entry ${entry.isShabbat ? 'shabbat' : ''}`}>
            <div className="entry-date">
              <div className="hebrew-date">{entry.hebrewDate}</div>
              <div className="gregorian-date">
                {new Date(entry.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            
            <div className="entry-content">
              {entry.bible.map((verse, verseIndex) => (
                <div key={verseIndex} className="verse">
                  <div className="verse-ref">{verse.ref}</div>
                  <div className="verse-text">{verse.text}</div>
                  {showVerseContent && verse.content && (
                    <div className="verse-content">{verse.content}</div>
                  )}
                </div>
              ))}
            </div>
            
            {entry.ageGroup && (
              <div className="age-group">
                <strong>Age Group:</strong> {entry.ageGroup}
              </div>
            )}
            
            {entry.studyFocus && entry.studyFocus.length > 0 && (
              <div className="study-focus">
                <strong>Focus:</strong> {entry.studyFocus.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TorahSchedule;
